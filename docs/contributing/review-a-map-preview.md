# Review a Map Preview

You do not need to review the source code. Explore the preview as a scientist
and data user.

## Scientific review

- Do the values, units, and terminology look correct?
- Are the data in the correct geographic location?
- Are analysis, initialization, valid, and lead times interpreted correctly?
- Are missing or invalid areas handled honestly?
- Are the colors and thresholds appropriate for the phenomenon?
- Are labels, legends, hover details, and popup plots meaningful?
- Does the default view emphasize the intended region and purpose?
- Are the data producer, provenance, limitations, and caveats accurate?

Try more than one representative date, variable, or forecast time when the data
support them. If possible, include a quiet case, a typical case, and an extreme
case.

## How to give feedback

Plain-language observations are ideal. Screenshots with circles or arrows are
especially helpful. Examples:

- "The timestamp is valid time, not model initialization time."
- "Values below 250 should be gray rather than blue."
- "This gap is expected because the radar does not cover that area."
- "Please show basin name and six-hour accumulation when a user clicks."

When the scientific interpretation and presentation are ready, record your
approval in the pull request. A software maintainer will separately review the
implementation and automated checks.

