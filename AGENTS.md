# AGENTS.md

## Purpose

This file provides guidance for coding agents working in this repository. Project goals live in `README.md`; developer documentation lives under `docs/`.

## Working Style

- Prefer small, focused changes that follow existing project patterns.
- Read nearby implementation before adding new abstractions.
- Do not revert unrelated user changes.
- Keep generated URLs, layer IDs, project IDs, and bookmark params stable and backward-compatible when possible.
- Use the project skill `.codex/skills/hydromet-map-config-workflow` for map configuration work involving projects, layers, popups, legends, raster families, or bookmarkable state.

## Validation

- Run `npm run build` after code changes when feasible.
- For documentation-only changes, a build is usually unnecessary.
- When changing map UI behavior, also consider mobile/narrow viewport behavior.

## Project Conventions

- React components use existing local structure and CSS classes before adding new UI patterns.
- Map rendering is based on `react-map-gl` and `maplibre-gl`.
- Time-series plots use Plotly through existing popup components/helpers.
- CSV parsing/export should use existing helpers in `src/lib`.
- Bookmark state should serialize only active, user-visible map or popup state.
