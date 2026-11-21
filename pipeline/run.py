"""The one pipeline entry point: ingest, silver, model, graph, gold, in that order.

Run with: uv run python run.py
Each stage is added to STAGES as its lane lands.
"""

from collections.abc import Callable

from ingest import drainage, elevation, evidence, fema, parcels, storm_network

Stage = tuple[str, Callable[[], None]]

STAGES: list[Stage] = [
    ("ingest: elevation", elevation.download),
    ("ingest: fema", fema.download),
    ("ingest: evidence", evidence.download),
    ("ingest: drainage", drainage.download),
    ("ingest: storm network", storm_network.download),
    ("ingest: parcels", parcels.download),
]


def main() -> None:
    if not STAGES:
        print("No pipeline stages yet.")
        return
    for name, step in STAGES:
        print(f"== {name}")
        step()


if __name__ == "__main__":
    main()
