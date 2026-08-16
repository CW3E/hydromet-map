# Share Your Data or Visualization Idea

You can propose a layer or project without editing the repository. A short
description and a sample are enough to start.

## Start with five questions

1. What do the data represent?
2. Where can we find a representative sample or documentation?
3. What region and time period do they cover?
4. How would you like people to see or explore them?
5. Who can confirm that the finished display is scientifically correct?

If you do not know every answer, say so. An AI agent or maintainer can inspect
the sample and ask a few follow-up questions at a time.

Useful material can include:

- a public URL or attached sample file
- a screenshot, hand-drawn sketch, or example map
- the units, standard color scale, or important thresholds
- an explanation of analysis time, valid time, forecast initialization, or lead
  time
- missing-data conventions
- fields people should see when they hover or click
- source attribution, update frequency, limitations, and scientific caveats

## What happens next

1. An agent or maintainer summarizes the request and flags any assumptions.
2. They prepare an implementation on a separate branch.
3. Automated checks verify the application structure and build.
4. You receive screenshots or a working preview.
5. You review the science and presentation using the
   [preview checklist](./review-a-map-preview.md).
6. A software maintainer reviews the implementation and merges it.

The technical workflow should remain mostly behind the scenes. If a build or
test fails, the agent or maintainer is responsible for translating that result
and asking you only about scientific or data questions.

