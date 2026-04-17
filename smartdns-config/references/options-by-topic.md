# SmartDNS Options by Topic

> Source basis: `.tmp/smartdns-docs/basic-config.md` and `.tmp/smartdns-docs/configuration.md` captured from the official SmartDNS docs on 2026-04-15.
> Use this file as a retrieval-oriented option catalog. Keep answers grounded in the official directive names and syntax families shown here.

> Coverage note: this file is a high-frequency retrieval catalog, not a verbatim copy of every directive from the official configuration table.
> If a requested directive is not listed here, fall back to `.tmp/smartdns-docs/configuration.md` (raw official capture) and then to the official SmartDNS documentation pages listed in `.tmp/smartdns-docs/related-links.txt`.
> For complex directives, treat the directive line plus the documented sub-options below as one unit.

## Listener and basic runtime

### `bind`
- Purpose: Listen for UDP DNS requests on a local IP/port and optionally attach listener-level rule toggles.
- Syntax shape: `bind IP:PORT@DEVICE [listener options...]`
- Typical use: Expose the main DNS service on `:53`, on a specific interface, or with a specific upstream group.
- Caveats: Listener options can bypass rule subsystems such as address rules, nameserver rules, speed checks, cache, or dual-stack selection for traffic entering through this listener.
- Example: `bind :53@eth0`


### `port`
- Purpose: In the current official captures, service port selection is documented through `bind`/`bind-*` listener directives rather than a standalone `port` directive entry.
- Syntax shape: Use the official listener form `IP:PORT@DEVICE` inside `bind`, `bind-tcp`, `bind-tls`, or `bind-https`.
- Typical use: Read or change the service port by editing the listener directive, for example `bind :53@eth0` or `bind-tls :853`.
- Caveats: Do not assume a separate `port` directive exists unless the user's installed SmartDNS version documents it; for the captured official pages, treat listener port control as part of `bind*` syntax.
- Example: `bind :53@eth0`

### `bind-tcp`
- Purpose: Listen for TCP DNS requests.
- Syntax shape: `bind-tcp IP:PORT@DEVICE [listener options...]`
- Typical use: Provide TCP fallback for resolvers or clients that require TCP transport.
- Caveats: Listener-level `-no-*` flags behave similarly to `bind`; do not assume TCP inherits UDP listener configuration automatically.
- Example: `bind-tcp :53`

### `bind-tls`
- Purpose: Listen for DNS-over-TLS requests.
- Syntax shape: `bind-tls IP:PORT@DEVICE [listener options...]`
- Typical use: Expose encrypted DNS to trusted LAN clients.
- Caveats: Requires certificate settings such as `bind-cert-file` and `bind-cert-key-file`; verify certificate paths and port exposure.
- Example: `bind-tls :853`

### `bind-https`
- Purpose: Listen for DNS-over-HTTPS requests.
- Syntax shape: `bind-https IP:PORT@DEVICE [listener options...]`
- Typical use: Expose DoH on a local router or sidecar service.
- Caveats: Certificate configuration still matters; confirm path, host, and firewall expectations before enabling.
- Example: `bind-https :853`

### `bind-cert-file` / `bind-cert-key-file` / `bind-cert-key-pass`
- Purpose: Supply the certificate chain, private key, and optional key password for encrypted listeners.
- Syntax shape: `bind-cert-file <path>` / `bind-cert-key-file <path>` / `bind-cert-key-pass <string>`
- Typical use: Required when enabling `bind-tls` or `bind-https` with custom certificates.
- Caveats: Wrong file path or mismatched key/certificate pairs will break encrypted listeners even if UDP/TCP listeners still work.
- Example: `bind-cert-file cert.pem`


#### Common listener-level options for `bind*`
- `-group`: route requests from this listener through a specific upstream group.
- `-no-rule-addr` / `-no-rule-nameserver` / `-no-rule-ipset` / `-no-rule-soa`: bypass specific rule subsystems for traffic accepted on this listener.
- `-no-dualstack-selection` / `-no-speed-check` / `-no-cache` / `-no-serve-expired`: disable major optimization behaviors for this listener.
- `-force-aaaa-soa` / `-force-https-soa`: force selected record types to return SOA-style behavior on this listener.
- `-ipset` / `-nftset`: push matched results from this listener into ipset/nftset outputs.

### `server-name`
- Purpose: Set the DNS service name/host name presented by SmartDNS.
- Syntax shape: `server-name <hostname>`
- Typical use: Give the service a stable local identity in deployments with dashboards or local naming conventions.
- Caveats: This is not a substitute for listener binding or TLS host verification.
- Example: `server-name smartdns`

## Upstream servers

### `server`
- Purpose: Define an upstream UDP DNS server.
- Syntax shape: `server [ip:port|URL] [server options...]`
- Typical use: Minimal upstream configuration for standard recursive DNS.
- Caveats: If no `server*` directive is configured, SmartDNS falls back to `/etc/resolv.conf`; server-level options such as `-group`, `-proxy`, `-bootstrap-dns`, `-fallback`, `-subnet`, and IP filtering materially change behavior.
- Example: `server 8.8.8.8:53 -blacklist-ip`

### `server-tcp`
- Purpose: Define an upstream TCP DNS server.
- Syntax shape: `server-tcp [ip][:port] [server options...]`
- Typical use: Use TCP upstreams when UDP is unreliable or filtered.
- Caveats: Check `-tcp-keepalive`, interface binding, and whether TCP semantics match the target network.
- Example: `server-tcp 8.8.8.8:53`

### `server-tls`
- Purpose: Define an upstream DNS-over-TLS server.
- Syntax shape: `server-tls [ip][:port] [server options...]`
- Typical use: Encrypt upstream lookups while keeping configuration relatively simple.
- Caveats: TLS options such as `-host-name`, `-host-ip`, `-tls-host-verify`, `-spki-pin`, and `-no-check-certificate` directly affect trust and interoperability.
- Example: `server-tls 8.8.8.8:853`

### `server-https`
- Purpose: Define an upstream DNS-over-HTTPS server.
- Syntax shape: `server-https https://[host][:port]/path [server options...]`
- Typical use: Use DoH providers such as Cloudflare or other HTTPS-capable resolvers.
- Caveats: Check `-http-host`, TLS verification options, and bootstrap DNS if host resolution is circular.
- Example: `server-https https://cloudflare-dns.com/dns-query`

### `server-quic` / `server-h3`
- Purpose: Define QUIC/HTTP3 upstream DNS servers.
- Syntax shape: `server-quic [ip][:port] [server options...]` / `server-h3 h3://[host][:port]/path [server options...]`
- Typical use: Advanced encrypted upstreams where QUIC/H3 is supported.
- Caveats: Official docs note OpenSSL 3.4 is required for some QUIC/H3 options; unsupported builds may exit with an error.
- Example: `server-quic 8.8.8.8:853`

### `proxy-server`
- Purpose: Register a named upstream proxy for `server*` directives.
- Syntax shape: `proxy-server [socks5|http]://[username:password@]host:port [-name <name>]`
- Typical use: Route selected upstream DNS traffic through a SOCKS5 or HTTP proxy.
- Caveats: Proxy selection only matters when the target `server*` line explicitly references the proxy name.
- Example: `proxy-server socks5://user:pass@1.2.3.4:1080 -name proxy`


#### Common server-level options for `server*`
- `-group` / `-exclude-default-group`: place an upstream in a named group or remove it from the default group.
- `-blacklist-ip` / `-whitelist-ip`: filter returned IP ranges against global allow/deny lists.
- `-proxy`: send this upstream through a named proxy registered by `proxy-server`.
- `-bootstrap-dns`: mark the upstream as usable for bootstrap lookups.
- `-fallback`: mark the upstream as a fallback server rather than a primary one.
- `-subnet` / `-subnet-all-query-types`: send ECS information for this upstream.
- `-interface`: bind upstream traffic to a specific interface.
- TLS/HTTPS-specific options additionally include `-host-name`, `-host-ip`, `-tls-host-verify`, `-spki-pin`, `-http-host`, and `-no-check-certificate`.

## Cache and performance

### `cache-size`
- Purpose: Control how many domain results SmartDNS caches.
- Syntax shape: `cache-size <integer>`
- Typical use: Increase cache capacity on systems with enough memory to reduce repeated upstream lookups.
- Caveats: The docs describe an automatic memory-based default; larger caches increase memory use.
- Example: `cache-size 512`

### `cache-persist` / `cache-file` / `cache-checkpoint-time`
- Purpose: Persist cache across restarts and control where and when checkpointing occurs.
- Syntax shape: `cache-persist yes|no`, `cache-file <path>`, `cache-checkpoint-time <seconds>`
- Typical use: Keep cache warm on routers or appliances that restart periodically.
- Caveats: Persistence depends on writable storage and free space; `cache-checkpoint-time 0` disables checkpointing.
- Example: `cache-persist yes`

### `rr-ttl` / `rr-ttl-min` / `rr-ttl-max` / `rr-ttl-reply-max` / `local-ttl`
- Purpose: Rewrite or clamp TTL behavior for remote answers and local records.
- Syntax shape: `rr-ttl <seconds>` and related per-bound directives.
- Typical use: Balance freshness versus cache hit rate.
- Caveats: Aggressive TTL rewriting can mask upstream changes or make local answers appear fresher/staler than intended.
- Example: `rr-ttl-min 60`

### `max-query-limit`
- Purpose: Cap the maximum concurrent number of requests.
- Syntax shape: `max-query-limit <integer>`
- Typical use: Protect low-resource systems from excessive concurrency.
- Caveats: Too low a value can throttle legitimate traffic under burst load.
- Example: `max-query-limit 1000`

### `socket-buff-size` / `tcp-idle-time`
- Purpose: Tune socket buffering and idle TCP connection lifetime.
- Syntax shape: `socket-buff-size <size>` / `tcp-idle-time <seconds>`
- Typical use: Adjust throughput and connection reuse on busy deployments.
- Caveats: Tuning depends on platform limits and traffic characteristics.
- Example: `socket-buff-size 256K`

### `prefetch-domain` / `serve-expired` / `serve-expired-*`
- Purpose: Improve responsiveness by prefetching or serving expired cache entries under controlled rules.
- Syntax shape: `prefetch-domain yes|no`, `serve-expired yes|no`, plus TTL/prefetch time variants.
- Typical use: Favor latency and continuity on unstable upstream networks.
- Caveats: Expired answers can improve speed while reducing strict freshness; read `serve-expired-ttl`, `serve-expired-reply-ttl`, and `serve-expired-prefetch-time` together.
- Example: `serve-expired yes`

## Response selection and speed checks

### `speed-check-mode`
- Purpose: Define how SmartDNS tests candidate answers before deciding which IP to return.
- Syntax shape: `speed-check-mode [ping|tcp:PORT|none][,...]`
- Typical use: Prefer reachable or lower-latency IPs, often with `ping,tcp:80,tcp:443`.
- Caveats: More checks can improve answer quality but add work and depend on network reachability.
- Example: `speed-check-mode ping,tcp:80,tcp:443`

### `response-mode`
- Purpose: Choose how SmartDNS trades off answer speed versus IP quality.
- Syntax shape: `response-mode [first-ping|fastest-ip|fastest-response]`
- Typical use: `first-ping` for balanced behavior, `fastest-ip` when willing to wait more for the best IP, `fastest-response` when minimizing DNS wait time.
- Caveats: Mode choice changes user-visible latency patterns and may interact with speed checks.
- Example: `response-mode first-ping`

### `dualstack-ip-selection` / `dualstack-ip-selection-threshold`
- Purpose: Control IPv4/IPv6 dual-stack answer selection.
- Syntax shape: `dualstack-ip-selection yes|no` and `dualstack-ip-selection-threshold <milliseconds>`
- Typical use: Prefer the better-performing family when both A and AAAA answers exist.
- Caveats: Wrong assumptions about IPv6 availability can cause counterintuitive results; some listeners can disable this logic with `-no-dualstack-selection`.
- Example: `dualstack-ip-selection yes`

## Rules, groups, and domain behavior

### `nameserver`
- Purpose: Query matching domains with a specific upstream server group.
- Syntax shape: `nameserver /domain/[group|-]`
- Typical use: Send selected domains to a specific upstream group such as `office`, `foreign`, or a policy-specific resolver set.
- Caveats: This depends on `server*` lines being assigned to matching `-group` values.
- Example: `nameserver /www.example.com/office`

### `address`
- Purpose: Return a fixed address policy for a domain, including explicit IPs, SOA-style responses, IPv4-only/IPv6-only, or ignore behavior.
- Syntax shape: `address /domain/[ip1[,ip2,...]|-|-4|-6|#|#4|#6]`
- Typical use: Override resolution for local services, sinkholes, or family-specific filtering.
- Caveats: Wildcards (`*`) and main-domain matching (`-`) only work at the beginning of the domain pattern.
- Example: `address /www.example.com/1.2.3.4`

### `domain-rules`
- Purpose: Bundle multiple per-domain behaviors into one directive.
- Syntax shape: `domain-rules /domain/ [-rules...]`
- Typical use: Apply speed mode, nameserver, ipset/nftset, dual-stack, TTL, or no-cache behavior in a single line.
- Caveats: Because it can carry many flags, it is easy to hide complex intent inside one directive; explain the packed rules when modifying configs.
- Example: `domain-rules /www.example.com/ -speed-check-mode none`

### `group-begin` / `group-end` / `group-match`
- Purpose: Define rule groups, inherit from other groups, and activate groups based on client/domain conditions.
- Syntax shape: `group-begin <group> [-inherit <group|none>]`, `group-end`, `group-match [conditions]`
- Typical use: Build reusable policy blocks such as device classes or geography-specific rules.
- Caveats: Inheritance and implicit current-group behavior can make rule scope harder to follow during troubleshooting.
- Example: `group-begin group-name -inherit none`

### `client-rules`
- Purpose: Apply rule groups or rule bundles to specific clients by IP, subnet, MAC, or IP set.
- Syntax shape: `client-rules [ip-set|ip/subnet|mac] [-g|group <name>] [-rules...]`
- Typical use: Give TVs, work devices, or guest networks different DNS behavior.
- Caveats: The docs note rule parameters are the same as `bind`; remember listener-style flags can therefore appear here.
- Example: `client-rules 192.168.1.1 -g group-tv`

### `domain-set` / `ip-set`
- Purpose: Load reusable domain or IP lists from files and reference them from other directives.
- Syntax shape: `domain-set [options...]` / `ip-set [options...]`
- Typical use: Maintain large rule targets outside the main config file.
- Caveats: Other directives must reference the set name using the documented `domain-set:<name>` or `ip-set:<name>` style.
- Example: `domain-set -name set -type list -file /path/to/list`

### `ipset` / `nftset` and related timeout/debug variants
- Purpose: Export matched domain IPs into kernel/ipset/nftset data structures.
- Syntax shape: `ipset ...`, `nftset ...`, plus `ipset-timeout`, `ipset-no-speed`, `nftset-timeout`, `nftset-no-speed`, `nftset-debug`
- Typical use: Integrate SmartDNS results with routing or firewall policy.
- Caveats: The official docs call out nftables family limitations and separate IPv4/IPv6 set handling.
- Example: `nftset /www.example.com/#4:inet#tab#dns4,#6:-`


#### Packed rule fields commonly seen inside `domain-rules`
- `-speed-check-mode`, `-response-mode`, `-dualstack-ip-selection`: override selection behavior for a domain.
- `-address`, `-nameserver`: apply fixed answers or route the domain to a specific upstream group.
- `-ipset`, `-nftset`: export resulting IPs into kernel/firewall sets.
- `-rr-ttl`, `-rr-ttl-min`, `-rr-ttl-max`: override TTL handling for the matched domain.
- `-no-cache`, `-no-serve-expired`, `-delete`, `no-ip-alias`: disable caching/expired serving, remove a rule, or ignore alias processing.

#### `ipset` / `nftset` family notes
- `ipset-no-speed` / `nftset-no-speed`: still export results when speed check fails.
- `ipset-timeout` / `nftset-timeout`: enable timeout behavior for set entries.
- `nftset-debug`: increase nftset-specific debug output.
- For nftables, the official docs note separate IPv4 and IPv6 storage constraints and family-specific syntax.

## Logging and debug controls

### `log-level`
- Purpose: Control runtime logging verbosity.
- Syntax shape: `log-level [off|fatal|error|warn|notice|info|debug]`
- Typical use: Keep normal production logs at lower verbosity and raise temporarily for troubleshooting.
- Caveats: Higher log levels increase noise and may expose more operational detail.
- Example: `log-level error`

### `log-file` / `log-size` / `log-num` / `log-file-mode` / `log-console`
- Purpose: Control where runtime logs go, how large they grow, how many archives are kept, file mode, and whether to also print to console.
- Syntax shape: `log-file <path>`, `log-size <size>`, `log-num <integer>`, `log-file-mode <mode>`, `log-console yes|no`
- Typical use: Persist logs on routers or temporarily mirror them to terminal output.
- Caveats: File paths and permissions are environment-specific; `log-console yes` is useful during active debugging but noisier in service mode.
- Example: `log-console yes`

### `audit-enable` and related `audit-*`
- Purpose: Enable and route audit logs separately from normal logs.
- Syntax shape: `audit-enable yes|no`, plus `audit-file`, `audit-size`, `audit-num`, `audit-file-mode`, `audit-console`, `audit-syslog`
- Typical use: Keep a dedicated record of query/audit activity.
- Caveats: Audit logging increases storage and log-processing load; decide whether file, console, or syslog output matches the environment.
- Example: `audit-enable yes`

## Other advanced or niche directives worth remembering

### `mdns-lookup`
- Purpose: Enable mDNS lookup behavior.
- Syntax shape: `mdns-lookup yes|no`
- Typical use: Resolve local multicast-style names in LAN scenarios.
- Caveats: Treat as an environment-specific feature, not a universal default.
- Example: `mdns-lookup yes`

### `dns64`
- Purpose: Enable DNS64 translation with a specified IPv6 prefix.
- Syntax shape: `dns64 <ipv6-prefix/mask>`
- Typical use: IPv6-only or transition environments needing synthesized AAAA answers.
- Caveats: Only appropriate when the surrounding network actually expects DNS64/NAT64 behavior.
- Example: `dns64 64:ff9b::/96`

### `edns-client-subnet`
- Purpose: Set ECS information for upstream queries.
- Syntax shape: `edns-client-subnet <ip-prefix/mask>`
- Typical use: Influence geolocation-sensitive upstream answers.
- Caveats: ECS changes privacy and answer locality trade-offs.
- Example: `edns-client-subnet 1.2.3.4/23`
