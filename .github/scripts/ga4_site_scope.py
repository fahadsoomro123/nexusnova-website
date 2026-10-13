from __future__ import annotations

from copy import deepcopy
from typing import Any

PRODUCTION_HOSTNAME = "nexusnovatools.com"


def production_scoped_ga4_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Scope a GA4 Data API report to the canonical public website host.

    GA4 dimension filters require the filtered dimension to be requested in the
    report, so hostName is appended while preserving any requested dimensions.
    A copy is returned so callers' original payloads remain unchanged.
    """
    scoped = deepcopy(payload)
    dimensions = list(scoped.get("dimensions") or [])
    if not any(item.get("name") == "hostName" for item in dimensions):
        dimensions.append({"name": "hostName"})
    scoped["dimensions"] = dimensions
    scoped["dimensionFilter"] = {
        "filter": {
            "fieldName": "hostName",
            "stringFilter": {
                "matchType": "EXACT",
                "value": PRODUCTION_HOSTNAME,
                "caseSensitive": False,
            },
        }
    }
    return scoped
