# Project Patterns Reference

Use this reference before adding or changing projects in `hydromet-map`.

## First Search

Search existing examples before choosing a pattern:

- `src/config/mapConfig.js` for project IDs, labels, defaults, layer groups, and map defaults.
- project selector components for how projects appear in the UI.
- bookmark helpers for how project state is serialized and restored.
- layer modules and layer-group config for how layers are assigned to projects.

Useful searches:

- `rg -n "project|projects|projectId|activeProject|defaultProject|Project" src`
- `rg -n "bookmark|serialize|restore|URLSearchParams|query" src`
- `rg -n "defaultView|default.*Layer|basemap|projection|terrain" src/config src/components`

## Project Checklist

1. Choose a stable project ID that is short, lower camel case when matching existing style, and suitable for bookmarks.
2. Add a human-readable label separately from the ID.
3. Define or reuse the default map view: center, zoom, bearing, and pitch.
4. Define or reuse default basemap, projection, and terrain settings when the project model supports them.
5. Assign existing layers and layer families to the project through the current grouping mechanism.
6. Define default visibility for project layers without surprising existing projects.
7. Include any project-specific raster defaults such as variable, product, date, ensemble, opacity, or active family.
8. Decide what should happen to selected popups and hover state when switching to the project.
9. Ensure the project can be loaded from a bookmark and shared URL.

## Layer Assignment

- Prefer assigning layers through existing project/group config instead of hardcoding project checks inside rendering components.
- Keep layer IDs stable across projects when the same dataset appears in more than one project.
- Use project-specific defaults to change visibility or initial selection, not duplicate layer definitions, unless the data source or styling truly differs.
- Check whether legends and raster selectors appear only when relevant layers are available in the active project.

## Project Switching Behavior

When adding or changing a project, verify how switching projects affects:

- selected basemap
- map view
- projection and terrain
- visible layer IDs
- raster family selection state
- selected popup and hover state
- legend content
- URL/bookmark state

Prefer predictable resets for state that is invalid in the new project, and preserve state only when the same layer/family exists in both projects.

## Bookmark Behavior

When project state is bookmarkable:

- Serialize the project ID with a compact, stable key.
- Restore the project before restoring layers, raster selections, or popups that depend on project availability.
- Preserve backward compatibility for older bookmarks that do not include a project key.
- Avoid serializing display labels or derived defaults.

## UI Review

- Confirm the project selector label fits on mobile.
- Check that switching projects does not leave empty control groups visible.
- Confirm project-specific defaults do not cause map controls, legends, or popups to overlap on narrow screens.
- Avoid adding in-app explanatory text unless existing project UI uses it.

## Final Review

Before finishing a project change, verify:

- The new or changed project appears in the selector.
- Its default map view and basemap are correct.
- Expected layer groups and raster controls are available.
- Layers not assigned to the project are hidden or unavailable.
- Bookmark create/load works for the project.
- Existing projects still keep their previous defaults.
