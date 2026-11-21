"""Reproject the elevation onto the app's grid: north-up, aligned to longitude and latitude.

The browser maps a position to a cell with the manifest box alone (row-major, north row
first), so the grid must be aligned to degrees, not to UTM metres (the two differ by about
0.7 degrees of rotation here, up to ~75 m at the corners). Same pixel count as the source.
Cell sizes in metres are reported for the model: x and y differ slightly.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import rasterio
from numpy.typing import NDArray
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject

import config

NODATA = -9999.0
M_PER_DEG_LAT = 110_574.0
M_PER_DEG_LON_EQUATOR = 111_320.0


@dataclass
class Grid:
    ground_m: NDArray[np.float64]  # [row, col], north row first
    bbox: tuple[float, float, float, float]  # west, south, east, north
    cell_x_m: float
    cell_y_m: float

    @property
    def cell_size_m(self) -> float:
        """Side of a square cell with the same area (used for volumes)."""
        return math.sqrt(self.cell_x_m * self.cell_y_m)

    def cell_of(self, lng: float, lat: float) -> tuple[int, int] | None:
        west, south, east, north = self.bbox
        height, width = self.ground_m.shape
        col = int((lng - west) / (east - west) * width)
        row = int((north - lat) / (north - south) * height)
        if 0 <= row < height and 0 <= col < width:
            return row, col
        return None


def build() -> Grid:
    path = config.SILVER_DIR / "ground_wgs84.tif"
    if not path.exists():
        source = config.BRONZE_DIR / "elevation_3dep.tif"
        west, south, east, north = config.STUDY_BOX_WGS84
        with rasterio.open(source) as src:
            width, height = src.width, src.height
            out = np.full((height, width), NODATA, dtype=np.float32)
            transform = from_bounds(west, south, east, north, width, height)
            reproject(
                source=rasterio.band(src, 1),
                destination=out,
                src_transform=src.transform,
                src_crs=src.crs,
                src_nodata=NODATA,
                dst_transform=transform,
                dst_crs="EPSG:4326",
                dst_nodata=NODATA,
                resampling=Resampling.bilinear,
            )
        gaps = int(np.count_nonzero(out == NODATA))
        if gaps:
            raise RuntimeError(f"silver elevation: {gaps} empty cells after reprojection")
        path.parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(
            path, "w", driver="GTiff", width=width, height=height, count=1, dtype="float32",
            crs="EPSG:4326", transform=transform, nodata=NODATA,
        ) as dst:
            dst.write(out, 1)

    with rasterio.open(path) as src:
        ground = src.read(1).astype(np.float64)
        b = src.bounds
    bbox = (b.left, b.bottom, b.right, b.top)
    height, width = ground.shape
    lat0 = math.radians((bbox[1] + bbox[3]) / 2)
    cell_x = (bbox[2] - bbox[0]) / width * M_PER_DEG_LON_EQUATOR * math.cos(lat0)
    cell_y = (bbox[3] - bbox[1]) / height * M_PER_DEG_LAT
    return Grid(ground, bbox, cell_x, cell_y)


if __name__ == "__main__":
    g = build()
    print(f"{g.ground_m.shape[1]} x {g.ground_m.shape[0]}, cell {g.cell_x_m:.2f} x {g.cell_y_m:.2f} m, "
          f"height {g.ground_m.min():.2f} to {g.ground_m.max():.2f} m")
