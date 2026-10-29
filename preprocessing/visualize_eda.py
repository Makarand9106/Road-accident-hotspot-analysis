import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

from .load_data import load_data, get_default_data_path
from .clean_data import clean_data

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def save_plot(fig, name, out_dir='preprocessing/visualizations'):
    ensure_dir(out_dir)
    filepath = os.path.join(out_dir, f"{name}.png")
    fig.savefig(filepath, bbox_inches='tight')
    plt.close(fig)

def main():
    df_raw = load_data(get_default_data_path())
    df = clean_data(df_raw)
    # Histogram of accident severity (assuming column 'severity')
    if 'severity' in df.columns:
        fig = plt.figure(figsize=(8,5))
        sns.countplot(data=df, x='severity', order=sorted(df['severity'].unique()))
        plt.title('Accident Severity Distribution')
        save_plot(fig, 'severity_hist')
    # Correlation heatmap for numeric features
    numeric_df = df.select_dtypes(include='number')
    if not numeric_df.empty:
        corr = numeric_df.corr()
        fig = plt.figure(figsize=(10,8))
        sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm')
        plt.title('Correlation Heatmap')
        save_plot(fig, 'correlation_heatmap')
    # Pairplot for a subset of numeric columns
    subset_cols = numeric_df.columns[:5]
    if len(subset_cols) >= 2:
        sns.pairplot(df[subset_cols])
        fig = plt.gcf()
        save_plot(fig, 'pairplot')
    # Time series if a datetime column exists (e.g., 'date')
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df_time = df.dropna(subset=['date'])
        if not df_time.empty:
            df_time = df_time.set_index('date')
            daily_counts = df_time.resample('D').size()
            fig = plt.figure(figsize=(12,6))
            daily_counts.plot()
            plt.title('Daily Accident Count')
            plt.xlabel('Date')
            plt.ylabel('Count')
            save_plot(fig, 'daily_counts')
    print('EDA visualizations saved to preprocessing/visualizations')

if __name__ == '__main__':
    main()
