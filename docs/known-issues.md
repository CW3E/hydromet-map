# Known Issues

## Global hydrography layers on terrain-capable basemaps with terrain turned off

Affected area:

- project: `global`
- layers: `GRADES-hydroDL (v2.0)` and `SWORD Reaches (v17b)`

Current behavior:

- after clicking one of these line layers, map dragging can occasionally freeze or fail to respond when:
  - projection is `globe`
  - basemap is `Terrain` or `Satellite`
  - terrain is switched off
- the issue may also cause an open global-reach popup to close unexpectedly during or after the failed drag
- on mobile devices, the same area of the app can become sticky or sluggish when both `globe` projection and terrain are enabled, even if the desktop-style popup-close symptom does not appear

What we know:

- the issue is not simply "globe projection everywhere"
- it does not show up the same way on the `Flat` basemap
- it becomes much better or disappears when terrain is turned back on for `Terrain` / `Satellite`
- mobile devices may show the same underlying stress differently, as touch lag or sticky map interaction rather than a desktop mouse-down / popup-close glitch
- multiple debugging passes suggest the remaining problem is not primarily caused by popup content, Plotly, or binary data loading
- the issue appears to be tied to the globe-projection interaction path for these global line layers

Recommended workaround:

- when working in the `global` project with `globe` projection, keep terrain enabled on the `Terrain` basemap
- alternatively, switch to the `Flat` basemap or to `mercator` projection if needed
- on mobile devices, if interaction feels sticky, prefer `Flat` or `mercator` over `globe + terrain`

Practical guidance:

1. Open the `global` project.
2. If you use `Terrain` or `Satellite`, keep terrain switched on.
3. If drag behavior becomes unstable, switch to `Flat` or switch projection to `mercator`.
4. On mobile, if touch interaction feels sticky, also avoid the `globe + terrain` combination when smooth navigation matters more than 3D appearance.
5. Continue normal browsing, clicking, and dragging after that adjustment.

Status:

- known issue
- acceptable for now
- worth revisiting later if globe interaction becomes a higher priority for the `global` project
