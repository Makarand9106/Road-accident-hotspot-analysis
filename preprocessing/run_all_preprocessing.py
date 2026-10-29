"""
Master Preprocessing Orchestrator Script.
Runs all preprocessing stages in sequence:
  1. Download raw data (optional)
  2. Clean data (accidents, vehicles, casualties)
  3. Feature engineering
  4. Generate EDA visualizations
  5. Copy results to preprocessing/results_of_preprocessing/
  6. Print consolidated summary report

Usage:
  python preprocessing/run_all_preprocessing.py [--skip-download]
"""
import argparse
import json
import shutil
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(REPO_ROOT))


def print_header(msg):
    print('\n' + '='*70)
    print(f'  {msg}')
    print('='*70)


def run_preprocessing(skip_download=False):
    start = time.time()
    results_dir = REPO_ROOT / 'preprocessing' / 'results_of_preprocessing'
    results_dir.mkdir(parents=True, exist_ok=True)

    # ---- Step 1: Download raw data ----
    if not skip_download:
        print_header('STEP 1/5 — Downloading Raw STATS19 Data')
        from python.ingestion.download_data import main as download_main
        download_main()
    else:
        print_header('STEP 1/5 — Skipping Download (--skip-download)')

    # ---- Step 2: Run full preprocessing pipeline ----
    print_header('STEP 2/5 — Cleaning & Feature Engineering')
    from python.preprocessing.run_pipeline import run_preprocessing_pipeline
    success = run_preprocessing_pipeline()
    if not success:
        print('[ERROR] Preprocessing pipeline failed. Exiting.')
        sys.exit(1)

    # ---- Step 3: Generate EDA visualizations ----
    print_header('STEP 3/5 — Generating EDA Visualizations (20 figures)')
    try:
        import python.config as config
        from python.analysis.run_eda import run_all as run_eda
        run_eda()
    except Exception as e:
        print(f'[WARNING] EDA visualization failed: {e}')

    # ---- Step 4: Copy results to results_of_preprocessing/ ----
    print_header('STEP 4/5 — Copying Results to preprocessing/results_of_preprocessing/')
    import python.config as config
    processed_dir = config.PROCESSED_DATA_DIR
    for fname in ['accidents_clean.csv', 'vehicles_clean.csv', 'casualties_clean.csv', 'quality_report.json']:
        src = processed_dir / fname
        dst = results_dir / fname
        if src.exists():
            shutil.copy2(src, dst)
            print(f'  Copied: {fname}')
        else:
            print(f'  [MISSING] {fname} not found in data/processed/')

    # ---- Step 5: Print consolidated quality report ----
    print_header('STEP 5/5 — Consolidated Quality Report')
    qr_path = processed_dir / 'quality_report.json'
    if qr_path.exists():
        with open(qr_path) as f:
            qr = json.load(f)
        print(f"  Generated at: {qr.get('generated_at', 'N/A')}")
        rc = qr.get('row_counts', {})
        acc_rc = rc.get('accidents', {})
        veh_rc = rc.get('vehicles', {})
        cas_rc = rc.get('casualties', {})
        print(f"\n  ACCIDENTS:")
        print(f"    Raw rows:         {acc_rc.get('raw', 'N/A'):,}")
        print(f"    Cleaned rows:     {acc_rc.get('cleaned', 'N/A'):,}")
        print(f"    Duplicates drop:  {acc_rc.get('duplicates_dropped', 0):,}")
        print(f"    Valid coords:     {acc_rc.get('valid_coordinates', 'N/A'):,}")
        print(f"\n  VEHICLES:")
        print(f"    Raw rows:         {veh_rc.get('raw', 'N/A'):,}")
        print(f"    Cleaned rows:     {veh_rc.get('cleaned', 'N/A'):,}")
        print(f"    Orphans removed:  {veh_rc.get('orphans_removed', 0):,}")
        print(f"\n  CASUALTIES:")
        print(f"    Raw rows:         {cas_rc.get('raw', 'N/A'):,}")
        print(f"    Cleaned rows:     {cas_rc.get('cleaned', 'N/A'):,}")
        print(f"    Orphans removed:  {cas_rc.get('orphans_removed', 0):,}")
        td = qr.get('target_distribution', {})
        print(f"\n  TARGET (is_severe):")
        print(f"    Fatal/Serious:    {td.get('is_severe_1_fatal_or_serious', 0):,}")
        print(f"    Slight:           {td.get('is_severe_0_slight', 0):,}")
        print(f"    Severe rate:      {td.get('severe_percentage', 0)}%")
    else:
        print('  [WARNING] quality_report.json not found. Run preprocessing pipeline first.')

    elapsed = round(time.time() - start, 1)
    print_header(f'ALL PREPROCESSING COMPLETE in {elapsed}s')
    print(f'  Results at: {results_dir}')
    print(f'  Figures at: {REPO_ROOT}/docs/figures/eda/')
    print()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run full preprocessing pipeline')
    parser.add_argument('--skip-download', action='store_true', help='Skip raw data download')
    args = parser.parse_args()
    run_preprocessing(skip_download=args.skip_download)
