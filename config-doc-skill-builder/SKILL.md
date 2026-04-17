---
name: config-doc-skill-builder
description: Use when turning an official configuration documentation site into a reusable self-contained Codex skill for config explanation, generation, editing, or troubleshooting.
---

# Config Doc Skill Builder

## Overview

Use this skill when the user wants a new configuration-oriented skill built from an official documentation site. The goal is to convert a product's official config docs into a reusable local skill with a concise workflow, structured references, and final validation.

This method is for repeatable skill creation, not one-off summaries. Build-time captures may exist, but the finished skill must remain self-contained and must not depend on temporary staging paths at runtime.

## When to Use

Use this skill when:
- the user provides an official configuration documentation entry page or official docs area
- the target skill should explain config objects, generate snippets, modify configs, or troubleshoot behavior
- the source material is structured enough to reorganize into reusable references

Do not use this skill when:
- the source is unofficial, community-only, or mixed with untrusted material
- the task is only a one-time summary instead of a reusable skill
- the site is mostly conceptual marketing or blog content rather than configuration reference

## Workflow

1. Confirm the source is official and suitable for a configuration-focused skill.
2. Gather only the entry page plus the same-site pages needed to cover the target config surface.
3. Preserve provenance while extracting mostly article content instead of navigation noise.
4. Reorganize the gathered material into references shaped by likely user questions, not by copying the site tree.
5. Write `SKILL.md` so it explains applicability, workflow, guardrails, and which references to load.
6. Keep the delivered skill self-contained: build-time captures may help drafting, but runtime instructions must not require any temporary staging folder.
7. Generate `agents/openai.yaml` with valid-length interface fields and a default prompt that explicitly mentions `$config-doc-skill-builder` only if that prompt is about this skill itself; otherwise mention the target skill being built.
8. Validate structure, metadata, and self-containment before reporting completion.

## Hard Rules

- Never invent undocumented fields, objects, syntax, defaults, or behaviors.
- Never turn planning examples into claimed product facts.
- Never rely on temporary capture folders, raw captures, or source dumps at runtime.
- Never treat the documentation sidebar or navigation tree as the final reference structure by default.
- Prefer concise, searchable reference files over long tutorial-style prose.

## What to Read Next

- Read `references/workflow-overview.md` for the end-to-end method and completion criteria.
- Read `references/source-gathering.md` when selecting and capturing same-site official pages.
- Read `references/skill-structure-template.md` when drafting the actual skill layout and metadata.
- Read `references/pitfalls-and-checks.md` before finalizing, especially to avoid prior SmartDNS and sing-box pitfalls.

## Expected Outputs

A completed run should leave:
- one self-contained skill directory for the target product
- a concise `SKILL.md`
- a small set of reusable reference files organized by task/question shape
- valid `agents/openai.yaml`
- verification evidence showing the skill does not depend on temporary capture folders
