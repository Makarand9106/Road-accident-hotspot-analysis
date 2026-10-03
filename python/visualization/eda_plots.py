"""
Pedagogical and Accessible Plotting Library for STATS19 Exploratory Data Analysis.
Provides clean Matplotlib & Seaborn visualizers with consistent styling, colorblind-safe palettes,
and 95% Wilson Score confidence intervals for statistical categorical comparisons.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Union
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Colorblind-safe palette (Wong / Okabe-Ito accessible hexes)
PALETTE_ACCESSIBLE = [
    "#0072B2",  # Deep Blue
    "#D55E00",  # Vermilion / Amber
    "#009E73",  # Bluish Green / Emerald
    "#56B4E9",  # Sky Blue
    "#CC79A7",  # Reddish Purple
    "#E69F00",  # Orange
    "#F0E442",  # Yellow
    "#555555"   # Charcoal
]

# Set global Matplotlib aesthetics
plt.rcParams.update({
    "font.sans-serif": ["Helvetica", "Arial", "DejaVu Sans", "sans-serif"],
    "axes.edgecolor": "#CCCCCC",
    "axes.linewidth": 0.8,
    "axes.grid": True,
    "grid.color": "#E5E5E5",
    "grid.linestyle": "--",
    "grid.alpha": 0.7,
    "xtick.color": "#333333",
    "ytick.color": "#333333",
    "figure.autolayout": True
})


def calculate_wilson_ci(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float, float, float]:
    """
    Compute the Wilson Score Confidence Interval for a binomial proportion.
    
    Args:
        k: Number of successes (e.g. severe collisions).
        n: Total sample size (e.g. total collisions in category).
        confidence: Confidence level (default 0.95 for 95% CI, z = 1.95996).
        
    Returns:
        Tuple of (p_pct, ci_lower_pct, ci_upper_pct, err_margin_pct)
    """
    if n <= 0:
        return 0.0, 0.0, 0.0, 0.0

    z = 1.959964  # Standard normal critical value for 95%
    p_hat = k / n
    denominator = 1 + (z ** 2) / n
    center_adjusted = (p_hat + (z ** 2) / (2 * n)) / denominator
    margin = (z * np.sqrt((p_hat * (1 - p_hat) / n) + (z ** 2) / (4 * (n ** 2)))) / denominator

    ci_lower = max(0.0, center_adjusted - margin)
    ci_upper = min(1.0, center_adjusted + margin)

    return (
        p_hat * 100.0,
        ci_lower * 100.0,
        ci_upper * 100.0,
        (ci_upper - ci_lower) * 100.0 / 2.0
    )


def save_figure(fig: plt.Figure, output_path: Union[str, Path], dpi: int = 160):
    """Save figure to path, ensuring parent directories exist."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=dpi, bbox_inches="tight")
    plt.close(fig)


def plot_bar(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    title: str,
    x_label: str,
    y_label: str,
    output_path: Optional[Union[str, Path]] = None,
    color: str = PALETTE_ACCESSIBLE[0],
    annotate: bool = True,
    rotate_x: int = 0,
    horizontal: bool = False,
    figsize: Tuple[int, int] = (9, 5)
) -> plt.Figure:
    """Render a clean vertical or horizontal bar chart with values."""
    fig, ax = plt.subplots(figsize=figsize)

    if horizontal:
        bars = ax.barh(df[y_col], df[x_col], color=color, edgecolor="#FFFFFF", height=0.65)
        ax.set_xlabel(x_label, fontsize=11, fontweight="bold", color="#222222")
        ax.set_ylabel(y_label, fontsize=11, fontweight="bold", color="#222222")
        ax.invert_yaxis()
        if annotate:
            for bar in bars:
                w = bar.get_width()
                ax.text(w + (df[x_col].max() * 0.01), bar.get_y() + bar.get_height() / 2,
                        f"{w:,.0f}" if w >= 100 else f"{w:.1f}%",
                        va="center", ha="left", fontsize=9, color="#333333")
    else:
        bars = ax.bar(df[x_col].astype(str), df[y_col], color=color, edgecolor="#FFFFFF", width=0.65)
        ax.set_xlabel(x_label, fontsize=11, fontweight="bold", color="#222222")
        ax.set_ylabel(y_label, fontsize=11, fontweight="bold", color="#222222")
        if rotate_x:
            ax.tick_params(axis="x", rotation=rotate_x)
        if annotate:
            for bar in bars:
                h = bar.get_height()
                ax.text(bar.get_x() + bar.get_width() / 2, h + (df[y_col].max() * 0.015),
                        f"{h:,.0f}" if h >= 100 else f"{h:.1f}%",
                        ha="center", va="bottom", fontsize=9, color="#333333")

    ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if output_path:
        save_figure(fig, output_path)
    return fig


def plot_line_trend(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    title: str,
    x_label: str,
    y_label: str,
    output_path: Optional[Union[str, Path]] = None,
    color: str = PALETTE_ACCESSIBLE[0],
    marker: str = "o",
    figsize: Tuple[int, int] = (9, 4.8)
) -> plt.Figure:
    """Render a clean chronological trend line chart with markers."""
    fig, ax = plt.subplots(figsize=figsize)
    ax.plot(df[x_col].astype(str), df[y_col], marker=marker, color=color, linewidth=2.2, markersize=6)

    for x, y in zip(df[x_col].astype(str), df[y_col]):
        ax.annotate(f"{y:,.0f}" if y >= 100 else f"{y:.1f}%", (x, y),
                    textcoords="offset points", xytext=(0, 8), ha="center", fontsize=9, fontweight="bold", color="#333333")

    ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax.set_xlabel(x_label, fontsize=11, fontweight="bold", color="#222222")
    ax.set_ylabel(y_label, fontsize=11, fontweight="bold", color="#222222")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if output_path:
        save_figure(fig, output_path)
    return fig


def plot_severity_rate_with_ci(
    df: pd.DataFrame,
    category_col: str,
    severe_count_col: str,
    total_count_col: str,
    title: str,
    x_label: str,
    output_path: Optional[Union[str, Path]] = None,
    min_reliable_n: int = 500,
    figsize: Tuple[int, int] = (10, 5.5)
) -> plt.Figure:
    """
    Render horizontal bar chart of severe collision percentage with 95% Wilson Score CI error bars.
    Flags low-sample groups (< min_reliable_n) visually and textually.
    """
    df_plot = df.copy()

    # Calculate Wilson Score CIs
    ci_results = [
        calculate_wilson_ci(int(r[severe_count_col]), int(r[total_count_col]))
        for _, r in df_plot.iterrows()
    ]
    df_plot["pct"] = [r[0] for r in ci_results]
    df_plot["ci_low"] = [r[1] for r in ci_results]
    df_plot["ci_high"] = [r[2] for r in ci_results]
    df_plot["err_low"] = df_plot["pct"] - df_plot["ci_low"]
    df_plot["err_high"] = df_plot["ci_high"] - df_plot["pct"]
    df_plot["is_reliable"] = df_plot[total_count_col] >= min_reliable_n

    fig, ax = plt.subplots(figsize=figsize)
    y_positions = np.arange(len(df_plot))

    colors = [PALETTE_ACCESSIBLE[0] if rel else "#AAAAAA" for rel in df_plot["is_reliable"]]
    xerr = [df_plot["err_low"], df_plot["err_high"]]

    bars = ax.barh(
        y_positions,
        df_plot["pct"],
        xerr=xerr,
        color=colors,
        capsize=3.5,
        edgecolor="#FFFFFF",
        height=0.6,
        error_kw={"elinewidth": 1.2, "ecolor": "#222222"}
    )

    # Annotate values and group sizes
    for idx, (_, row) in enumerate(df_plot.iterrows()):
        val_str = f"{row['pct']:.1f}% (N={row[total_count_col]:,})"
        if not row["is_reliable"]:
            val_str += " [Unreliable N<500]"
        ax.text(row["ci_high"] + 0.8, idx, val_str, va="center", ha="left", fontsize=8.5,
                color="#111111" if row["is_reliable"] else "#777777")

    # Format y-ticks
    ax.set_yticks(y_positions)
    ax.set_yticklabels(df_plot[category_col], fontsize=9.5)
    ax.invert_yaxis()

    ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax.set_xlabel(f"{x_label} (with 95% Wilson Score CI)", fontsize=10.5, fontweight="bold", color="#222222")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    if output_path:
        save_figure(fig, output_path)
    return fig


def plot_dual_axis_count_and_rate(
    df: pd.DataFrame,
    x_col: str,
    count_col: str,
    rate_col: str,
    title: str,
    x_label: str,
    count_label: str = "Total Collisions",
    rate_label: str = "Severe Rate (%)",
    output_path: Optional[Union[str, Path]] = None,
    rotate_x: int = 0,
    figsize: Tuple[int, int] = (10, 5.2)
) -> plt.Figure:
    """Render dual-axis chart: Bar chart for counts (left) and line chart for severe % (right)."""
    fig, ax1 = plt.subplots(figsize=figsize)
    ax2 = ax1.twinx()

    x_labels = df[x_col].astype(str)
    x_pos = np.arange(len(x_labels))

    # Left: Bars for Total Collisions
    ax1.bar(x_pos - 0.15, df[count_col], width=0.5, color=PALETTE_ACCESSIBLE[0], alpha=0.85, label=count_label)
    ax1.set_ylabel(count_label, color=PALETTE_ACCESSIBLE[0], fontsize=11, fontweight="bold")
    ax1.tick_params(axis="y", labelcolor=PALETTE_ACCESSIBLE[0])
    ax1.set_xticks(x_pos)
    ax1.set_xticklabels(x_labels, rotation=rotate_x, ha="right" if rotate_x else "center", fontsize=9.5)

    # Right: Line for Severe Rate %
    ax2.plot(x_pos, df[rate_col], color=PALETTE_ACCESSIBLE[1], marker="o", linewidth=2.2, markersize=6, label=rate_label)
    ax2.set_ylabel(rate_label, color=PALETTE_ACCESSIBLE[1], fontsize=11, fontweight="bold")
    ax2.tick_params(axis="y", labelcolor=PALETTE_ACCESSIBLE[1])
    ax2.grid(False)

    for x, y in zip(x_pos, df[rate_col]):
        ax2.annotate(f"{y:.1f}%", (x, y), textcoords="offset points", xytext=(0, 7), ha="center", fontsize=8.5, fontweight="bold", color=PALETTE_ACCESSIBLE[1])

    ax1.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax1.set_xlabel(x_label, fontsize=11, fontweight="bold", color="#222222")
    ax1.spines["top"].set_visible(False)
    ax2.spines["top"].set_visible(False)

    if output_path:
        save_figure(fig, output_path)
    return fig


def plot_weekday_hour_heatmap(
    df: pd.DataFrame,
    day_col: str,
    hour_col: str,
    value_col: str,
    title: str,
    output_path: Optional[Union[str, Path]] = None,
    figsize: Tuple[int, int] = (12, 5.5)
) -> plt.Figure:
    """Render a 7-day x 24-hour heatmap using Seaborn with accessible colormap."""
    # Pivot dataframe into matrix (Days on Y-axis, Hours on X-axis)
    days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    pivot = df.pivot(index=day_col, columns=hour_col, values=value_col)
    pivot = pivot.reindex([d for d in days_order if d in pivot.index])

    fig, ax = plt.subplots(figsize=figsize)
    sns.heatmap(
        pivot,
        cmap="YlOrRd",
        linewidths=0.5,
        linecolor="#EAEAEA",
        cbar_kws={"label": "Collision Count"},
        ax=ax
    )

    ax.set_title(title, fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax.set_xlabel("Hour of Day (0–23)", fontsize=11, fontweight="bold", color="#222222")
    ax.set_ylabel("Day of Week", fontsize=11, fontweight="bold", color="#222222")
    ax.tick_params(axis="x", rotation=0)

    if output_path:
        save_figure(fig, output_path)
    return fig
