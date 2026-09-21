# NexusNova Universe Atlas — Research & Data Sources

This page is a public-facing interactive experiment. It separates catalog-backed objects from visualization-only density fields.

## Gaia DR3 — ESA

Primary archive: https://gea.esac.esa.int/archive/

Gaia DR3 contains 1,811,709,771 sources. The release includes positions, parallaxes, proper motions and photometry for very large portions of the catalogue, while astrophysical-parameter products are available for smaller subsets. ESA reports 470,759,263 sources with astrophysical parameters from BP/RP spectra and 128,611,111 sources with evolutionary parameters such as mass and age.

The live Atlas can query a bounded Gaia DR3 sample through the ESA TAP service:
https://gea.esac.esa.int/tap-server/tap

The Atlas must preserve whether distance or physical properties are measured, catalog-derived, or model-derived.

## IAU star names

Primary organization: https://www.iau.org/

The proper-name layer should use IAU-approved star names where available. A Gaia source without an official proper name should be identified by catalog ID instead of an invented name.

## NASA Exoplanet Archive

Primary archive: https://exoplanetarchive.ipac.caltech.edu/

Current archive statistics on 11 September 2026 report 6,366 confirmed planets. The Planetary Systems (ps) and Planetary Systems Composite Parameters (pscomppars) tables are accessible through the TAP service.

TAP endpoint:
https://exoplanetarchive.ipac.caltech.edu/TAP/sync

The Atlas uses a bounded query for live preview and should attach the archive record name, host, coordinates, distance, radius/mass where reported, stellar temperature where reported, and discovery method.

## JPL Horizons / Small-Body Database

Primary sources:
- https://ssd.jpl.nasa.gov/horizons/
- https://ssd.jpl.nasa.gov/sb/
- https://ssd.jpl.nasa.gov/api.html

JPL provides programmatic ephemeris access through Horizons and current small-body information through SBDB/related services. The final Solar System layer should use ephemerides rather than hand-authored orbital animation when accuracy is required.

## NASA/IPAC Extragalactic Database (NED)

Primary source:
https://ned.ipac.caltech.edu/

NED is the main extragalactic identity/cross-identification layer for the Atlas. Galaxy aliases, redshifts, photometry, morphology and references should be sourced from NED or its linked literature.

## NASA HEASARC

Primary source:
https://heasarc.gsfc.nasa.gov/

HEASARC hosts multi-mission astronomy catalogs. Its XRAY master catalog was last updated on 9 August 2026 and combines common parameters from many component X-ray catalogs. Original component catalog provenance should remain visible when a source is inspected.

## Gravitational Wave Open Science Center

Primary source:
https://gwosc.org/

The gravitational-wave layer is intended for transient event records such as the GWTC catalog family. Events should not be rendered as stationary stars.

## Rendering rule

The Atlas intentionally does not claim that every visible background point is an individually identified astronomical object. Dense background particles are visual context. Catalog-backed objects carry names/IDs and source metadata.

## “Everything discovered” rule

There is no single complete database containing every astronomical detection plus full mass, radius, composition and 3D position. The production architecture therefore federates multiple catalog families and progressively streams relevant records at different spatial/scale levels.

Missing values remain “Not reported”.
