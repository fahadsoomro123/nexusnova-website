# NEXUSNOVA INFINITE LAB — FLAGSHIP MASTER EXECUTION PROMPT

MISSION
Build the definitive NexusNova Infinite Lab around: “Zoom into one world and discover another world inside it, again and again.”
Combine a REAL OBSERVATIONAL/CATALOG LAYER with a PROCEDURAL INFINITE LAYER. Never present procedural content as measured astronomy, and never present a finite catalog subset as the entire observable universe.

OBSERVABLE-UNIVERSE REQUIREMENT
Interpret “the whole observable universe” as a navigable 3D cosmological coordinate space covering the accessible public catalog/survey domain, using progressive level-of-detail, spatial tiling and on-demand querying. Do not attempt to ship billions of catalog rows to the browser.
Every factual layer must expose source, release/version, coverage and uncertainty context. Use real records where available; clearly mark survey/catalog coverage boundaries; use procedural continuation only beyond measured/catalog-backed coverage.

PRIORITY PUBLIC DATA ADAPTERS
- ESA Gaia catalog/data archive for stellar astrometry, photometry and related public data products.
- NASA Exoplanet Archive for confirmed planets and published stellar/planetary parameters.
- NASA/IPAC NED for extragalactic objects, redshifts, distances, cross-identifications and references.
- SDSS public data releases / SkyServer for imaging, spectra, galaxies, quasars and stellar survey layers.
- DESI public releases for spectroscopic targets, redshifts and large-scale-structure catalogs.
Use official/public access methods, TAP/IVOA-style constrained queries where available, and respect rate limits, licenses and acknowledgments.

3D RENDERING ARCHITECTURE
Use WebGL/WebGL2 as the primary renderer. Implement hierarchical/logarithmic distance scaling, stable camera transforms, LOD, culling, progressive loading, spatial tiling, high-DPI handling, adaptive GPU quality, and floating-point-safe deep recentering/rebasing.
Do not fake a central 3D requirement with only a 2D canvas.

WORLDS-WITHIN-WORLDS
At every scale show depth, scale, coordinates and whether content is catalog-backed, survey-derived or procedural.
Every layer has a visible gateway/core into the next layer. Descending must create a real transition and a new deterministic world identity rather than simply magnifying the same image.

REAL-DATA OBJECT INSPECTOR
Expose canonical name/identifier, source/catalog, RA/Dec, distance and uncertainty where provided, redshift where available, class, photometric/spectral properties where available, release/version, provenance, timestamp and source link. Missing values must say “not reported”, never guessed values.

3D OBJECT INSPECTOR
Provide physically-inspired 3D views for stars, planets, galaxies, nebulae, black holes/accretion-disk concepts and other supported classes. Generated surface/material detail must be clearly labelled as visualization, never as telescope imagery unless it is actually sourced imagery.

INTERACTION REQUIREMENTS
Orbit/drag, pan, wheel zoom, pinch zoom, double-tap/double-click dive, click/tap gateway, keyboard controls, reset, Surprise Me, object selection, focus/return, back by scale/depth, smooth transitions, loading state, error state and zero dead controls.

DISCOVERY SYSTEM
Browser-local only, bounded storage, deterministic IDs, source-aware records. No fake global counters, fake leaderboards or fabricated discovery statistics.

ORIENTATION
Depth HUD, physical/logarithmic scale, RA/Dec or current coordinates, orientation indicator, minimap/local field overview, selected-object marker, where-am-I control and jump-back-by-depth controls.

VISUAL QUALITY
Cinematic lighting, multi-scale depth, readable stars and structures, atmospheric transitions, restrained HUD, strong typography, mobile-first controls and polished state transitions. Avoid toy/demo aesthetics.

PERFORMANCE
Never render the whole catalog at once. Stream visible data only, cache bounded tiles, cancel stale requests, reduce density under load, cap DPR, handle API failures/rate limits gracefully, and keep interaction usable on mid-range mobile hardware.

ACCESSIBILITY
Keyboard navigation, visible focus states, ARIA labels/live status, reduced-motion mode, readable contrast and touch-safe target sizes.

SEO / TRUTHFULNESS
Clearly state that the Lab is a visualization/exploration system; factual object layers are source-backed; illustrative/procedural layers are not observations; catalog incompleteness and measurement uncertainty are normal. Keep Infinite Lab experiment boundaries distinct from Universe Atlas and avoid canonical SEO claims of completeness.

INTEGRATION
Preserve Universe Atlas, LIVE tools, navigation, authentication and unrelated production systems. Do not delete useful existing functionality.

QA GATE
Create at least 50 meaningful tests covering 3D renderer startup, WebGL fallback, camera controls, wheel/pinch/touch, double-tap, deep rebase, deterministic seeds, LOD/culling, tile loading/caching, provenance, missing-value handling, selection/inspector, object classes, minimap/orientation, discovery persistence, Surprise Me, keyboard/accessibility, reduced motion, adaptive performance, request cancellation, network/API/rate-limit failures, no-fake-data safeguards, SEO boundaries, mobile/desktop behavior and regression against Universe Atlas/Labs.
For every failure: identify root cause -> fix -> rerun failed check -> rerun relevant regression suite.

LIVE VERIFICATION
Keep the owner updated at major phase boundaries. Show real preview URLs or verified interactive preview methods. Never fabricate screenshots, URLs, CI results, deployments or completion claims.

APPROVAL GATE
Keep work on the feature branch. Never merge/publish to main until the owner explicitly approves the final verified build.
Only after every required gate is actually PASS may the final status be: READY FOR OWNER APPROVAL.