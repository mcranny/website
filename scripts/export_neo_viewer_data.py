from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

NEO_REPO = Path("/Users/matthewcranny/Documents/GitHub/neo-updater")
OUT_PATH = Path("assets/neo-missions.json")

sys.path.insert(0, str(NEO_REPO))

from app.solar_system import (  # noqa: E402
    PLANETS,
    asteroid_orbit_curve_au,
    asteroid_position_au,
    orbit_curve_au,
    planet_elements,
    planet_position_au,
)


def fetch_rows(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return connection.execute(
        """
        WITH ranked AS (
          SELECT ip.plan_id,
                 ROW_NUMBER() OVER (
                   PARTITION BY a.designation
                   ORDER BY ip.total_dv_kms ASC
                 ) AS rn
          FROM intercept_plans ip
          JOIN close_approaches ca ON ca.approach_id = ip.approach_id
          JOIN asteroids a ON a.designation = ca.designation
        )
        SELECT a.designation, TRIM(a.fullname) AS fullname,
               a.absolute_magnitude_h, a.diameter_km,
               ca.close_approach_text, ca.distance_au, ca.relative_velocity_kms,
               oe.epoch_jd_tdb, oe.semi_major_axis_au, oe.eccentricity,
               oe.inclination_deg, oe.raan_deg, oe.arg_periapsis_deg,
               oe.mean_anomaly_deg, oe.perihelion_time_jd_tdb,
               oe.perihelion_distance_au, oe.aphelion_distance_au,
               oe.orbital_period_days, oe.earth_moid_au, oe.condition_code,
               oe.orbit_id, ip.departure_jd_tdb, ip.arrival_jd_tdb,
               ip.tof_days, ip.departure_dv_kms, ip.arrival_dv_kms,
               ip.total_dv_kms, ip.c3_km2_s2, ip.leo_departure_dv_kms,
               ip.polyline_json
        FROM ranked r
        JOIN intercept_plans ip ON ip.plan_id = r.plan_id
        JOIN close_approaches ca ON ca.approach_id = ip.approach_id
        JOIN asteroids a ON a.designation = ca.designation
        JOIN orbital_elements oe ON oe.designation = a.designation
        WHERE r.rn = 1
        ORDER BY ip.total_dv_kms ASC
        LIMIT 12
        """
    ).fetchall()


def vector_list(array) -> list[list[float]]:
    return [[float(value) for value in row] for row in array]


def sample_track(fn, departure_jd: float, tof_days: float, samples: int) -> list[list[float]]:
    points = []
    for index in range(samples):
        fraction = index / (samples - 1) if samples > 1 else 0.0
        points.append(vector_list([fn(departure_jd + tof_days * fraction)])[0])
    return points


def main() -> None:
    database = NEO_REPO / "data" / "asteroids.db"
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    objects = []

    for row in fetch_rows(connection):
        item = dict(row)
        polyline = json.loads(item.pop("polyline_json") or "[]")
        elements = {
            "a_AU": item["semi_major_axis_au"],
            "e": item["eccentricity"],
            "i_deg": item["inclination_deg"],
            "raan_deg": item["raan_deg"],
            "argp_deg": item["arg_periapsis_deg"],
            "ma_deg": item["mean_anomaly_deg"],
            "epoch_jd_tdb": item["epoch_jd_tdb"],
            "tp_jd_tdb": item["perihelion_time_jd_tdb"],
            "period_d": item["orbital_period_days"],
        }
        departure = float(item["departure_jd_tdb"])
        tof_days = float(item["tof_days"])
        samples = max(80, len(polyline) or 181)

        item["elements"] = elements
        item["polyline_au"] = polyline
        item["target_track_au"] = sample_track(
            lambda jd, el=elements: asteroid_position_au(el, jd),
            departure,
            tof_days,
            samples,
        )
        item["target_orbit_au"] = vector_list(asteroid_orbit_curve_au(elements, samples=420))
        item["planet_tracks_au"] = {
            planet.name: sample_track(
                lambda jd, planet=planet: planet_position_au(planet, jd),
                departure,
                tof_days,
                samples,
            )
            for planet in PLANETS
        }
        item["planet_orbits_au"] = {
            planet.name: vector_list(orbit_curve_au(planet_elements(planet, departure), samples=360))
            for planet in PLANETS
        }
        objects.append(item)

    payload = {
        "mode": "sqlite-export",
        "source_repo": str(NEO_REPO),
        "source_database": "data/asteroids.db",
        "export_note": (
            "Static web export from normalized SQLite tables. Planet, Earth, "
            "target, and Lambert geometry use neo-updater source functions."
        ),
        "counts": {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in [
                "asteroids",
                "orbital_elements",
                "close_approaches",
                "intercept_plans",
                "ingestion_runs",
            ]
        },
        "objects": objects,
    }
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} with {len(objects)} missions")


if __name__ == "__main__":
    main()
