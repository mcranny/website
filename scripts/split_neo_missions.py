#!/usr/bin/env python3
"""Split the browser NEO export into a lightweight index and lazy mission files."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or "mission"


def write_payload(payload: dict, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    for stale in output.glob("*.json"):
        stale.unlink()

    index_objects = []
    used_names: set[str] = set()
    for number, mission in enumerate(payload.get("objects", []), start=1):
        filename = f"{slug(str(mission.get('designation', '')))}.json"
        if filename in used_names:
            filename = f"{number}-{filename}"
        used_names.add(filename)

        (output / filename).write_text(
            json.dumps(mission, separators=(",", ":")) + "\n"
        )
        summary = {
            key: value
            for key, value in mission.items()
            if not isinstance(value, (list, dict))
        }
        summary["data_file"] = f"assets/neo-missions/{filename}"
        index_objects.append(summary)

    index = {
        "mode": payload.get("mode", "static mission data"),
        "counts": payload.get("counts", {}),
        "objects": index_objects,
    }
    (output / "index.json").write_text(
        json.dumps(index, separators=(",", ":")) + "\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    write_payload(json.loads(args.source.read_text()), args.output)


if __name__ == "__main__":
    main()
