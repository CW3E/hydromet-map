# Layer Patterns Reference

## Naming

- Use stable lower camel case IDs when matching existing config style.
- Keep display labels human-readable and separate from IDs.
- Prefer source IDs and layer IDs that encode the owning family or dataset enough to avoid collisions.
- Keep raster dimension values URL-safe because they may be serialized into bookmarks.

## Config Organization

When adding config, first look for existing structures for:

- basemap styles
- layer groups or layer families
- source definitions
- MapLibre layer definitions
- raster source templates
- variable/product/date/ensemble selector options
- legends or colormaps
- hover/click property mappings
- bookmark serialization defaults

Follow the nearest matching structure rather than creating a parallel format.

## Rendering Style

For vector fills, lines, circles, and symbols:

- Match opacity and stroke conventions from sibling layers.
- Use data-driven styling only when it supports a real variable or category.
- Keep labels legible on all supported basemaps.
- Prefer explicit min/max zooms for dense layers.

For raster overlays:

- Confirm whether tiles are already colorized or need client-side color mapping.
- Keep opacity controllable if neighboring raster overlays support it.
- Ensure `raster-fade-duration` and tile size match sibling raster layers unless there is a reason to differ.

## Interaction Review

Before adding a new hover/click pathway, answer:

- Which map layer IDs are interactive?
- Which source feature properties are required?
- What should be displayed immediately in hover info?
- Does click open a static info popup, fetch remote CSV time series, or both?
- What happens when required properties are missing?
- Does the behavior work when multiple interactive layers overlap?

## Raster Family Review

For a raster family, define:

- family ID
- default variable
- variable options and labels
- default product
- product options and labels
- date range or date source
- default ensemble trace if applicable
- URL template or URL builder inputs
- colormap/legend per variable
- bookmark keys and defaults
- UI placement and mobile behavior

## Pull Request / Final Response Notes

When summarizing a layer change, mention:

- files touched
- source/layer/family IDs added or changed
- UI controls affected
- interaction behavior affected
- bookmark or legend behavior affected
- validation command run, or why it could not be run
