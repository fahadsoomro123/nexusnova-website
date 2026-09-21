# NexusNova Universe Atlas — data and rendering plan

## Scope

This feature is intended to become a real-time, interactive 3D astronomical atlas inside NexusNova, not a static image and not a decorative procedural galaxy.

The experience should let a visitor travel through hierarchical scales:
1. Observable-universe / cosmic-web context
2. Extragalactic objects and large structures
3. Milky Way
4. Galactic neighborhoods and star systems
5. Individual stars
6. Exoplanetary systems
7. Solar System
8. Small bodies and missions
9. High-energy and transient phenomena

Procedural particles may be used only as a visual density field where catalog resolution is insufficient. They must never be presented as individually discovered objects.

## Primary authoritative data sources

### Gaia DR3 / ESA

Source: https://gea.esac.esa.int/archive/

Gaia DR3 contains 1,811,709,771 sources. The archive exposes positions, parallaxes, proper motions and brightness measurements, plus richer information for subsets. Gaia DR3 provides astrophysical parameters for 470,759,263 sources and stellar mass/age products for roughly 130 million stars.

Use:
- gaia_source / gaia_source_lite for source_id, RA, Dec, parallax, proper motion, radial velocity and photometry where available.
- astrophysical_parameters for temperature, luminosity, radius, mass, age, gravity and quality/confidence fields where available.
- variable-source tables for variable classes.
- Gaia QSO/galaxy candidate tables as an optional extragalactic layer.

3D conversion must preserve the difference between measured parallax and derived distance. Weak/uncertain parallaxes must not be displayed as exact distances.

Star display colour should be derived from measured photometry/effective temperature. It is a rendered spectral/photometric colour, not a claim that a star has one literal RGB colour.

### IAU Working Group on Star Names

Source: https://www.iau.org/

Use the IAU Catalog of Star Names as the authoritative proper-name layer and cross-link names to Gaia and other identifiers.

Important distinction:
- Proper name: IAU-recognised star name.
- Catalog identifier: Gaia DR3 source_id, HIP, HD, etc.
- Alias: alternate literature/catalog name.

Most Gaia sources do not have a popular/proper name, so the UI must show the best available catalog identifier rather than inventing a name.

### NASA Exoplanet Archive / NExScI

Source: https://exoplanetarchive.ipac.caltech.edu/

As of 3 September 2026 the archive reports 6,360 confirmed planets. Its TAP service provides Planetary Systems (ps) and Planetary Systems Composite Parameters (pscomppars), with machine-readable CSV/JSON/TSV/VOTable output.

Use, where available:
- planet name
- host name and catalog IDs
- discovery method/facility
- mass and uncertainty
- radius and uncertainty
- orbital period
- semi-major axis
- eccentricity
- equilibrium temperature
- stellar mass/radius/temperature
- reference/provenance fields

Missing mass/radius/temperature stays missing unless a derived value is explicitly labelled.

### NASA/IPAC Extragalactic Database (NED)

Source: https://ned.ipac.caltech.edu/

NED is the principal extragalactic identity and cross-identification layer. Current holdings exceed 1.1 billion distinct objects and include multiwavelength cross-IDs, photometry, diameters, redshifts and references.

Use:
- standard name
- aliases / cross-identifications
- RA/Dec
- redshift
- distance when available
- object class and morphology
- angular/physical diameter when available
- photometry/SED metadata
- references

Galaxy mass must not be invented when it is not provided by NED or an attached scientific reference.

### JPL Solar System Dynamics / Small-Body DataBase / Horizons

Sources:
- https://ssd.jpl.nasa.gov/
- https://ssd.jpl.nasa.gov/sb/

Use for:
- planets and dwarf planets
- moons/satellites
- asteroids
- comets
- Kuiper-belt / trans-Neptunian objects
- spacecraft/probe ephemerides where appropriate

The SBDB is kept current as new astrometry is published. Missing physical parameters stay unavailable.

### NASA HEASARC

Source: https://heasarc.gsfc.nasa.gov/

HEASARC provides multi-mission astronomy catalogs, especially in X-ray/gamma-ray and related regimes. Its XRAY Master Catalog was updated on 9 August 2026.

Use this layer for high-energy sources and cross-identifications, keeping the original catalog identity visible.

### Gravitational Wave Open Science Center

Source: https://gwosc.org/

GWTC-4.0 currently lists 129 O4a events and provides event-level quantities such as component masses, distance and SNR, with documented provenance.

Render gravitational-wave events as transient event records, not stationary stars.

## Canonical object model

Every object should have:
- object_id
- object_type
- canonical_name
- aliases[]
- source_catalog
- source_record_id
- ra_deg
- dec_deg
- distance_value
- distance_unit
- distance_method
- position_epoch
- mass_value
- mass_unit
- radius_value
- radius_unit
- temperature_value_k
- luminosity_value
- composition_summary
- magnitude
- spectral_type
- object_class
- uncertainties{}
- quality_flags{}
- reference_urls[]
- last_verified_at

Missing values remain null. The UI must render “Not reported” rather than zeros or plausible-looking defaults.

## Cross-match strategy

Use an identity graph rather than one flat table.

Examples:
- IAU proper name -> Gaia source_id -> HIP/HD/TIC identifiers -> exoplanet host
- NED object -> NED cross-IDs -> survey source IDs
- Exoplanet host -> Gaia/2MASS/TIC/HD/HIP cross IDs
- X-ray/radio detection -> known-object association when the source catalog provides it

Coordinate-only cross-matches must retain their match radius and confidence/provenance.

## 3D rendering strategy

Do not create one WebGL mesh per star.

Use:
- GPU point clouds for dense star fields
- HEALPix or hierarchical spatial tiles
- frustum culling
- level-of-detail thresholds
- packed/binary tile formats
- instancing
- billboard labels only for selected/nearby objects
- shader colour from catalog temperature/photometry
- GPU or spatial-index picking

At cosmic scales use a floating origin / high-precision coordinate strategy. At local scales use parsecs/light-years. At Solar-System scales switch coordinate frames and JPL ephemerides rather than stretching one coordinate system across every scale.

## Infinite-zoom behaviour

“Infinite” means continuously navigable scale, not an infinite number of fake objects.

Zoom transitions should progressively change the active data layer:
universe context -> galaxy -> stellar neighbourhood -> star -> planetary system -> planet -> moon / local detail.

Each transition reveals new real catalog records instead of merely enlarging the same polygon.

## Scientific profile panel

Selecting an object should show:
- name / catalog ID
- object type
- distance
- size / radius
- mass
- temperature
- composition when reported
- motion / velocity when available
- discovery / catalog source
- uncertainty
- why the value exists / methodology
- direct source link

The UI must distinguish measured, catalog-derived and model-derived values.

## “Everything ever discovered” limitation

There is no single catalog containing every astronomical object ever detected with complete name, mass, radius, composition and 3D position. Catalogs overlap, describe different wavebands, and often lack particular physical parameters.

The correct implementation is therefore a provenance-aware federation of major catalogs with continuous ingestion, rather than a claim that one finite website file equals “everything in the universe”.

Current scale examples:
- Gaia DR3: 1.811+ billion sources
- NED: 1.108+ billion distinct extragalactic objects
- NASA Exoplanet Archive: 6,360 confirmed planets (3 Sep 2026)
- HEASARC: many mission-specific high-energy catalogs
- GWTC-4.0: 129 listed O4a events

## UX correctness rules

- Never colour a real star arbitrarily pink/blue.
- Never invent a name.
- Never invent mass, radius, temperature or composition.
- Never display a fake discovery count.
- Every scientific value needs provenance.
- “Unknown” is a valid result.
- Cinematic rendering must remain visually distinct from scientific data.
- Nearby objects may use richer 3D models; distant objects should remain catalog-accurate points.
- Deep zoom must increase scientific information instead of filling the scene with decorative shapes.

## Build sequence

Phase 1 — data foundation
- schema
- source registry
- identity graph
- tile format
- ingestion scripts
- validation tests

Phase 2 — Milky Way
- Gaia tile ingestion
- real star colours
- distance and uncertainty handling
- selection + scientific profile

Phase 3 — planetary systems
- NASA Exoplanet Archive ingestion
- host cross-matching
- orbital system view

Phase 4 — Solar System
- JPL Horizons/SBDB
- accurate current positions
- asteroids/comets and mission objects

Phase 5 — deep sky
- NED
- high-energy catalogs
- transient/event layers

Phase 6 — performance
- hierarchical tiles
- caching
- compression
- mobile GPU profiling
- fallback quality modes

Phase 7 — public experience
- NexusNova Labs entry
- educational labels
- source/methodology pages
- accessibility
- privacy-consistent analytics only

## Non-negotiable

A beautiful object that is not traceable to a catalog record must not be represented as a discovered astronomical object.
