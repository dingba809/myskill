# Source Gathering for Config-Doc Skills

## Choose the entry page
- Start with the official configuration landing page, configuration overview, or top-level reference index.
- Prefer pages that expose the product's config taxonomy, such as object categories, basic configuration, routing sections, or option indexes.
- Avoid starting from blog posts, release notes, or community mirrors unless the user explicitly asks for those and understands the trade-off.

## Select same-site pages deliberately
- Expand from the entry page to the smallest set of same-site pages that covers the target skill scope.
- Favor pages that define real config objects, fields, examples, defaults, and behavioral notes.
- Skip pages that are mostly navigation chrome, repetitive installation steps, or unrelated product areas.
- Do not stop at only one overview page if the product's real config surface lives on deeper object pages.
- Do not crawl the entire site by default; stop when additional pages add little new configuration information.

## Capture page content with provenance
- Record the source URL for every captured page.
- Prefer extracting article or main content so headings and option descriptions remain visible.
- Keep enough structure to trace a statement back to a heading or object section.
- Distinguish between direct facts from the source and your later synthesis.
- If capture quality is noisy, refine the extraction method before drafting references.

## Separate build-time captures from runtime references
- Treat raw captures as build-time drafting material only.
- Distill the final knowledge into files under the target skill directory, usually in `references/`.
- Never require the finished skill to read from temporary staging folders, ad hoc dump folders, or outside-the-skill scratch files.
- If temporary captures are worth keeping for human inspection, keep them outside the finished skill's runtime instructions.

## Stop conditions
- Stop gathering when the selected page set clearly covers the target config tasks.
- Stop if later pages mostly repeat earlier material or only add UI/navigation text.
- Stop and reassess if the source turns out not to be official or not to contain the needed configuration detail.
- Stop before drafting references if provenance is missing or page extraction quality is too poor to trust.
