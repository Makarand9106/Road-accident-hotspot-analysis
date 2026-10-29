"""
Comprehensive EDA Visualization Runner for STATS19 Road Safety Project.
Generates 20+ figures: bar charts, line trends, heatmaps, pie charts, box plots,
correlation matrices, scatter plots, dual-axis charts, severity-rate charts with CI.
All outputs saved to docs/figures/eda/ for Power BI import.
"""

import json
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

# Add repo root to sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(REPO_ROOT))

import python.config as config
from python.visualization.eda_plots import (
    plot_bar, plot_line_trend, plot_severity_rate_with_ci,
    plot_dual_axis_count_and_rate, plot_weekday_hour_heatmap,
    save_figure
)

OUT_DIR = REPO_ROOT / 'docs' / 'figures' / 'eda'
OUT_DIR.mkdir(parents=True, exist_ok=True)

PALETTE = ['#0072B2', '#D55E00', '#009E73', '#56B4E9', '#CC79A7', '#E69F00', '#F0E442', '#555555']
SEV_COLORS = {'Fatal': '#EF4444', 'Serious': '#F59E0B', 'Slight': '#22D3EE'}


def load_clean_data():
    acc = pd.read_csv(config.PROCESSED_DATA_DIR / 'accidents_clean.csv', low_memory=False)
    veh = pd.read_csv(config.PROCESSED_DATA_DIR / 'vehicles_clean.csv', low_memory=False)
    cas = pd.read_csv(config.PROCESSED_DATA_DIR / 'casualties_clean.csv', low_memory=False)
    return acc, veh, cas


def fig1_yearly_trend(acc):
    print('  [Fig 01] Yearly collision trend')
    df = acc.groupby('accident_year').size().reset_index(name='count')
    plot_line_trend(df, 'accident_year', 'count',
                   '5-Year Collision Volume Trend (2021-2025)',
                   'Year', 'Number of Collisions',
                   output_path=OUT_DIR/'fig01_yearly_trend.png')


def fig2_severity_distribution(acc):
    print('  [Fig 02] Severity distribution bar')
    sev_map = {1: 'Fatal', 2: 'Serious', 3: 'Slight'}
    acc2 = acc.copy()
    acc2['severity_label'] = acc2['accident_severity'].map(sev_map)
    df = acc2['severity_label'].value_counts().reset_index()
    df.columns = ['severity_label', 'count']
    df = df[df['severity_label'].isin(['Fatal','Serious','Slight'])]
    df['color'] = df['severity_label'].map(SEV_COLORS)
    fig, ax = plt.subplots(figsize=(8,5))
    bars = ax.bar(df['severity_label'], df['count'],
                  color=df['color'].tolist(), edgecolor='white', width=0.55)
    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x()+bar.get_width()/2, h+800, f'{h:,.0f}', ha='center', fontsize=10, fontweight='bold')
    ax.set_title('Accident Severity Distribution', fontsize=13, fontweight='bold')
    ax.set_xlabel('Severity Level', fontsize=11)
    ax.set_ylabel('Number of Collisions', fontsize=11)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    save_figure(fig, OUT_DIR/'fig02_severity_distribution.png')


def fig3_severity_pie(acc):
    print('  [Fig 03] Severity pie / donut chart')
    sev_map = {1: 'Fatal', 2: 'Serious', 3: 'Slight'}
    acc2 = acc.copy()
    acc2['severity_label'] = acc2['accident_severity'].map(sev_map)
    counts = acc2['severity_label'].value_counts()
    labels = counts.index.tolist()
    values = counts.values.tolist()
    colors = [SEV_COLORS.get(l, '#888') for l in labels]
    fig, ax = plt.subplots(figsize=(7,7))
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, autopct='%1.1f%%',
        colors=colors, startangle=140,
        wedgeprops={'width': 0.55, 'edgecolor': 'white', 'linewidth': 2})
    for at in autotexts:
        at.set_fontsize(11)
        at.set_fontweight('bold')
    ax.set_title('Severity Composition — 2021-2025', fontsize=13, fontweight='bold')
    save_figure(fig, OUT_DIR/'fig03_severity_pie.png')


def fig4_hourly_distribution(acc):
    print('  [Fig 04] Hourly accident distribution')
    if 'hour' not in acc.columns:
        if 'time' in acc.columns:
            acc = acc.copy()
            acc['hour'] = pd.to_datetime(acc['time'], format='%H:%M', errors='coerce').dt.hour
        else:
            print('    Skipped: no hour/time column')
            return
    df = acc.dropna(subset=['hour']).groupby('hour').size().reset_index(name='count')
    fig, ax = plt.subplots(figsize=(12,5))
    ax.bar(df['hour'], df['count'], color=PALETTE[0], edgecolor='white', width=0.8)
    ax.set_title('Accident Frequency by Hour of Day', fontsize=13, fontweight='bold')
    ax.set_xlabel('Hour of Day (0–23)', fontsize=11)
    ax.set_ylabel('Collision Count', fontsize=11)
    ax.set_xticks(range(0,24))
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    save_figure(fig, OUT_DIR/'fig04_hourly_distribution.png')


def fig5_day_of_week(acc):
    print('  [Fig 05] Day of week distribution')
    day_order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    if 'day_of_week_name' not in acc.columns:
        print('    Skipped: no day_of_week_name column')
        return
    df = acc.groupby('day_of_week_name').size().reset_index(name='count')
    df['day_of_week_name'] = pd.Categorical(df['day_of_week_name'], categories=day_order, ordered=True)
    df = df.sort_values('day_of_week_name')
    plot_bar(df, 'day_of_week_name', 'count',
             'Accidents by Day of Week', 'Day', 'Number of Collisions',
             output_path=OUT_DIR/'fig05_day_of_week.png',
             color=PALETTE[3])


def fig6_monthly_trend(acc):
    print('  [Fig 06] Monthly trend heatmap')
    if 'month' not in acc.columns:
        print('    Skipped: no month column')
        return
    if 'accident_year' not in acc.columns:
        print('    Skipped: no accident_year column')
        return
    pivot = acc.groupby(['accident_year','month']).size().unstack(fill_value=0)
    fig, ax = plt.subplots(figsize=(12,5))
    sns.heatmap(pivot, cmap='YlOrRd', linewidths=0.5, linecolor='#EAEAEA',
                cbar_kws={'label': 'Collision Count'}, ax=ax, annot=True, fmt=',d', annot_kws={'size': 8})
    ax.set_title('Monthly Collision Count by Year (Heatmap)', fontsize=13, fontweight='bold')
    ax.set_xlabel('Month', fontsize=11)
    ax.set_ylabel('Year', fontsize=11)
    save_figure(fig, OUT_DIR/'fig06_monthly_heatmap.png')


def fig7_weather_severity(acc):
    print('  [Fig 07] Weather condition vs severity')
    wcol = 'weather_condition_name' if 'weather_condition_name' in acc.columns else None
    if wcol is None:
        print('    Skipped: no weather_condition_name column')
        return
    df = acc.dropna(subset=[wcol]).groupby(wcol).agg(
        total=('accident_severity', 'count'),
        severe=('is_severe', 'sum')
    ).reset_index()
    df = df[df['total'] >= 100].sort_values('severe', ascending=True)
    if df.empty:
        return
    plot_severity_rate_with_ci(df, wcol, 'severe', 'total',
                               'Severe Collision Rate by Weather Condition (95% CI)',
                               'Severe Collision Rate (%)',
                               output_path=OUT_DIR/'fig07_weather_severity.png',
                               figsize=(11,6))


def fig8_road_surface_severity(acc):
    print('  [Fig 08] Road surface vs severity')
    rcol = 'road_surface_condition_name' if 'road_surface_condition_name' in acc.columns else None
    if rcol is None:
        print('    Skipped: no road_surface_condition_name column')
        return
    df = acc.dropna(subset=[rcol]).groupby(rcol).agg(
        total=('accident_severity', 'count'),
        severe=('is_severe', 'sum')
    ).reset_index().sort_values('severe', ascending=True)
    plot_severity_rate_with_ci(df, rcol, 'severe', 'total',
                               'Severe Collision Rate by Road Surface Condition (95% CI)',
                               'Severe Collision Rate (%)',
                               output_path=OUT_DIR/'fig08_road_surface_severity.png',
                               figsize=(10,5))


def fig9_lighting_severity(acc):
    print('  [Fig 09] Light condition vs severity')
    lcol = 'light_condition_name' if 'light_condition_name' in acc.columns else None
    if lcol is None:
        print('    Skipped: no light_condition_name column')
        return
    df = acc.dropna(subset=[lcol]).groupby(lcol).agg(
        total=('accident_severity', 'count'),
        severe=('is_severe', 'sum')
    ).reset_index().sort_values('severe', ascending=True)
    plot_severity_rate_with_ci(df, lcol, 'severe', 'total',
                               'Severe Collision Rate by Light Condition (95% CI)',
                               'Severe Collision Rate (%)',
                               output_path=OUT_DIR/'fig09_lighting_severity.png',
                               figsize=(10,5))


def fig10_road_type_severity(acc):
    print('  [Fig 10] Road type vs severity')
    rtcol = 'road_type_name' if 'road_type_name' in acc.columns else None
    if rtcol is None:
        print('    Skipped: no road_type_name column')
        return
    df = acc.dropna(subset=[rtcol]).groupby(rtcol).agg(
        total=('accident_severity', 'count'),
        severe=('is_severe', 'sum')
    ).reset_index().sort_values('severe', ascending=True)
    plot_severity_rate_with_ci(df, rtcol, 'severe', 'total',
                               'Severe Collision Rate by Road Type (95% CI)',
                               'Severe Collision Rate (%)',
                               output_path=OUT_DIR/'fig10_road_type_severity.png')


def fig11_speed_limit_dual(acc):
    print('  [Fig 11] Speed limit dual-axis chart')
    scol = 'speed_limit'
    if scol not in acc.columns:
        print('    Skipped: no speed_limit column')
        return
    df = acc.dropna(subset=[scol]).copy()
    df['speed_limit'] = df['speed_limit'].astype(int)
    df = df.groupby('speed_limit').agg(
        total=('accident_severity', 'count'),
        severe=('is_severe', 'sum')
    ).reset_index()
    df['severe_pct'] = (df['severe'] / df['total'] * 100).round(1)
    df = df[df['total'] >= 50]
    plot_dual_axis_count_and_rate(df, 'speed_limit', 'total', 'severe_pct',
                                  'Collisions and Severe Rate by Speed Limit',
                                  'Speed Limit (mph)',
                                  output_path=OUT_DIR/'fig11_speed_limit_dual.png')


def fig12_day_hour_heatmap(acc):
    print('  [Fig 12] Day x Hour heatmap')
    if 'day_of_week_name' not in acc.columns:
        print('    Skipped: no day_of_week_name column')
        return
    if 'hour' not in acc.columns:
        if 'time' in acc.columns:
            acc = acc.copy()
            acc['hour'] = pd.to_datetime(acc['time'], format='%H:%M', errors='coerce').dt.hour
        else:
            print('    Skipped: no hour/time column')
            return
    df = acc.dropna(subset=['day_of_week_name','hour']).groupby(['day_of_week_name','hour']).size().reset_index(name='count')
    plot_weekday_hour_heatmap(df, 'day_of_week_name', 'hour', 'count',
                              'Collision Frequency: Day of Week × Hour of Day',
                              output_path=OUT_DIR/'fig12_day_hour_heatmap.png')


def fig13_vehicle_type_bar(veh):
    print('  [Fig 13] Vehicle type distribution')
    vcol = 'vehicle_type_name' if 'vehicle_type_name' in veh.columns else 'vehicle_type'
    df = veh.dropna(subset=[vcol]).groupby(vcol).size().reset_index(name='count')
    df = df.sort_values('count', ascending=False).head(12)
    plot_bar(df, vcol, 'count',
             'Top 12 Vehicle Types Involved in Collisions',
             'Vehicle Type', 'Count',
             output_path=OUT_DIR/'fig13_vehicle_type_bar.png',
             rotate_x=35, color=PALETTE[2], horizontal=False)


def fig14_casualty_class(cas):
    print('  [Fig 14] Casualty class distribution')
    ccol = 'casualty_class' if 'casualty_class' in cas.columns else None
    if ccol is None:
        print('    Skipped: no casualty_class column')
        return
    class_map = {1: 'Driver/Rider', 2: 'Passenger', 3: 'Pedestrian'}
    cas2 = cas.copy()
    cas2['class_label'] = cas2[ccol].map(class_map)
    df = cas2['class_label'].dropna().value_counts().reset_index()
    df.columns = ['class_label', 'count']
    fig, ax = plt.subplots(figsize=(7,5))
    ax.bar(df['class_label'], df['count'], color=[PALETTE[0], PALETTE[1], PALETTE[2]], edgecolor='white', width=0.55)
    ax.set_title('Casualties by Class', fontsize=13, fontweight='bold')
    ax.set_xlabel('Casualty Class', fontsize=11)
    ax.set_ylabel('Count', fontsize=11)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    for i, (_, row) in enumerate(df.iterrows()):
        ax.text(i, row['count']+500, f"{row['count']:,}", ha='center', fontsize=10, fontweight='bold')
    save_figure(fig, OUT_DIR/'fig14_casualty_class.png')


def fig15_urban_rural_severity(acc):
    print('  [Fig 15] Urban vs Rural severity comparison')
    ucol = 'urban_rural_name' if 'urban_rural_name' in acc.columns else None
    if ucol is None:
        print('    Skipped: no urban_rural_name column')
        return
    df = acc.dropna(subset=[ucol]).groupby(ucol).agg(
        total=('accident_severity','count'),
        severe=('is_severe','sum')
    ).reset_index()
    df['severe_pct'] = (df['severe']/df['total']*100).round(2)
    fig, axes = plt.subplots(1,2,figsize=(12,5))
    axes[0].bar(df[ucol], df['total'], color=[PALETTE[0],PALETTE[3]], edgecolor='white', width=0.55)
    axes[0].set_title('Total Collisions: Urban vs Rural', fontsize=12, fontweight='bold')
    axes[0].set_ylabel('Count', fontsize=11)
    for i, row in df.iterrows():
        axes[0].text(i, row['total']+500, f"{row['total']:,}", ha='center', fontsize=10, fontweight='bold')
    axes[1].bar(df[ucol], df['severe_pct'], color=[PALETTE[1],PALETTE[4]], edgecolor='white', width=0.55)
    axes[1].set_title('Severe Collision Rate: Urban vs Rural', fontsize=12, fontweight='bold')
    axes[1].set_ylabel('Severe Rate (%)', fontsize=11)
    for i, row in df.iterrows():
        axes[1].text(i, row['severe_pct']+0.3, f"{row['severe_pct']:.1f}%", ha='center', fontsize=10, fontweight='bold')
    for ax in axes:
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
    plt.tight_layout()
    save_figure(fig, OUT_DIR/'fig15_urban_rural_severity.png')


def fig16_time_period_severity(acc):
    print('  [Fig 16] Time period severity stacked bar')
    if 'time_period' not in acc.columns:
        print('    Skipped: no time_period column')
        return
    period_order = ['Morning Peak','Daytime','Evening Peak','Evening','Night']
    df = acc.dropna(subset=['time_period']).copy()
    sev_map = {1:'Fatal', 2:'Serious', 3:'Slight'}
    df['severity_label'] = df['accident_severity'].map(sev_map)
    pivot = df.groupby(['time_period','severity_label']).size().unstack(fill_value=0)
    pivot = pivot.reindex([p for p in period_order if p in pivot.index])
    fig, ax = plt.subplots(figsize=(11,6))
    colors = [SEV_COLORS['Fatal'], SEV_COLORS['Serious'], SEV_COLORS['Slight']]
    pivot.plot(kind='bar', stacked=True, ax=ax, color=colors, edgecolor='white', width=0.6)
    ax.set_title('Collision Counts by Time Period and Severity (Stacked)', fontsize=13, fontweight='bold')
    ax.set_xlabel('Time Period', fontsize=11)
    ax.set_ylabel('Collision Count', fontsize=11)
    ax.tick_params(axis='x', rotation=25)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.legend(title='Severity', bbox_to_anchor=(1.01,1), loc='upper left', fontsize=9)
    plt.tight_layout()
    save_figure(fig, OUT_DIR/'fig16_time_period_stacked.png')


def fig17_junction_severity(acc):
    print('  [Fig 17] Junction type vs severity')
    jcol = 'junction_detail_name' if 'junction_detail_name' in acc.columns else None
    if jcol is None:
        print('    Skipped: no junction_detail_name column')
        return
    df = acc.dropna(subset=[jcol]).groupby(jcol).agg(
        total=('accident_severity','count'), severe=('is_severe','sum')
    ).reset_index()
    df = df[df['total']>=100].sort_values('severe', ascending=True)
    plot_severity_rate_with_ci(df, jcol, 'severe', 'total',
                               'Severe Collision Rate by Junction Type (95% CI)',
                               'Severe Collision Rate (%)',
                               output_path=OUT_DIR/'fig17_junction_severity.png',
                               figsize=(11,6))


def fig18_yearly_severity_stacked(acc):
    print('  [Fig 18] Yearly severity stacked bar')
    sev_map = {1:'Fatal', 2:'Serious', 3:'Slight'}
    df = acc.copy()
    df['severity_label'] = df['accident_severity'].map(sev_map)
    pivot = df.groupby(['accident_year','severity_label']).size().unstack(fill_value=0)
    fig, ax = plt.subplots(figsize=(10,6))
    colors = [SEV_COLORS['Fatal'], SEV_COLORS['Serious'], SEV_COLORS['Slight']]
    pivot.plot(kind='bar', stacked=True, ax=ax, color=colors, edgecolor='white', width=0.6)
    ax.set_title('Annual Collision Counts by Severity (Stacked)', fontsize=13, fontweight='bold')
    ax.set_xlabel('Year', fontsize=11)
    ax.set_ylabel('Collision Count', fontsize=11)
    ax.tick_params(axis='x', rotation=0)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.legend(title='Severity', bbox_to_anchor=(1.01,1), loc='upper left', fontsize=9)
    plt.tight_layout()
    save_figure(fig, OUT_DIR/'fig18_yearly_severity_stacked.png')


def fig19_numeric_correlation(acc):
    print('  [Fig 19] Numeric correlation heatmap')
    num_cols = [c for c in [
        'accident_severity','number_of_vehicles','number_of_casualties',
        'speed_limit','hour','month','is_severe','is_weekend',
        'involves_motorcycle','involves_hgv','involves_cyclist'
    ] if c in acc.columns]
    if len(num_cols) < 3:
        print('    Skipped: too few numeric columns')
        return
    corr = acc[num_cols].dropna().corr()
    fig, ax = plt.subplots(figsize=(10,8))
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(corr, mask=mask, cmap='coolwarm', center=0, annot=True, fmt='.2f',
                linewidths=0.5, linecolor='#EAEAEA', ax=ax, annot_kws={'size':9},
                vmin=-1, vmax=1, cbar_kws={'shrink': 0.8})
    ax.set_title('Feature Correlation Heatmap (Lower Triangle)', fontsize=13, fontweight='bold')
    plt.tight_layout()
    save_figure(fig, OUT_DIR/'fig19_correlation_heatmap.png')


def fig20_vehicles_per_accident(acc):
    print('  [Fig 20] Vehicles per accident distribution')
    if 'number_of_vehicles' not in acc.columns:
        print('    Skipped')
        return
    df = acc['number_of_vehicles'].dropna().value_counts().sort_index().head(10).reset_index()
    df.columns = ['vehicles', 'count']
    plot_bar(df, 'vehicles', 'count',
             'Distribution of Number of Vehicles Involved',
             'Number of Vehicles', 'Number of Collisions',
             output_path=OUT_DIR/'fig20_vehicles_per_accident.png',
             color=PALETTE[5])


def run_all():
    print('='*70)
    print('STATS19 Comprehensive EDA Visualization Runner')
    print(f'Output directory: {OUT_DIR}')
    print('='*70)
    start = time.time()

    # Check if processed data exists
    acc_path = config.PROCESSED_DATA_DIR / 'accidents_clean.csv'
    if not acc_path.exists():
        print('[WARNING] Processed data not found. Run preprocessing pipeline first:')
        print('  python python/preprocessing/run_pipeline.py')
        print('Exiting.')
        return

    print('\n[LOADING] Reading clean datasets...')
    acc, veh, cas = load_clean_data()
    print(f'  Accidents: {len(acc):,} rows | Vehicles: {len(veh):,} rows | Casualties: {len(cas):,} rows')

    print('\n[GENERATING] Creating EDA figures...')
    figs = [
        (fig1_yearly_trend, (acc,)),
        (fig2_severity_distribution, (acc,)),
        (fig3_severity_pie, (acc,)),
        (fig4_hourly_distribution, (acc,)),
        (fig5_day_of_week, (acc,)),
        (fig6_monthly_trend, (acc,)),
        (fig7_weather_severity, (acc,)),
        (fig8_road_surface_severity, (acc,)),
        (fig9_lighting_severity, (acc,)),
        (fig10_road_type_severity, (acc,)),
        (fig11_speed_limit_dual, (acc,)),
        (fig12_day_hour_heatmap, (acc,)),
        (fig13_vehicle_type_bar, (veh,)),
        (fig14_casualty_class, (cas,)),
        (fig15_urban_rural_severity, (acc,)),
        (fig16_time_period_severity, (acc,)),
        (fig17_junction_severity, (acc,)),
        (fig18_yearly_severity_stacked, (acc,)),
        (fig19_numeric_correlation, (acc,)),
        (fig20_vehicles_per_accident, (acc,)),
    ]

    success = []
    for fn, args in figs:
        try:
            fn(*args)
            success.append(fn.__name__)
        except Exception as e:
            print(f'    [ERROR] {fn.__name__}: {e}')

    elapsed = round(time.time()-start, 2)
    print(f'\n[DONE] {len(success)}/{len(figs)} figures generated in {elapsed}s')
    print(f'Figures saved to: {OUT_DIR}')
    print('='*70)


if __name__ == '__main__':
    run_all()
