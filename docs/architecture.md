# System Architecture & Pipeline Design

This document details the architectural layout, data flow, and system components of the **Smart Road Accident Hotspot Analysis and Risk Prediction System**.

---

## 1. System Pipeline Diagram

```mermaid
flowchart TD
    %% Styling
    classDef dataStage fill:#EBF5FB,stroke:#2980B9,stroke-width:2px,color:#1B4F72;
    classDef processStage fill:#FEF9E7,stroke:#F39C12,stroke-width:2px,color:#7D6608;
    classDef storageStage fill:#E8F8F5,stroke:#27AE60,stroke-width:2px,color:#145A32;
    classDef serveStage fill:#F4ECF7,stroke:#8E44AD,stroke-width:2px,color:#512E5F;
    classDef clientStage fill:#FDEDEC,stroke:#E74C3C,stroke-width:2px,color:#78281F;

    subgraph External["External Data Source"]
        DFT["UK DfT STATS19 (2019-2023)<br/>• Collisions CSV<br/>• Vehicles CSV<br/>• Casualties CSV"]:::dataStage
    end

    subgraph OfflinePipeline["Offline Python Pipeline"]
        INGEST["python/ingestion<br/>Automated Download & Verification"]:::processStage
        PREPROCESS["python/preprocessing<br/>• Clean & Deduplicate<br/>• Clean Coordinates (BNG Metres & GPS)<br/>• time_period Proxy Feature<br/>• Define is_severe Target (0/1)"]:::processStage
        
        subgraph AnalyticsAndML["Analytics & Modeling"]
            DBSCAN_ALG["python/hotspot<br/>DBSCAN Clustering<br/>(Easting/Northing in metres)"]:::processStage
            RANK_ALG["python/hotspot<br/>Percentile Composite Scoring"]:::processStage
            LR_TRAIN["python/prediction<br/>Logistic Regression Training<br/>(Scikit-Learn)"]:::processStage
            EDA_VIZ["python/visualization & analysis<br/>Static EDA & Charts"]:::processStage
        end
    end

    subgraph Storage["Data & Model Storage"]
        PG_DB[("PostgreSQL Database<br/>• fact_collisions<br/>• dim_vehicles<br/>• dim_casualties<br/>• hotspot_clusters (Table/View)<br/>• Analytical Views")]:::storageStage
        MODEL_JSON["models/risk_model.json<br/>• Intercept & Coefficients<br/>• Scaler Parameters<br/>• Feature Names & Encodings"]:::storageStage
        STATIC_PLOTS["docs/figures/<br/>Static Charts & Reports"]:::storageStage
    end

    subgraph BackendApp["Backend Service (Port 4000)"]
        EXPRESS["Node.js + Express REST API<br/>• Pool / pg Connection<br/>• Express Routes & Controllers"]:::serveStage
        IN_MEMORY_PRED["In-Memory Risk Scorer<br/>(Calculates dot product & sigmoid<br/>from risk_model.json)"]:::serveStage
    end

    subgraph FrontendApp["Frontend Application (Vite + React)"]
        DASHBOARD["React Single Page Dashboard"]:::clientStage
        MAP_VIEW["Leaflet / OpenStreetMap<br/>• Interactive Hotspot Clusters<br/>• Heatmap & Intensity Overlays"]:::clientStage
        CHARTS_VIEW["Recharts Visualizations<br/>• Severity & Time Breakdown<br/>• Weather/Lighting Correlations"]:::clientStage
        PRED_VIEW["Interactive Risk Scenario Form<br/>• Real-time Severity Probability Gauge"]:::clientStage
    end

    %% Data Flow Links
    DFT --> INGEST
    INGEST --> PREPROCESS
    PREPROCESS --> DBSCAN_ALG
    DBSCAN_ALG --> RANK_ALG
    PREPROCESS --> LR_TRAIN
    PREPROCESS --> EDA_VIZ

    PREPROCESS -->|Bulk Load ETL| PG_DB
    RANK_ALG -->|Save Clusters| PG_DB
    LR_TRAIN -->|Export Weights| MODEL_JSON
    EDA_VIZ -->|Export Plots| STATIC_PLOTS

    PG_DB <-->|SQL Queries & Views| EXPRESS
    MODEL_JSON -->|Load at Startup| IN_MEMORY_PRED
    IN_MEMORY_PRED <--> EXPRESS

    EXPRESS <-->|JSON REST API| DASHBOARD
    DASHBOARD --> MAP_VIEW
    DASHBOARD --> CHARTS_VIEW
    DASHBOARD --> PRED_VIEW
```

---

## 2. Key Component Descriptions

| Component | Technology | Primary Responsibility |
|---|---|---|
| **Data Ingestion & Cleaning** | Python (`pandas`, `numpy`) | Downloads STATS19 records (2019–2023), removes invalid spatial rows, generates the `time_period` rush-hour proxy, and binarizes severity into `is_severe`. |
| **Spatial Hotspot Engine** | Python (`scikit-learn` DBSCAN) | Performs density clustering using British National Grid metric coordinates ($Easting, Northing$), and computes equal-weight composite hotspot percentile ranks. |
| **Prediction Engine (Training)** | Python (`scikit-learn` LogisticRegression) | Trains an explainable logistic regression model on situational and environmental factors and exports parameter weights as JSON. |
| **Relational Database** | PostgreSQL | Stores cleaned relational collision, vehicle, casualty records and indexed spatial/analytical views for efficient sub-second dashboard queries. |
| **API Server & Scorer** | Node.js + Express | Serves REST endpoints for map bounding boxes, hotspot lists, aggregated charts, and computes scenario risk predictions directly in memory. |
| **Interactive Dashboard** | React + Vite + Tailwind + Leaflet + Recharts | Responsive web application presenting interactive spatial maps, analytical charts, filtering controls, and the real-time risk predictor. |
