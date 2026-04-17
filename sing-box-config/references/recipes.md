# sing-box Recipes

> 依据：sing-box 官方同站配置文档，抓取日期 2026-04-17。
>
> 目标：给出能直接复用的 JSON 片段，并明确“何时用”和“需要替换什么”。

## Minimal usable config

**Use when**
- 只想得到一个最小可运行骨架，确认 sing-box 基本结构正确。

```json
{
  "log": {
    "level": "info"
  },
  "inbounds": [
    {
      "type": "socks",
      "tag": "socks-in",
      "listen": "127.0.0.1",
      "listen_port": 1080
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "final": "direct"
  }
}
```

**Replace these values**
- `listen` / `listen_port`：按你的本地监听地址和端口改。

## Local SOCKS or HTTP inbound with one outbound

**Use when**
- 需要本地应用通过 SOCKS 或 HTTP 代理进入 sing-box，再统一走一个出站。

```json
{
  "log": {
    "level": "info"
  },
  "inbounds": [
    {
      "type": "socks",
      "tag": "socks-in",
      "listen": "127.0.0.1",
      "listen_port": 1080
    },
    {
      "type": "http",
      "tag": "http-in",
      "listen": "127.0.0.1",
      "listen_port": 8080
    }
  ],
  "outbounds": [
    {
      "type": "vmess",
      "tag": "vmess-out",
      "server": "example.com",
      "server_port": 443,
      "uuid": "00000000-0000-0000-0000-000000000000",
      "security": "auto"
    }
  ],
  "route": {
    "final": "vmess-out"
  }
}
```

**Replace these values**
- `server`
- `server_port`
- `uuid`
- 如服务端要求 TLS、transport、multiplex，继续补充对应对象。

## Selector and URLTest pattern

**Use when**
- 需要“手动切换 + 自动测速”同时存在。

```json
{
  "outbounds": [
    {
      "type": "vmess",
      "tag": "proxy-a",
      "server": "a.example.com",
      "server_port": 443,
      "uuid": "11111111-1111-1111-1111-111111111111"
    },
    {
      "type": "vmess",
      "tag": "proxy-b",
      "server": "b.example.com",
      "server_port": 443,
      "uuid": "22222222-2222-2222-2222-222222222222"
    },
    {
      "type": "urltest",
      "tag": "auto",
      "outbounds": ["proxy-a", "proxy-b"],
      "interval": "3m",
      "tolerance": 50
    },
    {
      "type": "selector",
      "tag": "select",
      "outbounds": ["auto", "proxy-a", "proxy-b"],
      "default": "auto"
    }
  ],
  "route": {
    "final": "select"
  }
}
```

**Replace these values**
- 两个 `vmess` 出站的 `server`、`server_port`、`uuid`
- 若不用 VMess，可替换成其他协议，但必须保持 tag 一致。

## DNS and route rule example

**Use when**
- 需要把 DNS 和 route 一起纳入配置，而不是只做单纯出站转发。

```json
{
  "dns": {
    "servers": [
      {
        "type": "udp",
        "tag": "dns-remote"
      }
    ],
    "final": "dns-remote"
  },
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    },
    {
      "type": "selector",
      "tag": "select",
      "outbounds": ["direct"]
    }
  ],
  "route": {
    "rules": [
      {
        "outbound": "direct"
      }
    ],
    "final": "select"
  }
}
```

**Replace these values**
- 把 `dns-remote` 补成你真正要用的 DNS server 对象字段。
- 把 route rules 改成你的真实匹配条件，而不是保守示例。

## TUN baseline template

**Use when**
- 需要让 sing-box 通过 TUN 接管系统流量。

```json
{
  "log": {
    "level": "info"
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in"
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "auto_detect_interface": true,
    "final": "direct"
  }
}
```

**Replace these values**
- TUN 相关地址、路由、平台字段要按你的系统补齐。
- 如果不是所有流量都直连，把 `final` 改成你的代理或 selector tag。

## rule-set inclusion template

**Use when**
- 需要把一组外部或内联规则独立成 rule-set，再在 route rules 中引用。

```json
{
  "route": {
    "rule_set": [
      {
        "type": "inline",
        "tag": "rs-local",
        "rules": []
      }
    ],
    "rules": [
      {
        "rule_set": "rs-local",
        "outbound": "direct"
      }
    ],
    "final": "direct"
  },
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ]
}
```

**Replace these values**
- `rules`：填入你的真实规则内容。
- `outbound`：改成要命中的目标 tag。

## Debug-friendly minimal config

**Use when**
- 配置看起来合法，但你想把变量降到最少，便于判断是对象引用问题还是协议本身问题。

```json
{
  "log": {
    "level": "debug",
    "timestamp": true
  },
  "inbounds": [
    {
      "type": "socks",
      "tag": "socks-in",
      "listen": "127.0.0.1",
      "listen_port": 1080
    }
  ],
  "outbounds": [
    {
      "type": "direct",
      "tag": "direct"
    }
  ],
  "route": {
    "final": "direct"
  }
}
```

**Replace these values**
- 一般不需要改太多；如果要逐步排查，就一次只增加一个对象或一个 tag 关系。
