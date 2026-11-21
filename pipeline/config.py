"""Every pipeline setting lives here: study box, storm sizes, vehicle limits, file paths.

No other pipeline file hard-codes a setting; they import it from this module.
"""

from pathlib import Path

# Study box around USF, WGS84 (xmin, ymin, xmax, ymax). 4 x 4 miles.
# Source: prep/02-flood-and-elevation-data.md, section "Study area".
STUDY_BOX_WGS84: tuple[float, float, float, float] = (-82.4467, 28.0297, -82.3811, 28.0877)

# Working projection: UTM zone 17N, so grid cells are in metres.
WORK_CRS = "EPSG:26917"

# 24-hour rainfall totals at USF in inches, NOAA Atlas 14.
# Source: prep/PLAN.md section 6. Confirm the duration mapping on NOAA's page before quoting.
STORM_TOTALS_IN: dict[str, float] = {
    "10yr": 6.6,
    "25yr": 8.4,
    "100yr": 11.9,
    "500yr": 17.2,
}

# Depth in metres at which a road closes for each vehicle class. Source: PLAN.md section 5.
VEHICLE_LIMITS_M: dict[str, float] = {
    "foot": 0.30,
    "car": 0.15,
    "suv": 0.30,
    "fire_engine": 0.25,
    "high_water": 0.75,
}

# "Wet" at a building for the grade. Source: PLAN.md section 6.
WET_THRESHOLD_M = 0.15

# Paths. Raw downloads (bronze) and intermediate files (silver) stay out of git.
PIPELINE_DIR = Path(__file__).resolve().parent
REPO_DIR = PIPELINE_DIR.parent
BRONZE_DIR = PIPELINE_DIR / "data" / "bronze"
SILVER_DIR = PIPELINE_DIR / "data" / "silver"
QUARANTINE_DIR = PIPELINE_DIR / "data" / "quarantine"
GOLD_DIR = REPO_DIR / "web" / "public" / "data"
