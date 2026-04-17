---
name: sing-box-config
description: Explain sing-box configuration objects, generate or modify sing-box JSON configs, and troubleshoot sing-box routing, DNS, tag, detour, selector, rule-set, and TUN behavior using official sing-box configuration documentation. Use when Codex needs to interpret sing-box config structure, produce sing-box config snippets, revise an existing sing-box config, or diagnose why sing-box behavior does not match the intended result.
---

# sing-box Configuration Assistant

Use this skill when working with sing-box configuration semantics, object relationships, recipe generation, config review, or troubleshooting.

## Workflow

1. Classify the request as explanation, generation, modification, or troubleshooting.
2. Read `references/config-overview.md` first for the overall configuration model and dependency chain.
3. Read `references/objects-by-topic.md` when the request depends on specific objects, fields, tags, or reference relationships.
4. Read `references/recipes.md` when the user wants a starter config, a pattern template, or a minimal reproducible example.
5. Read `references/troubleshooting.md` when the user reports startup failures, tag mismatches, route issues, DNS surprises, or TUN/platform problems.
6. Base answers on bundled official sing-box references first. If a field is version-sensitive or experimental, explicitly tell the user to verify it against their installed sing-box version.

## Response rules

- Start with the conclusion.
- For generation or modification requests, output the config snippet before the explanation.
- State assumptions explicitly: sing-box version, platform, protocol family, TUN availability, rule-set source, or management API expectations.
- Output the smallest object set that satisfies the stated goal; do not dump unrelated objects.
- When reviewing an existing config, point out concrete risks such as missing tags, unresolved detours, selector members that do not exist, route targets that do not line up, or platform-specific fields used in the wrong environment.
- If information is missing, list the missing inputs first and then provide a conservative default example.

## Common task patterns

### Explain an object or field
- Identify the exact object, sub-object, or field.
- Summarize what it controls, what it depends on, and what commonly references it.
- Mention version-sensitive or experimental caveats when the official docs call them out.

### Generate a config
- Extract the user goal.
- Map it to the minimum needed object set: usually some combination of `log`, `dns`, `inbounds`, `outbounds`, `route`, `rule_set`, and `experimental`.
- Produce valid JSON with concrete placeholder values the user can replace.
- Call out every tag, host, credential, path, or rule-set source the user must customize.

### Modify a config
- Preserve the existing intent.
- Show only the objects or fields to add, replace, or remove unless the user asks for a full file.
- Explain how the changed object affects tag references, route logic, selector membership, or DNS behavior.

### Troubleshoot behavior
- Check JSON structure first, then object references (`tag`, `detour`, `selector`, `route`, `rule_set`), then DNS and routing behavior, then TUN or platform-specific features.
- Distinguish “starts but behaves incorrectly” from “fails to start.”
- Ask for logs, a minimal failing config fragment, and one concrete failing domain or route path when runtime evidence is needed.
