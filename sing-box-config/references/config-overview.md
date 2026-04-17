# sing-box Config Overview

## What sing-box is doing in a deployment
- sing-box uses a JSON configuration file to connect local traffic sources (`inbounds`) to outbound network behavior (`outbounds`) through DNS, routing, and optional experimental features.
- The top-level configuration page shows that a deployment is usually built from a small number of root objects: `log`, `dns`, `inbounds`, `outbounds`, `route`, and `experimental`, with additional optional objects such as `ntp`, `certificate`, `certificate_providers`, `endpoints`, and `services`.
- sing-box behavior is heavily reference-driven: many objects point to other objects by `tag`, and route or DNS decisions often depend on those references being closed correctly.
- In practice, most user questions reduce to one of four dependency chains: logging/runtime framing, DNS selection, inbound-to-outbound flow, or route/rule-set matching.

## How to read a sing-box config
1. `log` — confirm how much runtime evidence the config can produce and whether output is disabled, redirected, or timestamped.
2. `dns` — identify default DNS server tags, DNS rules, server definitions, cache-related behavior, and any fake IP or client subnet features.
3. `inbounds` / `outbounds` — identify where traffic enters, what protocols are exposed, what outbound tags exist, and which outbounds are selectable or test-driven.
4. `route` / `rule-set` — identify how domains, IPs, processes, or network conditions are matched and which outbound or action they ultimately select.
5. `experimental` and platform-dependent pieces — identify features that are version-sensitive, optional, or closely tied to platform/runtime support, such as cache file behavior or management APIs.

## Main capability groups

### Logging and runtime framing
- `log` determines whether troubleshooting is even possible: `disabled`, `level`, `output`, and `timestamp` control visibility into startup and runtime behavior.
- This group supports user goals such as “why does it fail to start?” or “which path handled the request?”
- The main trade-off is observability versus noise: higher log verbosity improves diagnosis but increases output volume.

### DNS and name-resolution behavior
- `dns` defines server objects, DNS rules, default server selection, cache behavior, domain strategy, fake IP support, and client subnet behavior.
- This group supports goals such as DNS split behavior, default resolver choice, and DNS-driven routing consistency.
- The main dependency is tag alignment: DNS rules often choose server tags, and the selected DNS result affects later route decisions.

### Inbounds and outbounds
- `inbounds` define how traffic enters sing-box; `outbounds` define where it leaves and can include direct, protocol-specific, selector, and URLTest patterns.
- This group supports common proxy deployment goals such as local SOCKS/HTTP exposure, TUN interception, VMess egress, and manual or automatic outbound selection.
- The main dependency is reference correctness: selector and URLTest objects must point to existing outbound tags, and some outbound or inbound types are platform-sensitive.

### Route, rules, and rule-set relationships
- `route` controls match-based behavior with `rules`, `rule_set`, `final`, interface detection, and network strategy fields; `rule-set` supplies reusable rule content.
- This group supports domain/IP/process-based traffic steering, final fallback behavior, and reusable rule imports.
- The main trade-offs are complexity and scope: once route rules, DNS rules, and rule sets all interact, “wrong behavior” is often caused by reference order or overlapping matches rather than syntax alone.

### Experimental and platform-specific features
- `experimental` currently covers optional areas such as cache file storage and management APIs; specific sub-objects can be highly version-sensitive.
- This group supports advanced runtime behavior but should be treated cautiously in generated configs unless the user explicitly needs it.
- The main dependency is version/platform support: fields may appear in later versions only, and optional APIs or cache behavior may differ across deployments.

## Version caveats
- These notes are based on official sing-box configuration pages captured on 2026-04-17.
- The official pages repeatedly mark fields with “Since” and “Changes in” annotations; treat those annotations as authoritative whenever a user’s config appears to use a field from a different version line.
- `experimental` features and some protocol/platform-specific objects are especially likely to drift between versions; do not assume they are stable across installations.
- The configuration index documents additional top-level objects beyond the core ones used in this skill; if a user asks about `ntp`, `certificate`, `certificate_providers`, `endpoints`, or `services`, answer conservatively and note that those objects exist in the top-level structure even if they are not the focus of the bundled recipes.
