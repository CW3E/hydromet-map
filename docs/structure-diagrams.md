# Structure Diagrams

This page gives a visual overview of how the app is organized today.

The diagrams are written in Mermaid so they render on GitHub and stay easy to update as the codebase evolves.

## 1. Top-level app structure

```mermaid
flowchart TD
    A[App.jsx] --> B[appState.js]
    A --> C[mapConfig.js]
    A --> D[MapCanvas.jsx]

    C --> C1[Projects]
    C --> C2[Basemaps]
    C --> C3[Raster Families]
    C --> C4[Layer Definitions]

    D --> E[MapHud.jsx]
    D --> F[MapLegend.jsx]
    D --> G[BookmarkControl.jsx]
    D --> H[GlobeProjectionControl.jsx]
    D --> I[TerrainToggleControl.jsx]
    D --> J[MouseReadout.jsx]
    D --> K[MapContextMenu.jsx]
    D --> L[MapToolOverlays.jsx]
    D --> M[MapToolDialogs.jsx]

    D --> N[Layer Modules]
    N --> N1[src/layers/index.js]
    N1 --> N2[cnrfcPointsLayer.jsx]
    N1 --> N3[b120PointsLayer.jsx]
    N1 --> N4[gradesHydroDlLayer.jsx]
    N1 --> N5[...]

    D --> O[Shared Popups]
    O --> O1[GlobalReachPopup.jsx]
```

## 2. Project-centered organization

```mermaid
flowchart LR
    P[Project]
    P --> P1[availableLayerIds]
    P --> P2[defaultVisibleLayerIds]
    P --> P3[defaultBasemapId]
    P --> P4[defaultTerrainEnabled]
    P --> P5[defaultProjection]
    P --> P6[rasterFamilyId or null]

    P6 --> R[Raster Family]
    R --> R1[variables]
    R --> R2[products]
    R --> R3[ensembles]
    R --> R4[statusUrl]
    R --> R5[default variable override]

    P1 --> L[Reusable Layer Modules]
    L --> L1[vector layers]
    L --> L2[vector tile layers]
    L --> L3[raster overlay layer]
    L --> L4[observation layers]
```

## 3. Runtime state model

```mermaid
flowchart TD
    S[activeProjectId]
    S --> T[projectStateById]

    T --> T1[project A state]
    T --> T2[project B state]
    T --> T3[project C state]

    T1 --> U1[view]
    T1 --> U2[basemapId]
    T1 --> U3[terrainEnabled]
    T1 --> U4[projection]
    T1 --> U5[layers]
    T1 --> U6[raster]

    U6 --> V1[variable]
    U6 --> V2[product]
    U6 --> V3[ensemble]
    U6 --> V4[date]
    U6 --> V5[datetime]
    U6 --> V6[temporalMode]
```

## 4. Rendering and interaction flow

```mermaid
flowchart TD
    A[App.jsx] --> B[Active Project Definition]
    A --> C[Active Project Runtime State]
    B --> D[MapCanvas.jsx]
    C --> D

    D --> E[Filter visible layer modules]
    E --> F[Render layer sources and styles]
    E --> G[Render layer hover/click popups]

    D --> H[MapHud]
    D --> I[MapLegend]
    D --> J[Map tools]

    J --> J1[useMapTools.js]
    J1 --> J2[MapContextMenu.jsx]
    J1 --> J3[MapToolOverlays.jsx]
    J1 --> J4[MapToolDialogs.jsx]
```

## 5. Popup feature hierarchy

```mermaid
flowchart TD
    A[Layer click handler]
    A --> B[selectedStation]
    B --> C[Popup component]

    C --> D[Popup definition / config]
    C --> E[Popup data builder]
    E --> F[Remote sources]

    D --> G[Tabs]
    G --> H[Plots]
    H --> I[Sources]
    H --> J[Series]
    H --> K[Axes]
    H --> L[Layout]
    H --> M[csvDownload config]

    C --> N[PopupCsvDownloadButton]
    N --> O[csvExport.js]
```

## 6. Popup families

```mermaid
flowchart LR
    F[src/features/]
    F --> A[cnrfcPointPopup]
    F --> B[snowStationPopup]
    F --> C[b120PointPopup]
    F --> D[yampaPointPopup]
    F --> E[globalReachPopup]

    A --> A1[config]
    A --> A2[data]
    A --> A3[component]

    B --> B1[config]
    B --> B2[data]
    B --> B3[component]

    C --> C1[config]
    C --> C2[data]
    C --> C3[component]
    C --> C4[table/map renderer]

    D --> D1[config]
    D --> D2[data]
    D --> D3[component]
    D --> D4[table renderer]

    E --> E1[config]
    E --> E2[data]
    E --> E3[component]
    E --> E4[gradesBinaryData.js]
    E --> E5[plotDataSources.js]
```

## 7. Raster family hierarchy

```mermaid
flowchart TD
    A[Raster Family]
    A --> B[statusUrl]
    A --> C[variables]
    A --> D[products]
    A --> E[ensembles]
    A --> F[default dates]

    C --> C1[variable definition]
    C1 --> G[label]
    C1 --> H[timestep]
    C1 --> I[units]
    C1 --> J[palette]
    C1 --> K[buildRasterUrl]
    C1 --> L[extent]
```

## 8. Map tool system

```mermaid
flowchart TD
    A[Right click / long press]
    A --> B[MapContextMenu]
    B --> C[useMapTools.js]

    C --> D[Single API tool]
    C --> E[Combined API tool]
    C --> F[Measure distance]

    D --> G[watershed_api]
    D --> H[upstream_rivers_api]
    D --> I[flowpath_api]

    E --> G
    E --> H
    E --> I

    C --> J[Temporary overlay state]
    J --> K[MapToolOverlays.jsx]
    J --> L[MapToolDialogs.jsx]

    K --> M[Watershed polygon]
    K --> N[Upstream river lines]
    K --> O[Downstream flowpath]
    K --> P[Measurement preview/final line]

    L --> Q[Download GeoJSON]
    L --> R[Add temporary result to map]
```

## 9. Where things live

```mermaid
flowchart LR
    A[src/config/] --> A1[mapConfig.js]
    B[src/components/map/] --> B1[MapCanvas]
    B --> B2[MapHud]
    B --> B3[Map tool components]
    C[src/layers/] --> C1[Layer modules]
    D[src/features/] --> D1[Popup families]
    E[src/lib/] --> E1[CSV parsing]
    E --> E2[Binary range loading]
    E --> E3[CSV export]
    E --> E4[Network helpers]
```

## Reading tips

- Start with diagram 1 if you want the bird's-eye view.
- Use diagrams 2 and 3 to understand how projects and state fit together.
- Use diagrams 5 and 6 when adding or modifying popup families.
- Use diagram 7 when adding a raster family or raster variable.
- Use diagram 8 when adding more context-menu map tools.
