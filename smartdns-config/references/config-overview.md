# SmartDNS Config Overview

## What SmartDNS is doing in a deployment
- SmartDNS sits between clients and upstream DNS servers, listens on one or more local service endpoints, and forwards queries to configured upstream resolvers.
- In the official minimal configuration model, the two core building blocks are the listener (`bind`) and upstream server directives (`server*`); other capabilities refine selection, caching, rules, and observability.
- SmartDNS can optimize returned answers by using cache, response selection logic, speed checks, and dual-stack selection instead of simply returning the first upstream result unchanged.
- SmartDNS can also steer behavior by domain, client, rule group, or set membership, which makes it suitable for home routers, side routers, and operations scenarios.

## How to read a SmartDNS config
1. Listener / bind settings — identify how SmartDNS accepts DNS traffic, on which address, port, transport, and optional listener-level rule toggles.
2. Upstream `server` definitions — identify where queries are forwarded, whether upstreams are grouped, encrypted, proxied, fallback-only, or bootstrap-only.
3. Cache and response selection behavior — identify cache persistence, TTL rewriting, serve-expired behavior, speed checks, response mode, and dual-stack selection.
4. Domain rules / groups — identify whether domains or clients are redirected to special groups, static answers, ipset/nftset outputs, or packed `domain-rules` behavior.
5. Logging and debugging aids — identify what logs, audit streams, or foreground/terminal options exist to explain runtime behavior.

## Main capability groups

### Listener and runtime basics
This group answers “how do clients reach SmartDNS?” It includes `bind`, `bind-tcp`, `bind-tls`, `bind-https`, certificate-related directives, and runtime toggles such as `no-daemon`, `no-pidfile`, `restart-on-crash`, and `user`. The main dependencies are transport choice and certificate availability: encrypted listeners require valid certificate settings, and listener-level `-no-*` options can bypass other rule systems for traffic entering through that listener.

### Upstream servers and protocol choices
This group answers “where does SmartDNS send recursive queries, and over what protocol?” It includes `server`, `server-tcp`, `server-tls`, `server-https`, `server-quic`, `server-h3`, plus helper concepts such as upstream grouping, proxying, bootstrap DNS, fallback servers, and per-server ECS/interface binding. The main trade-offs are protocol support, TLS/HTTP verification correctness, bootstrap dependency, and environment support such as the official OpenSSL 3.4 note for some QUIC/H3 options.

### Cache and response optimization
This group answers “how aggressively should SmartDNS reuse, rewrite, or prefetch answers?” It includes `cache-*`, `rr-ttl*`, `local-ttl`, `prefetch-domain`, `serve-expired*`, `max-query-limit`, `socket-buff-size`, and `tcp-idle-time`. The main trade-offs are freshness versus speed, persistence versus storage requirements, and concurrency/performance tuning versus resource limits.

### Rule-driven behavior
This group answers “when should SmartDNS behave differently for certain domains, clients, or result sets?” It includes `nameserver`, `address`, `domain-rules`, `group-begin`, `group-end`, `group-match`, `client-rules`, `domain-set`, `ip-set`, `ipset*`, `nftset*`, and IP filtering/alias directives. The main dependencies are upstream group naming, rule scope, inheritance, and file-backed set contents; troubleshooting usually requires checking interaction order rather than any single directive in isolation.

### Logging and observability
This group answers “how do we prove what SmartDNS is doing at runtime?” It includes `log-*`, `audit-*`, and command-line options such as `-f` and `-x` from the official command-line section. The main trade-offs are verbosity, storage volume, and whether logs should go to files, console, or syslog during troubleshooting.

## Version caveats
- These notes are based on official SmartDNS documentation captured on 2026-04-15 from pages showing release label `Release47.1`.
- If no upstream `server*` directive is configured, the official docs say SmartDNS reads system DNS from `/etc/resolv.conf`; this fallback matters when diagnosing “it works but not with the intended upstreams.”
- The official docs explicitly note that some QUIC/H3-related upstream options require OpenSSL 3.4 and may otherwise be unsupported or exit with an error.
- The WebUI plugin section notes that statically compiled SmartDNS does not support plugin loading, so plugin-related examples are environment-dependent.
- If the user’s installed SmartDNS version differs from the documentation snapshot, verify option support and exact syntax against the running version before treating any directive detail as authoritative.
