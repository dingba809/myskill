# Workflow Overview

## When this method applies
- The user wants a reusable local skill, not just a one-off summary.
- The source material is an official documentation area for a product's configuration surface.
- The target skill should answer config questions such as what an option means, how to generate a snippet, how to revise an existing config, or how to debug a misbehavior.
- The docs are structured enough that a small curated page set can cover the product's main config concepts.

## End-to-end workflow
1. Confirm the source is official, configuration-focused, and stable enough to serve as the primary authority.
2. Define the target skill scope: explanation, generation, modification, troubleshooting, or a combination.
3. Start from one entry page, then select only the same-site pages needed to cover the target config surface.
4. Capture page content with source provenance, aiming to preserve headings and article text while minimizing navigation noise.
5. Review captures and identify the product concepts users will likely ask about.
6. Reorganize the material into task-oriented reference files instead of mirroring the website structure.
7. Draft a concise `SKILL.md` that states when the skill applies, which references to load, and which guardrails must never be violated.
8. Generate `agents/openai.yaml` with interface fields that satisfy generator constraints.
9. Validate the skill structure and check that runtime instructions do not depend on temporary captures or external staging files.
10. Report the resulting skill, its main references, and the verification evidence.

## Required intermediate outputs
- A short source suitability judgment describing why the official docs are sufficient.
- A small captured-page set with URLs or other provenance retained.
- A concept map or outline of the key config areas that users will ask about.
- A planned reference split showing which file answers which kind of question.
- A completed `SKILL.md` with applicability, workflow, and guardrails.
- A generated `agents/openai.yaml`.
- Validation output plus a self-containment check.

## Definition of done
- The skill can be used without reopening build-time capture folders.
- The skill does not claim undocumented fields, syntax, or defaults as facts.
- The references are organized for retrieval by user task or question shape.
- The skill includes only the files needed for future use and discovery.
- Metadata passes generator and validator checks.
- Final verification shows no runtime references to temporary capture folders, source dumps, or equivalent temporary paths.
