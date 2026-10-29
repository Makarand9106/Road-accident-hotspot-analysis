// ===============================================================================
// UK STATS19 ROAD ACCIDENT ANALYTICS — POWER QUERY (M) EXTRACTION & TRANSFORMATION
// Designed for Power BI Desktop & Power BI Service
// ===============================================================================

// -------------------------------------------------------------------------------
// PARAMETER: SourceFolder
// Update this path to repoint all datasets to your local directory.
// -------------------------------------------------------------------------------
let
    SourceFolder = "data/processed" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]
in
    SourceFolder


// -------------------------------------------------------------------------------
// QUERY: FactAccidents (Primary Fact Table: 1 row per collision)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/accidents_clean.csv"), [Delimiter=",", Columns=38, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"accident_index", type text},
        {"accident_year", Int64.Type},
        {"accident_date", type date},
        {"time", type text},
        {"accident_severity", Int64.Type},
        {"severity_name", type text},
        {"is_severe", Int64.Type},
        {"number_of_vehicles", Int64.Type},
        {"number_of_casualties", Int64.Type},
        {"police_force_id", Int64.Type},
        {"police_force_name", type text},
        {"road_type_id", Int64.Type},
        {"road_type_name", type text},
        {"speed_limit", Int64.Type},
        {"light_condition_id", Int64.Type},
        {"light_condition_name", type text},
        {"weather_condition_id", Int64.Type},
        {"weather_condition_name", type text},
        {"road_surface_condition_id", Int64.Type},
        {"road_surface_condition_name", type text},
        {"urban_or_rural_area", Int64.Type},
        {"urban_rural_name", type text},
        {"latitude", type number},
        {"longitude", type number},
        {"easting", Int64.Type},
        {"northing", Int64.Type},
        {"hour", Int64.Type},
        {"month", Int64.Type},
        {"month_name", type text},
        {"day_of_week", Int64.Type},
        {"day_of_week_name", type text},
        {"is_weekend", Int64.Type},
        {"time_period", type text},
        {"involves_motorcycle", Int64.Type},
        {"involves_hgv", Int64.Type},
        {"involves_cyclist", Int64.Type},
        {"hotspot_id", Int64.Type}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: FactCasualties (1 row per casualty involved in a collision)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/casualties_clean.csv"), [Delimiter=",", Columns=9, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"casualty_id", Int64.Type},
        {"accident_index", type text},
        {"casualty_reference", Int64.Type},
        {"casualty_class", Int64.Type},
        {"casualty_class_name", type text},
        {"sex_of_casualty", type text},
        {"age_of_casualty", Int64.Type},
        {"casualty_severity", Int64.Type},
        {"casualty_severity_name", type text},
        {"casualty_type", Int64.Type}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: FactVehicles (1 row per vehicle involved in a collision)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/vehicles_clean.csv"), [Delimiter=",", Columns=9, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"vehicle_id", Int64.Type},
        {"accident_index", type text},
        {"vehicle_reference", Int64.Type},
        {"vehicle_type", Int64.Type},
        {"vehicle_type_name", type text},
        {"sex_of_driver", type text},
        {"age_of_driver", Int64.Type},
        {"first_point_of_impact", type text},
        {"engine_capacity_cc", Int64.Type}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: FactHotspots (704 DBSCAN spatial cluster centroids and risk scores)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents("docs/results/hotspots/hotspot_results.csv"), [Delimiter=",", Columns=16, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"hotspot_id", Int64.Type},
        {"risk_rank", Int64.Type},
        {"risk_score", type number},
        {"risk_level", type text},
        {"accident_count", Int64.Type},
        {"fatal_count", Int64.Type},
        {"serious_count", Int64.Type},
        {"slight_count", Int64.Type},
        {"severe_percentage", type number},
        {"trend_slope", type number},
        {"centre_lat", type number},
        {"centre_lon", type number},
        {"radius_m", type number},
        {"diameter_m", type number},
        {"police_force_name", type text},
        {"nearest_district_name", type text}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: FactHotspotAlerts (Emerging Hotspot Anomaly timeline & priority tiers)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents("docs/results/hotspots/hotspot_alerts.csv"), [Delimiter=",", Columns=12, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"alert_id", Int64.Type},
        {"hotspot_id", Int64.Type},
        {"observation_period", type text},
        {"observed_accidents", Int64.Type},
        {"expected_accidents", Int64.Type},
        {"historical_baseline", type number},
        {"pct_change_vs_baseline", type number},
        {"severe_accident_count", Int64.Type},
        {"anomaly_score", type number},
        {"p_value", type number},
        {"priority_tier", type text},
        {"recommended_action", type text}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: FactPredictions (Evaluated test predictions from Logistic Regression)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents("docs/results/model/predictions_test.csv"), [Delimiter=",", Columns=15, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"prediction_id", Int64.Type},
        {"accident_index", type text},
        {"actual_is_severe", Int64.Type},
        {"predicted_probability", type number},
        {"predicted_is_severe", Int64.Type},
        {"predicted_is_severe_50", Int64.Type},
        {"risk_tier", type text},
        {"prediction_outcome", type text},
        {"residual", type number},
        {"time_period", type text},
        {"weather_condition_name", type text},
        {"road_surface_condition_name", type text},
        {"light_condition_name", type text},
        {"road_type_name", type text},
        {"speed_limit", Int64.Type},
        {"involves_motorcycle", Int64.Type}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: DimDate (Calendar Date Dimension 2021-2025)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/dim_date.csv"), [Delimiter=",", Columns=13, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"date", type date},
        {"year", Int64.Type},
        {"quarter", type text},
        {"quarter_year", type text},
        {"month", Int64.Type},
        {"month_name", type text},
        {"month_year", type text},
        {"month_sort", Int64.Type},
        {"day", Int64.Type},
        {"day_of_week", Int64.Type},
        {"day_of_week_name", type text},
        {"day_of_week_short", type text},
        {"is_weekend", Int64.Type},
        {"season", type text}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: DimLocation (Police Force Areas, Regions & Urban/Rural Profiles)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/dim_location.csv"), [Delimiter=",", Columns=6, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"police_force_id", Int64.Type},
        {"police_force_name", type text},
        {"region_name", type text},
        {"latitude", type number},
        {"longitude", type number},
        {"urban_rural_profile", type text}
    })
in
    TypedTable


// -------------------------------------------------------------------------------
// QUERY: DimRoadCondition (Environmental Condition Interaction Matrix)
// -------------------------------------------------------------------------------
let
    Source = Csv.Document(File.Contents(SourceFolder & "/dim_road_condition.csv"), [Delimiter=",", Columns=4, Encoding=65001, QuoteStyle=QuoteStyle.None]),
    PromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    TypedTable = Table.TransformColumnTypes(PromotedHeaders, {
        {"condition_key", type text},
        {"road_surface_condition_name", type text},
        {"light_condition_name", type text},
        {"compound_risk_rating", type text}
    })
in
    TypedTable
