# sing-box Objects by Topic

> This file is a retrieval-oriented object catalog for the most common sing-box configuration work.
> It is intentionally organized by user-facing topic rather than site navigation order.
> When a request depends on a niche field or a version-marked change, answer conservatively and remind the user to check their installed sing-box version.

## `log`

### Root `log` object
- Purpose: Control runtime logging behavior and whether logs are written at all.
- Common key fields: `disabled`, `level`, `output`, `timestamp`.
- Dependency or reference relationships: Does not depend on tags, but affects every troubleshooting workflow because it determines whether runtime evidence exists.
- Typical use: Set a normal file target with `info` or `warn` for long-running deployments; temporarily raise verbosity when debugging startup or route behavior.
- Common mistakes: Disabling logs before validating the config; sending logs only to a file path the runtime cannot write; expecting console output after `output` redirects logs to a file.
- Example:
  ```json
  {
    "log": {
      "level": "info",
      "output": "box.log",
      "timestamp": true
    }
  }
  ```

## `dns`

### Root `dns` object
- Purpose: Define DNS servers, DNS rules, default resolver choice, strategy, and cache-related behavior.
- Common key fields: `servers`, `rules`, `final`, `strategy`, `disable_cache`, `disable_expire`, `independent_cache`, `cache_capacity`, `optimistic`, `reverse_mapping`, `client_subnet`, `fakeip`.
- Dependency or reference relationships: `final` points to a DNS server tag; `rules` usually choose DNS server tags or DNS actions; later `route` behavior depends on DNS outcomes.
- Typical use: Separate DNS handling from outbound routing, choose specific DNS servers by tag, and influence result selection or cache behavior.
- Common mistakes: Referencing a DNS server tag in `final` or a DNS rule that was never defined; confusing DNS rules with route rules; assuming DNS cache behavior matches route cache behavior.
- Example:
  ```json
  {
    "dns": {
      "servers": [
        { "type": "udp", "tag": "dns-remote", "server": "1.1.1.1", "server_port": 53 }
      ],
      "final": "dns-remote"
    }
  }
  ```

### DNS server entries
- Purpose: Describe individual DNS backends under `dns.servers`.
- Common key fields: `type`, `tag`; type-specific fields vary by server kind.
- Dependency or reference relationships: Referenced by `dns.final` and DNS rules; some DNS server types are protocol-specific (`udp`, `tcp`, `tls`, `https`, `h3`, `quic`, `local`, `hosts`, `fakeip`, `resolved`, `tailscale`, `dhcp`).
- Typical use: Assign stable tags such as `dns-local`, `dns-remote`, or `dns-direct` and choose them from rules.
- Common mistakes: Forgetting `tag`; mixing protocol expectations; assuming all server types support the same fields.
- Example:
  ```json
  {
    "type": "https",
    "tag": "dns-https"
  }
  ```

### DNS rule entries
- Purpose: Match DNS queries and apply DNS-specific decisions before standard traffic routing happens.
- Common key fields: `server`, `action`, `disable_cache`, `rewrite_ttl`, `client_subnet`, plus many match fields introduced across versions.
- Dependency or reference relationships: Often chooses a DNS server tag; can reference rule sets or query characteristics; is conceptually separate from route rules even though both are called “rules”.
- Typical use: Send selected domains to a specific DNS server, disable cache for certain queries, or apply DNS-only policy before outbound routing.
- Common mistakes: Treating DNS rules as route rules; forgetting version-sensitive fields marked in the official page; assuming DNS rule matching automatically changes outbound routing.
- Example:
  ```json
  {
    "server": "dns-remote"
  }
  ```

## `inbounds`

### Root inbound entries
- Purpose: Define where traffic enters sing-box.
- Common key fields: `type`, `tag`.
- Dependency or reference relationships: Inbound traffic is later handled by route and outbound logic; some inbound types can interact with system proxy or platform networking behavior.
- Typical use: Expose local HTTP, SOCKS, mixed, direct, or TUN interfaces to applications or the host system.
- Common mistakes: Forgetting to expose a listener on the correct address/port; confusing inbound type-specific fields with generic listen fields; expecting platform-only behaviors on unsupported systems.
- Example:
  ```json
  {
    "type": "socks",
    "tag": "socks-in"
  }
  ```

### HTTP inbound
- Purpose: Accept local HTTP proxy traffic.
- Common key fields: `type`, `tag`, listen fields, `users`, `tls`, `set_system_proxy`.
- Dependency or reference relationships: May interact with system proxy integration on Linux, Android, Windows, and macOS; the docs note Apple/Android non-privileged cases should use `tun.platform.http_proxy` instead.
- Typical use: Local browser or application HTTP proxy entrypoint.
- Common mistakes: Expecting `set_system_proxy` to work on unsupported platforms; assuming authentication exists when `users` is empty.
- Example:
  ```json
  {
    "type": "http",
    "tag": "http-in",
    "listen": "127.0.0.1",
    "listen_port": 8080
  }
  ```

### SOCKS inbound
- Purpose: Accept SOCKS4/SOCKS4a/SOCKS5 traffic.
- Common key fields: `type`, `tag`, listen fields, `users`.
- Dependency or reference relationships: Commonly paired with selector or direct outbounds for local proxy usage.
- Typical use: Local desktop or mobile client proxy endpoint.
- Common mistakes: Forgetting that empty `users` means no authentication; binding only to localhost when expecting LAN clients to connect.
- Example:
  ```json
  {
    "type": "socks",
    "tag": "socks-in",
    "listen": "127.0.0.1",
    "listen_port": 1080
  }
  ```

### TUN inbound
- Purpose: Intercept traffic at the network stack level rather than only through a proxy listener.
- Common key fields: `type`, `tag`, address/route-related fields, platform-sensitive routing options.
- Dependency or reference relationships: Strongly depends on platform support, route behavior, and often DNS/rule-set design; TUN failures are rarely isolated from route setup.
- Typical use: Full-device or near-full-device traffic capture and policy routing.
- Common mistakes: Using platform-sensitive fields without verifying support; assuming TUN works without the necessary routing privileges; diagnosing TUN issues without checking route and DNS dependencies together.
- Example:
  ```json
  {
    "type": "tun",
    "tag": "tun-in"
  }
  ```

## `outbounds`

### Root outbound entries
- Purpose: Define where matched traffic leaves sing-box.
- Common key fields: `type`, `tag`.
- Dependency or reference relationships: Referenced by route rules, selector outbounds, URLTest outbounds, and sometimes detour-capable objects.
- Typical use: Build a set of direct, block, DNS, selector, URLTest, or protocol-specific egress paths.
- Common mistakes: Missing or duplicated tags; selector members that point to non-existent outbound tags; assuming every outbound type supports the same network features.
- Example:
  ```json
  {
    "type": "direct",
    "tag": "direct"
  }
  ```

### Direct outbound
- Purpose: Send traffic directly without tunneling through a remote proxy.
- Common key fields: `type`, `tag`, `override_address`, `override_port`, dial fields.
- Dependency or reference relationships: Common route fallback target; can be selected explicitly from route rules or selectors.
- Typical use: Local/LAN bypass, direct internet fallback, or traffic that should not be proxied.
- Common mistakes: Using deprecated override fields without noting version changes; assuming “direct” fixes DNS or route issues by itself.
- Example:
  ```json
  {
    "type": "direct",
    "tag": "direct"
  }
  ```

### Selector outbound
- Purpose: Choose one outbound tag from a configured list.
- Common key fields: `type`, `tag`, `outbounds`, `default`, `interrupt_exist_connections`.
- Dependency or reference relationships: Every member in `outbounds` must reference an existing outbound tag; current docs say it is controlled through Clash API.
- Typical use: Manual switch between multiple proxy outbounds and direct fallback.
- Common mistakes: Listing tags that do not exist; expecting selector behavior without a control path; forgetting that the first outbound is used if `default` is empty.
- Example:
  ```json
  {
    "type": "selector",
    "tag": "select",
    "outbounds": ["vmess-out", "direct"],
    "default": "direct"
  }
  ```

### URLTest outbound
- Purpose: Automatically test and choose among multiple outbound tags.
- Common key fields: `type`, `tag`, `outbounds`, `url`, `interval`, `tolerance`, `idle_timeout`, `interrupt_exist_connections`.
- Dependency or reference relationships: Depends on valid outbound tags; often paired with selector as an “auto” choice.
- Typical use: Automatic best-proxy selection.
- Common mistakes: Forgetting that `outbounds` is required; assuming URLTest validates credentials rather than just connectivity/performance; expecting it to work when member outbounds are broken.
- Example:
  ```json
  {
    "type": "urltest",
    "tag": "auto",
    "outbounds": ["vmess-a", "vmess-b"],
    "interval": "3m"
  }
  ```

### VMess outbound
- Purpose: Connect to a VMess server.
- Common key fields: `type`, `tag`, `server`, `server_port`, `uuid`, `security`, `alter_id`, `network`, `tls`, `transport`, `multiplex`.
- Dependency or reference relationships: Commonly used as a selectable outbound inside selectors or URLTest; may require TLS and transport objects to line up with server expectations.
- Typical use: Remote proxy egress with tag-based routing.
- Common mistakes: Missing required connection fields; mixing transport or TLS assumptions with server-side expectations; forgetting to place the outbound tag into selector or route policy.
- Example:
  ```json
  {
    "type": "vmess",
    "tag": "vmess-out",
    "server": "example.com",
    "server_port": 443,
    "uuid": "00000000-0000-0000-0000-000000000000"
  }
  ```

## `route`

### Root `route` object
- Purpose: Match traffic and decide the final routing action or outbound target.
- Common key fields: `rules`, `rule_set`, `final`, `auto_detect_interface`, `default_interface`, `find_process`, `default_domain_resolver`, network-strategy-related fields.
- Dependency or reference relationships: Often references outbound tags, rule-set tags, interface behavior, and DNS-resolver choices.
- Typical use: Domain/IP/process-based traffic steering, default fallback selection, and interface-aware policy.
- Common mistakes: Setting `final` to a missing outbound tag; assuming `rule_set` entries are used without matching rules; ignoring version-marked changes to route behavior fields.
- Example:
  ```json
  {
    "route": {
      "final": "select",
      "auto_detect_interface": true
    }
  }
  ```

### Route rule entries
- Purpose: Match traffic and choose an outbound or action.
- Common key fields: `outbound`, `action`, `rule_set`, plus many match fields added across versions such as network, process, interface, and source-related matchers.
- Dependency or reference relationships: Usually references outbound tags or rule-set tags; may interact with process detection, network type, and DNS-derived metadata.
- Typical use: Send traffic to `direct`, `select`, or a specific proxy based on domain, process, IP, or rule set.
- Common mistakes: Writing a valid rule whose `outbound` tag does not exist; assuming rule-set references work without declaring the rule set in the root `route.rule_set` list.
- Example:
  ```json
  {
    "outbound": "direct"
  }
  ```

## `rule-set`

### Rule-set objects
- Purpose: Define reusable rule data as inline, local, or remote rule sets.
- Common key fields: `type`, `tag`, `rules`, `format`, `path`, `url`.
- Dependency or reference relationships: Referenced from route rules or DNS rules; the `tag` must match what rules expect.
- Typical use: Keep large rule collections outside the main route rule body or fetch/update them remotely.
- Common mistakes: Forgetting `tag`; confusing inline with local/remote layout; using a rule set in a route rule without declaring it in the root route object.
- Example:
  ```json
  {
    "type": "inline",
    "tag": "rs-local",
    "rules": []
  }
  ```

## `experimental`

### Root `experimental` object
- Purpose: Enable optional or version-sensitive features such as cache file storage or management APIs.
- Common key fields: `cache_file`, `clash_api`, `v2ray_api`.
- Dependency or reference relationships: These are not required for basic routing but can influence persistence and operational control.
- Typical use: Add cache persistence or management integration only when the deployment explicitly needs it.
- Common mistakes: Treating experimental features as portable defaults; assuming an API or cache behavior is present on every deployment.
- Example:
  ```json
  {
    "experimental": {
      "cache_file": {
        "enabled": true
      }
    }
  }
  ```

### Experimental `cache_file`
- Purpose: Persist selected cached state to disk.
- Common key fields: `enabled`, `path`, `cache_id`, `store_fakeip`, `store_rdrc`, `rdrc_timeout`, `store_dns`.
- Dependency or reference relationships: Depends on a writable path and on the deployment actually wanting persistence.
- Typical use: Preserve fake IP or DNS/cache-related state across restarts.
- Common mistakes: Assuming default path behavior is acceptable everywhere; ignoring version changes such as deprecated or changed `store_rdrc` behavior.
- Example:
  ```json
  {
    "cache_file": {
      "enabled": true,
      "path": "cache.db",
      "store_dns": true
    }
  }
  ```
