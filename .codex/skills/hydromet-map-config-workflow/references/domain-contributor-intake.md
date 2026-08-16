# Domain Contributor Intake

Use this reference to help meteorologists, hydrologists, data producers, and
other environmental scientists contribute without requiring software or Git
expertise. Treat `CONTRIBUTING.md` and `docs/contributing/` as the human-facing
source of truth.

## Communication

- Begin by saying that code and Git knowledge are not required.
- Accept incomplete ideas, sample files, URLs, screenshots, sketches, and links
  to example maps.
- Ask no more than three short, related questions at a time.
- Use scientific language. Do not ask the contributor to choose source IDs,
  component names, React structure, bookmark keys, or registry locations.
- Explain technical constraints in terms of their effect on the map or data.
- Separate confirmed facts, reasonable implementation choices, and scientific
  assumptions that require approval.

## Minimum Starting Information

Start with what the data represent, a representative sample or documentation,
spatial and temporal coverage, desired presentation, and a scientific contact.
Do not require a complete specification before inspecting available material.

Progressively establish only what the task needs:

- authoritative source, producer, attribution, license, and update cadence
- variables, units, coordinate/grid conventions, and missing-data meaning
- analysis, initialization, valid-time, accumulation, and lead-time semantics
- intended colors, thresholds, labels, default visibility, and map extent
- hover, click, popup, plot, animation, or 3D expectations
- representative normal, quiet, extreme, and missing-data cases
- limitations, uncertainty, and user-facing scientific caveats

Never infer scientific semantics merely from filenames or familiar variable
names. Inspect samples where possible and ask for confirmation when ambiguity
could change the result.

## Implementation Handoff

Translate scientific intent into existing repository patterns without making
the contributor learn those patterns. Reuse nearby projects, layers, families,
popups, legends, and preprocessing tools. Handle code edits, validation, branch
work, and PR preparation when authorized.

Provide the contributor with screenshots or a working preview and a short list
of scientific decisions to verify. Translate CI failures into plain language;
ask the contributor only about failures that require data or scientific input.

## Review Split

Ask the domain reviewer to confirm values, units, terminology, time meaning,
geographic placement, missing-data behavior, colors, thresholds, interactions,
provenance, and caveats. Do not expect them to review source code.

Ask the software maintainer to confirm architecture, compatibility, bookmark
stability, performance, security, automated checks, and maintainability. Record
both review roles in the pull request and credit the domain contributor even
when an agent or maintainer authored the code.

