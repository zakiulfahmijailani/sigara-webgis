# Map-first episode investigation

This implementation supersedes the previous welcome-page entry flow. The application opens on the NTT map and applies the information-seeking sequence: overview, zoom/filter, then details on demand. Existing queue, summary, evidence catalogue and episode URLs remain available.

## User flow

1. Open `/`: see the NTT archipelago, compact category counts and an optional episode list. No episode or satellite scenario is automatically selected.
2. Select a category to filter both the map and list. Category counts respect the current search, origin district, month and GeoAI availability filters. All categories remain reachable.
3. Click a geographic cluster to zoom. Cluster counts are episode counts, rather than facility counts. The ring shows high/medium/low category composition.
4. Click an origin with several matching episodes to disclose its episode list. A point with one matching episode opens its detail page directly. A facility is not assigned a fraud verdict.
5. Open an episode. The initial tab explains the master category, proxy travel comparison and available evidence. GeoAI, visits and methods are explicit tabs, including keyboard arrow/Home/End navigation.
6. Open GeoAI to inspect that episode's two prepared scenarios. Other demonstration episodes and map layer controls are disclosed on request. Episodes without imagery retain a truthful empty state.
7. Return using “Kembali ke peta NTT”: the URL restores filters, origin selection, list page, panel visibility and camera. Browser back/forward and directly shared URLs are supported.

## Data and performance

- Source categories and IDs are preserved: 3,683 episodes, 364 high, 23 medium and 3,296 low. No new scoring or spatial matching changes the master data.
- Exactly eight episodes have 16 prepared raster illustrations. Availability does not change their master categories.
- The ten episodes with alternatives outside NTT retain their source values; outside alternatives are not drawn as NTT facilities.
- Initial geography and clustering use local GADM boundaries and MapLibre. No external tiles, imagery or visits request is required by the home map.
- HTML markers preserve MapLibre's positioning classes and aggregate source episode totals. They support keyboard activation and textual counts/category composition.
- A lightweight SVG map and episode list remain available when WebGL fails.
- A five-minute client promise cache shares the validated snapshot across home, queue and detail navigation. Failed requests clear the cache and can be retried.
- Filtering and camera changes use synchronous same-page URL updates to avoid filter/camera navigation races.
- Reference facilities start hidden on focused episode maps. A style revision re-applies dynamic sources, overlays and visibility after a basemap style change.
- No new runtime package, paid service, live LLM call or fabricated detection was added.

## Verification

Run from the project directory with dependencies installed:

```sh
npm run typecheck
npm test
npm run build
npm run start -- --hostname 127.0.0.1 --port 3107
```

The browser regression script uses an installed Playwright package and Google Chrome. It can use Playwright from another directory through `PLAYWRIGHT_MODULE`; it does not add a production dependency.

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\path\to\node_modules\playwright'
$env:SIGARA_TEST_URL = 'http://127.0.0.1:3107'
node scripts/test-map-ux.cjs
```

Set `BROWSER_CHANNEL` if another supported browser channel is needed. Screenshots are written to ignored `test-results/map-first/`.

The script covers category totals and map aggregation, district selection, point-to-episode navigation, camera/filter return, shared snapshot reuse, evidence/visits on demand, keyboard tabs, browser history, empty search results, list visibility, 1366×900 / 1366×768 / 850×900 / 390×844 viewports, retry after network failure and WebGL fallback. The unit suite verifies the existing data invariants, aggregation, combined filters, GeoAI availability and URL round trips.

## Design references

- [Shneiderman, The Eyes Have It (1996)](https://hci.stanford.edu/courses/cs448b/papers/shneiderman96eyes.pdf)
- [Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Microsoft, Master/detail pattern](https://blogs.windows.com/windowsdeveloper/2017/05/01/master-master-detail-pattern/)
