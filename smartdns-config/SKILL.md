---
name: smartdns-config
description: Explain SmartDNS configuration, generate or modify smartdns.conf snippets, and troubleshoot SmartDNS option interactions using official SmartDNS documentation. Use when Codex needs to answer what a SmartDNS config option does, produce SmartDNS configuration for home router or operations scenarios, revise an existing SmartDNS config, or diagnose why SmartDNS behavior does not match the intended result.
---

# SmartDNS Configuration Assistant

Use this skill when working with SmartDNS configuration semantics, recipe generation, config review, or troubleshooting.

## Workflow

1. Classify the request as explanation, generation, modification, or troubleshooting.
2. Read `references/config-overview.md` first for overall framing.
3. Read `references/options-by-topic.md` when the request depends on specific options or syntax.
4. Read `references/recipes.md` when the user wants a starter config or scenario-based snippet.
5. Read `references/troubleshooting.md` when the user reports broken behavior, unexpected DNS results, or conflicting settings.
6. Base answers on official SmartDNS documentation first. If a request depends on version-specific behavior, state that the user should verify against their installed SmartDNS version.

## Response rules

- Start with the conclusion.
- For generation or modification requests, output the config snippet before the explanation.
- State assumptions explicitly: listening port, upstream addresses, certificates, runtime environment, router distro, or file paths.
- Avoid unrelated options; include only settings that support the stated goal.
- When reviewing an existing config, point out concrete risks such as invalid syntax, conflicting goals, unreachable upstream servers, or settings that can start successfully but behave unexpectedly.
- If information is missing, list the missing inputs and then provide a conservative default example.

## Common task patterns

### Explain an option
- Identify the exact directive.
- Summarize its effect, syntax shape, common use cases, and caveats.
- Mention related directives if the option is usually used in combination.

### Generate a config
- Extract the user goal.
- Map the goal to SmartDNS capability groups: listener, upstreams, cache, speed check, rules, logs.
- Produce the smallest working snippet that satisfies the goal.
- Call out values the user must replace.

### Modify a config
- Preserve the existing intent.
- Show only the lines to add, remove, or replace unless the user asks for a full file.
- Explain why each change is needed.

### Troubleshoot behavior
- Check syntax, scope, upstream reachability, listener bindings, and rule interactions.
- Distinguish between startup failure and "starts but does the wrong thing" scenarios.
- Recommend verification steps when runtime evidence is needed.
