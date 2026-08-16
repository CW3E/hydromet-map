# Contributing to Hydromet Map

Thank you for sharing your expertise. You do not need to write code, understand
Git, or know how the map application is built to contribute.

## I work with weather, water, or environmental data

Start with [Share your data](docs/contributing/share-your-data.md). Tell us what
the data mean, provide a sample if possible, and describe how people should see
or explore them. An AI agent or software maintainer can prepare the code and
technical checks. Your most important role is confirming that the result is
scientifically correct and useful.

Incomplete ideas are welcome. A URL, sample file, screenshot, sketch, or link to
another visualization is enough to begin a conversation.

## I want to work with an AI coding agent

Ask the agent in ordinary scientific language. For example:

> Add our hourly watershed precipitation estimates to the CNRFC project. Here
> is a sample file and the color scale we normally use.

The repository includes the `hydromet-map-config-workflow` skill. It guides an
agent through the local architecture, asks for missing scientific information,
implements the change, runs checks, and summarizes what still needs domain
review. You should not need to choose source IDs, React components, or bookmark
parameters.

## I want to edit the repository directly

See [Direct code contributions](docs/contributing/direct-code-contribution.md).
The existing [developer how-to guides](docs/how-to/README.md) explain the map's
project, layer, popup, raster, and particle-tracer patterns. GitHub Desktop is a
reasonable alternative to command-line Git.

## How changes are approved

Map changes have two kinds of review:

- A domain contributor confirms the interpretation, units, time meaning,
  geographic placement, colors, labels, interactions, provenance, and caveats.
- A software maintainer confirms architecture, compatibility, performance,
  automated checks, and maintainability.

One person may fill both roles, but domain contributors are not expected to
review application code or diagnose build systems.

