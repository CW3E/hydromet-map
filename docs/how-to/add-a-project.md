# How To Add a Project

This guide explains how to create a new project, choose its layers, attach a layer family, and customize its default map behavior.

## 1. Decide what the project should represent

A project is a named map experience.

It decides:

- which layers are available
- which layers are visible by default
- what order the layers appear in the toggle list
- whether a layer family is active
- the default basemap, projection, terrain, and extent

Use a new project when you want a clearly different experience, for example:

- a different region
- a different audience
- a different layer family
- a different default view or map behavior

## 2. Add the project definition to `mapConfig.js`

Edit:

- [src/config/mapConfig.js](../../src/config/mapConfig.js)

Add a new entry to `PROJECTS`.

Typical shape:

```js
myProject: {
  id: 'myProject',
  label: 'My Project',
  documentTitle: 'My Project Map',
  layerFamilyId: 'cnrfc',
  defaultFamily: {
    variable: 'soilMoistureDaily',
  },
  defaultView: {
    center: '-119,38',
    zoom: '5.5',
    bearing: '0',
    pitch: '0',
  },
  defaultBasemapId: 'terrain',
  defaultTerrainEnabled: true,
  defaultProjection: 'mercator',
  logoUrl: 'https://example.com/logo.png',
  logoAlt: 'Example organization logo',
  logoHref: 'https://example.com',
  availableLayerIds: [
    'cnrfcRaster',
    'cnrfcRegion',
    'cnrfcRivers',
    'cnrfcPoints',
  ],
  defaultVisibleLayerIds: [
    'cnrfcRaster',
    'cnrfcRegion',
    'cnrfcPoints',
  ],
}
```

## 3. Choose the layer family

Set:

- `layerFamilyId`

to:

- a family id such as `cnrfc` or `ucrb`
- or leave it unset/null for a no-family project

Use no family when the project is:

- inspection-focused
- not driven by raster/date/product selectors
- mostly static layers

Current example:

- `global`

## 4. Choose the layers

Define:

- `availableLayerIds`
- `defaultVisibleLayerIds`

Important:

- `availableLayerIds` controls toggle-list order
- the layer registry order in [src/layers/index.js](../../src/layers/index.js) controls render order

So project customization usually happens in two places:

1. project config for membership and toggle order
2. layer registry order for rendering

## 5. Set project-specific family defaults if needed

If the project reuses an existing family but wants a different starting variable or product, set:

- `defaultFamily`

Current examples:

- `cnrfc` defaults to `soilMoistureDaily`
- `b120` defaults to `sweDaily`
- `yampa` defaults to `sweDaily`

This is a very useful override point because it lets one family serve multiple projects cleanly.

## 6. Customize the map behavior

Optional project-level defaults include:

- `defaultView`
- `defaultBasemapId`
- `defaultTerrainEnabled`
- `defaultProjection`

Examples already in the app:

- `global` defaults to:
  - `terrain`
  - terrain enabled
  - `globe`
- `b120` and `yampa` use custom extents

## 7. Add optional project branding

Project-level branding is optional. Add these fields only when a project needs them:

- `documentTitle` changes the browser tab title when the project is active.
- `logoUrl` displays a logo in the lower-right corner of the map.
- `logoAlt` provides accessible text and the browser hover tooltip.
- `logoHref` makes the logo clickable.

If `logoUrl` is not set, no logo is shown.

## 8. Verify project selector behavior

Projects automatically appear in the project selector because:

- `PROJECT_OPTIONS` is derived from `PROJECTS`

No separate registration is needed.

## 9. Remember the per-project state model

Each project gets its own runtime state in:

```js
projectStateById[projectId]
```

That means users can switch between projects without losing:

- layer visibility
- view extent
- basemap
- terrain
- projection
- family state

This is one of the biggest advantages of the current architecture.

## 10. Test checklist

After adding a project, test:

- it appears in the project selector
- the correct layers show in the toggle list
- layer order is correct
- default visible layers are correct
- the intended family selectors appear or do not appear
- default basemap, terrain, and projection are correct
- project title and logo appear only where intended
- bookmarks restore the project correctly
- switching away and back preserves project-specific state

## Recommended examples to copy

- family-driven regional project:
  - `cnrfc`
- family-driven project with reused family but different layer set:
  - `b120`
- family-driven project on a different domain:
  - `yampa`
- no-family global inspection project:
  - `global`
