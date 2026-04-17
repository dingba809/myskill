# SmartDNS Troubleshooting

> Source basis: official SmartDNS documentation captured in `.tmp/smartdns-docs/basic-config.md` and `.tmp/smartdns-docs/configuration.md` on 2026-04-15.
> Use this file as a diagnostic checklist for configuration review, not as proof of runtime state. When runtime evidence is needed, ask the user for logs and a minimal config fragment.

## Fast triage checklist
1. Did SmartDNS start successfully?
2. Is the client actually sending DNS queries to SmartDNS?
3. Are the upstream servers reachable and valid for the selected protocol?
4. Are rules, groups, or selection features changing the answer unexpectedly?
5. Is logging enabled enough to prove what happened?

## Symptom: service starts but clients are not using it
- Check:
  - Whether `bind`, `bind-tcp`, `bind-tls`, or `bind-https` is listening on the address/port the client is actually configured to use.
  - Whether another local DNS service is already occupying port 53, forcing SmartDNS onto another port.
  - Whether the client expects UDP/TCP/DoT/DoH but SmartDNS is listening on a different transport.
- Why it happens:
  - SmartDNS can be healthy while clients still query another resolver because the listener address, port, or upstream forwarding path above it is wrong.
  - In side-router/OpenWrt setups, SmartDNS may be bound only to `127.0.0.1` or a high port, so LAN clients never reach it directly.
- What to change:
  - Align client DNS settings with the configured `bind*` listener.
  - If port 53 is unavailable, either move clients to the chosen high port through an upstream forwarder or rebind SmartDNS after resolving the port conflict.
  - During debugging, use a simple listener such as `bind 127.0.0.1:6053` or `bind <LAN_IP>:6053` and test with explicit client-side queries.

## Symptom: upstream server is configured but appears ineffective
- Check:
  - Whether any `server*` lines were actually configured; if not, the official docs say SmartDNS falls back to `/etc/resolv.conf`.
  - Whether the intended upstream is in a non-default `-group` but the matching `nameserver` rule or listener group never selects it.
  - Whether `-exclude-default-group`, `-fallback`, `-proxy`, `-bootstrap-dns`, `-interface`, or TLS verification options make the upstream behave differently than expected.
  - Whether encrypted upstream settings (`-host-name`, `-http-host`, `-tls-host-verify`, `-spki-pin`, `-no-check-certificate`) match the provider.
- Why it happens:
  - A correctly parsed `server*` line can still be bypassed by group selection, fallback behavior, bootstrap lookups, or default resolver fallback.
  - Encrypted upstreams may silently fail from bad host/verification parameters while a different upstream still answers, making the intended one look unused.
- What to change:
  - Reduce the config to one or two known-good upstreams and remove grouping temporarily.
  - Verify the exact group name used by `nameserver` or `group-match` and compare it with `server* ... -group <name>`.
  - For DoT/DoH/H3/QUIC, confirm the official protocol-specific host and certificate options before reintroducing extra policy flags.

## Symptom: results do not match the intended split/rule behavior
- Check:
  - Whether the domain is covered by `nameserver`, `address`, `domain-rules`, `client-rules`, `group-match`, `domain-set`, or `ip-set` in the way the user assumes.
  - Whether listener-level flags such as `-no-rule-addr`, `-no-rule-nameserver`, `-no-rule-ipset`, `-no-rule-soa`, `-no-dualstack-selection`, or `-no-speed-check` are disabling the policy path.
  - Whether group inheritance (`group-begin ... -inherit`) or current-group context changes where the rule applies.
  - Whether wildcard/main-domain matching in `address` is using the documented leading `*` or `-` forms correctly.
- Why it happens:
  - SmartDNS policy is layered: listener choices, group selection, packed `domain-rules`, and client-specific overrides can all redirect behavior before the final answer is returned.
  - Many “split does not work” cases are actually scope problems: wrong domain set file, wrong group name, or a listener bypassing the rule system.
- What to change:
  - Test one rule family at a time: first `nameserver`, then `domain-rules`, then client/group logic.
  - Temporarily remove `-no-*` listener flags and simplify to one upstream group per policy.
  - Ask the user for the exact domain, expected upstream group, and the matching set file content if sets are involved.

## Symptom: performance or cache behavior is not as expected
- Check:
  - Whether `cache-size`, `cache-persist`, `cache-file`, and `cache-checkpoint-time` match the actual storage and memory environment.
  - Whether TTL rewrites (`rr-ttl*`, `local-ttl`) or `serve-expired*` make answers appear older/newer than the user expects.
  - Whether `speed-check-mode`, `response-mode`, and `dualstack-ip-selection*` are intentionally trading latency for better IP choice.
  - Whether `prefetch-domain`, `max-query-limit`, `socket-buff-size`, and `tcp-idle-time` fit the deployment size.
- Why it happens:
  - Cache persistence may be disabled by path or free-space constraints, and selection features may delay replies slightly while improving answer quality.
  - Users often interpret “different result” as “wrong result” when the real cause is speed-check, fastest-IP mode, or expired-cache serving.
- What to change:
  - For diagnosis, temporarily disable `serve-expired`, `prefetch-domain`, `speed-check-mode`, and dual-stack selection to observe baseline behavior.
  - Move cache files to a confirmed writable location and lower complexity before retuning.
  - Reintroduce optimization features one by one after the base listener/upstream path is proven.

## Evidence to ask from the user
- The exact `bind*` and `server*` lines currently in use.
- Any `nameserver`, `domain-rules`, `client-rules`, `group-begin`, or `group-match` lines affecting the failing domain/client.
- The runtime environment: OpenWrt/router/container/host OS, SmartDNS version, and whether another DNS service owns port 53.
- A short log or audit excerpt captured while querying one known domain.
- One example domain, the expected answer/path, and the actual answer/path observed.
- Any domain-set or ip-set file path and a few representative entries if list-backed rules are involved.
