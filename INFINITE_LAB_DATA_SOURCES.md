# NexusNova Infinite Lab — Data Sources & Truth Boundary

Infinite Lab is an exploration visualization. It combines bounded public-catalog samples with procedural worlds-within-worlds rendering. It does **not** claim to display every astronomical object or to be a complete map of the observable universe.

## ESA Gaia

Primary archive: https://gea.esac.esa.int/archive/

Current public release used by this feature: **Gaia DR3**. ESA's current archive information says Gaia science observations ended on 15 January 2025 and Gaia Data Release 4 is expected in December 2026. Infinite Lab therefore does not present DR4 as an already-public dataset.

TAP service: https://gea.esac.esa.int/tap-server/tap

The adapter requests a bounded visible-region sample from the Gaia DR3 source table. Supported fields include source_id, RA, Dec, parallax, parallax error, proper motion, radial velocity, G-band magnitude, BP-RP, effective temperature and selected astrophysical-parameter fields when returned.

Distance derived from parallax is explicitly treated as derived from source data. Distance uncertainty is derived from parallax and parallax_error when both are present. Missing fields remain `NOT REPORTED`.

## NASA Exoplanet Archive

Primary archive: https://exoplanetarchive.ipac.caltech.edu/

TAP service: https://exoplanetarchive.ipac.caltech.edu/TAP/sync

The feature uses the public Planetary Systems Composite Parameters table (`pscomppars`) for bounded samples. Supported fields include planet/host names, coordinates, distance and uncertainty when reported, radius, mass, orbital period, semi-major axis, eccentricity, host effective temperature, discovery method/reference and related source metadata.

Values from composite tables remain archive values; the interface does not imply that every parameter came from one observation or one measurement pipeline.

## NASA/IPAC Extragalactic Database (NED)

Primary database: https://ned.ipac.caltech.edu/

Current TAP service: https://ned.ipac.caltech.edu/tap/sync

The NED adapter uses the current TAP service for a bounded cone query around the current sky region. Legacy NED APIs are not used. The normalized layer supports preferred names, RA, Dec, redshift and object classification; other requested fields remain `NOT REPORTED` unless a supported endpoint returns them.

## Sloan Digital Sky Survey (SDSS)

Current public release used in UI: **DR20**.

Primary access: https://skyserver.sdss.org/dr20/

Infinite Lab treats SDSS as a **PUBLIC SURVEY** layer. The adapter requests a bounded radial imaging-region sample through the public SkyServer service. Source availability can vary by service status; a failed request must show the public-data-unavailable state rather than invented values.

## Dark Energy Spectroscopic Instrument (DESI)

Current public release used in UI: **DR1**.

Primary survey: https://data.desi.lbl.gov/doc/releases/dr1/

Public Data Lab access: https://datalab.noirlab.edu/desi/

Data Lab TAP: https://datalab.noirlab.edu/tap

The adapter targets the public DESI DR1 spectroscopic catalog family, including the `desi_dr1.zpix` table where available. DESI records are labelled **PUBLIC SURVEY** and retain DR1 provenance. DESI data carries its published reuse/acknowledgement requirements; this feature does not strip source attribution.

## Browser delivery path

The browser requests catalog data through the NexusNova Cloudflare Worker astronomy proxy at `/api/astronomy/query`. The proxy allows only the five supported source families, validates the expected table/endpoint shape and query limits, blocks arbitrary URL forwarding, applies request/response size limits and returns source data with CORS for `https://nexusnovatools.com`. The public catalog remains the upstream authority; the Worker is only the controlled transport layer.

## Provenance rule

Every normalized catalog object retains:

- source/catalog
- release
- query timestamp
- source URL
- source type
- returned measurement fields
- explicit missing-field state

The renderer never uses procedural points as a substitute for a missing measured value.

## Procedural rule

Procedural structures include galaxies, city-like layers, recursive scenes, anomaly fields and visual continuations. They are deterministic reconstructions generated for interaction. They are labelled **PROCEDURAL VISUALIZATION** or **ILLUSTRATIVE CONTEXT** and must not be described as observed structures.

## Coverage rule

Public astronomy catalogs overlap and have different footprints, selections, limits, releases and measurement uncertainties. There is no single public table that contains every astronomical detection plus complete physical properties and perfect three-dimensional positions.

Infinite Lab therefore uses progressive, spatially tiled, source-aware loading. It does not attempt to put billions of records into browser memory.

## Failure rule

When a public endpoint is unavailable, the app shows:

**PUBLIC DATA SOURCE TEMPORARILY UNAVAILABLE**

Already loaded source-backed records remain visible. Procedural navigation may continue, but it remains explicitly labelled as procedural/illustrative.

## Scope

Universe Atlas remains the real-data-oriented astronomy atlas. Infinite Lab is the worlds-within-worlds exploration system and intentionally separates scientific records from procedural continuation.