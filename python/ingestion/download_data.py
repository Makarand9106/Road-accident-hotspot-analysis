"""
Automated Data Downloader for UK DfT STATS19 Road Casualty Statistics.
Downloads the official Collision, Vehicle, and Casualty CSV datasets and the Data Guide Excel file.
Generates SHA-256 checksums and a manifest file upon successful download.
"""

import hashlib
import json
import os
import sys
import time
from pathlib import Path
import requests

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config

BASE_DFT_URL = "https://data.dft.gov.uk/road-accidents-safety-data"
GUIDE_URL = "https://assets.publishing.service.gov.uk/media/6ab2a71d997a4b2950cced58/dft-road-casualty-statistics-road-safety-open-dataset-data-guide-2025.xlsx"
GUIDE_URL_FALLBACK = "https://assets.publishing.service.gov.uk/media/691c6440e39a085bda43eed6/dft-road-casualty-statistics-road-safety-open-dataset-data-guide-2024.xlsx"

DOWNLOAD_TARGETS = [
    {
        "name": "collisions_last_5_years.csv",
        "url": f"{BASE_DFT_URL}/dft-road-casualty-statistics-collision-last-5-years.csv",
        "dest_dir": config.RAW_DATA_DIR,
        "type": "collision"
    },
    {
        "name": "casualties_last_5_years.csv",
        "url": f"{BASE_DFT_URL}/dft-road-casualty-statistics-casualty-last-5-years.csv",
        "dest_dir": config.RAW_DATA_DIR,
        "type": "casualty"
    },
    {
        "name": "vehicles_last_5_years.csv",
        "url": f"{BASE_DFT_URL}/dft-road-casualty-statistics-vehicle-last-5-years.csv",
        "dest_dir": config.RAW_DATA_DIR,
        "type": "vehicle"
    },
    {
        "name": "dft_road_safety_data_guide.xlsx",
        "url": GUIDE_URL,
        "fallback_url": GUIDE_URL_FALLBACK,
        "dest_dir": config.REFERENCE_DATA_DIR,
        "type": "guide"
    }
]


def calculate_sha256(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def count_lines(file_path: Path) -> int:
    """Fast line count for CSV files."""
    if not str(file_path).endswith(".csv"):
        return -1
    lines = 0
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            lines += chunk.count(b"\n")
    return lines


def download_file(url: str, dest_path: Path, fallback_url: str = None) -> bool:
    """Download file with stream progress indicator and skip-if-exists."""
    if dest_path.exists() and dest_path.stat().st_size > 0:
        print(f"  [SKIP] Already exists: {dest_path.name} ({dest_path.stat().st_size:,} bytes)")
        return True

    temp_path = dest_path.with_suffix(".tmp")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    urls_to_try = [url]
    if fallback_url:
        urls_to_try.append(fallback_url)

    for current_url in urls_to_try:
        try:
            print(f"  [DOWNLOADING] {dest_path.name} from {current_url}...")
            start_time = time.time()
            with requests.get(current_url, headers=headers, stream=True, timeout=60) as response:
                response.raise_for_status()
                total_size = int(response.headers.get("content-length", 0))
                downloaded = 0
                last_reported = 0

                with open(temp_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_size > 0 and downloaded - last_reported > 5 * 1024 * 1024:
                                percent = (downloaded / total_size) * 100
                                elapsed = time.time() - start_time
                                speed = (downloaded / 1024 / 1024) / max(elapsed, 0.1)
                                print(f"    -> {percent:.1f}% ({downloaded / 1024 / 1024:.1f} MB / {total_size / 1024 / 1024:.1f} MB) @ {speed:.2f} MB/s", end="\r")
                                last_reported = downloaded

                print(f"    -> 100.0% ({downloaded / 1024 / 1024:.1f} MB) in {time.time() - start_time:.1f}s")
                temp_path.rename(dest_path)
                return True

        except Exception as e:
            print(f"  [ERROR] Failed from {current_url}: {e}")
            if temp_path.exists():
                temp_path.unlink()

    return False


def run_download_pipeline():
    """Execute download pipeline and update manifest."""
    print("=" * 70)
    print("UK DfT STATS19 Road Safety Data - Automated Ingestion Pipeline")
    print("=" * 70)

    config.RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    config.REFERENCE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    manifest_entries = []
    failed_downloads = []

    for item in DOWNLOAD_TARGETS:
        dest_path = item["dest_dir"] / item["name"]
        success = download_file(item["url"], dest_path, item.get("fallback_url"))
        if success and dest_path.exists():
            size_bytes = dest_path.stat().st_size
            sha256 = calculate_sha256(dest_path)
            total_lines = count_lines(dest_path)
            row_count = total_lines - 1 if total_lines > 0 else total_lines  # exclude header

            manifest_entries.append({
                "filename": item["name"],
                "type": item["type"],
                "relative_path": str(dest_path.relative_to(config.BASE_DIR)),
                "size_bytes": size_bytes,
                "size_formatted": f"{size_bytes / (1024 * 1024):.2f} MB",
                "sha256": sha256,
                "row_count": row_count if row_count >= 0 else None,
                "source_url": item["url"]
            })
        else:
            failed_downloads.append(item)

    # Write MANIFEST.json in data/raw
    manifest_path = config.RAW_DATA_DIR / "MANIFEST.json"
    manifest_data = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "UK Department for Transport (DfT) Road Safety Statistics",
        "files": manifest_entries
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print("\n" + "=" * 70)
    print("DOWNLOAD MANIFEST SUMMARY")
    print("=" * 70)
    for entry in manifest_entries:
        rows_str = f", Rows: {entry['row_count']:,}" if entry["row_count"] is not None else ""
        print(f"- {entry['filename']}: {entry['size_formatted']}{rows_str}")
        print(f"  SHA-256: {entry['sha256']}")
    print(f"\nManifest saved to: {manifest_path}")

    if failed_downloads:
        print("\n[WARNING] Some downloads failed. See manual download instructions in docs/dataset_validation.md.")
        return False

    print("\n[SUCCESS] All STATS19 raw files acquired successfully.")
    return True


if __name__ == "__main__":
    success = run_download_pipeline()
    if not success:
        sys.exit(1)
