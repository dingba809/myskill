# Skill Structure Template

## Recommended directory layout
```text
<skill-name>/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── config-overview.md
    ├── objects-by-topic.md
    ├── recipes.md
    └── troubleshooting.md
```

## How to write SKILL.md
- Keep frontmatter limited to `name` and `description` unless a specific platform needs more.
- Make the description explain when the skill should trigger, not the full workflow.
- In the body, state applicability, exclusions, operating workflow, hard rules, and which reference files to load.
- Keep the body concise and procedural; detailed product knowledge belongs in `references/`.
- Explicitly state whether the skill is for explaining, generating, modifying, troubleshooting, or a mix.

## How to split references
- Split by user question shape, not by blindly mirroring the site's navigation.
- Use an overview file for scope and mental model.
- Use topical object/option files for factual lookups.
- Use recipe files for common construction patterns and sample transformations.
- Use troubleshooting files for conflict points, validation heuristics, and common mistakes.
- Add more files only when they materially improve retrieval and keep each file easy to scan.

## How to design for self-containment
- Copy distilled facts, patterns, and warnings into the skill's own files.
- Treat temporary crawls or captures only as drafting aids.
- Remove runtime references to temporary staging folders, scratch folders, local dumps, or external notebook paths.
- Ensure the skill still works if all build-time captures are deleted.
- Distinguish clearly between official-source facts and your synthesis so later revisions stay trustworthy.

## Metadata constraints
- Put UI metadata in `agents/openai.yaml`.
- Quote string values and keep keys unquoted.
- Keep `short_description` within 25-64 characters.
- Make `default_prompt` short and explicitly mention the invoked skill name with a `$` prefix.
- Regenerate metadata when the skill scope or naming changes.
