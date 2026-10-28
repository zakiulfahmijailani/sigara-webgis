# Map-first episode investigation

This implementation provides a progressive disclosure map interface for SIGARA. The application opens on the NTT overview map and applies the visual information-seeking sequence: overview first, zoom and filter, then journey line relationships and details on demand.

## User flow

1. **Overview (Zoom jauh):** Open `/` to see the NTT archipelago with compact category counts and cluster summary markers. Numbers represent unique referral episodes (not facility counts or total visits), with conic-gradient rings showing simulation category composition (Tinggi, Sedang, Rendah). No thousands of lines clutter the initial view.
2. **Category & regional filters:** Filter by category, district of origin, month, query, or GeoAI availability. Filtered episode counts and category composition dynamically update the map markers, lines, and episode list in sync.
3. **Cluster click (Zoom & fokus):** Clicking a cluster marker calculates the spatial bounding box of its member facilities or expansion zoom. The camera zooms in smoothly to disclose member clusters/facilities, accounting for the sidebar panel padding on desktop and bottom sheet on mobile.
4. **Origin click (Mode garis rujukan):** Clicking an origin facility marker focuses the camera on that origin at detail zoom (>= 10.5) and transitions to line mode. All directed referral journey lines (*garis asal–tujuan / proksi perjalanan*) radiating from this origin to destination facilities are rendered via WebGL. Even for single-episode origins, the user stays on the map to explore the journey first instead of being abruptly redirected.
5. **Detail zoom (Zoom detail):** When zoomed in (>= 8.0) or when an origin is focused, journey lines become the primary visual object. Origins and destinations act as endpoint pins. Multiple episodes sharing the same directed pair are deterministically aggregated, with line thickness indicating volume within safe limits (2.6px to 5.6px) and neutral representation for mixed-category routes.
6. **Line selection & route inspection:** Clicking a journey line highlights it with a halo and opens a floating summary card displaying:
   - Title: *Garis asal–tujuan / proksi perjalanan*
   - Origin and Destination facility names
   - Episode volume and breakdown (tinggi / sedang / rendah)
   - Proxy distance and proxy travel time
   - Action: **"Lihat hubungan lengkap"** (fits camera bounds to view both origin and destination comfortably)
   - Action: **"Buka telaah episode"** (for single episodes) or filtering the sidebar list to inspect individual episodes before opening.
   - Intersecting lines provide a candidate picker to choose the intended route cleanly.
7. **Reset view:** Clicking the "Tampilkan seluruh NTT" crosshair button smoothly restores the camera to province-wide bounds and clears origin/line focus back to summary mode, while preserving active category, district, month, and query filters.
8. **Episode investigation detail:** Opening an episode presents the case summary, proxy travel comparison, GeoAI evidence viewer, visits table, and methods. Clicking "Kembali ke peta NTT" restores the exact camera, filters, origin, line, page, and list state from the URL.

## Line Definition & Data Integrity

- **Garis asal–tujuan / proksi perjalanan:** Geometries connecting origin to destination facilities are straight line proxi-journey representations based on valid coordinates. They are explicitly not claimed as actual physical road tracks, Dijkstra paths, GPS breadcrumbs, or ferry sailings.
- **Data invariants:** Snapshot numbers are strictly preserved: 3,683 unique episodes (364 high, 23 medium, 3,296 low), 10,776 visits, 185 unique origins, 8 GeoAI demonstration episodes with 16 raster overlays, and 10 episodes with nearest alternatives outside NTT. Alternative facilities are never drawn as primary journey lines.
- **Defensive handling:** Null, missing, zero coordinates `[0,0]`, or identical origin-destination coordinates are safely excluded from line generation without breaking aggregation or crashing WebGL.

## Verification

Run checks from the project directory:

```sh
npm run typecheck
npm test
npm run build
```

Run the built application and automated browser test:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\Users\zakiu\AppData\Local\npm-cache\_npx\e41f203b7505f1fb\node_modules\playwright'
$env:SIGARA_TEST_URL = 'http://127.0.0.1:3107'
node scripts/test-map-ux.cjs
```

The browser test suite verifies:
1. Far zoom overview with 3,683 episodes and category breakdown
2. Cluster click camera zoom increase (`zoomBefore` 6.589 → `zoomAfter` 10.182, path remains `/`)
3. Reset camera zoom back to province view (zoom <= 6.8)
4. Multi-episode origin click zoom to detail (zoom >= 10.5) and rendering of journey lines in WebGL
5. Selection of journey lines with floating card, category badges, proxy distance/time, and "Lihat hubungan lengkap" bounds fit
6. Single-episode origin click retaining user on map `/` with journey line rendered and explicit open action
7. Category and district filtering consistency
8. GeoAI evidence tabs, visits table, and keyboard navigation
9. Empty search state and list drawer toggle
10. Responsive viewports: desktop 1366×900, 1366×768, tablet 850×900, and mobile 390×844
11. Network retry on fetch failure
12. Truthful SVG fallback when WebGL is unavailable

Screenshots are recorded in `test-results/map-first/`:
- `01-home-desktop.png`: Overview NTT at far zoom
- `01b-post-cluster-click.png`: Region detail after cluster click
- `01c-detail-journey-lines.png`: Origin focus with radiating referral lines and destination pins
- `01d-single-origin-focused.png`: Single-episode origin focused on map with explicit action
- `01e-selected-line-card.png`: Selected journey line with floating route card
- `03-episode-summary.png`: Episode summary detail view
- `04-episode-evidence.png`: GeoAI evidence view
- `05-home-1366.png`, `05-home-850.png`, `05-home-390.png`: Responsive viewports
