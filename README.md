# dsh-plugin-kannaka

Kannaka for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It gives a dsh agent Kannaka's memory, swarm, and KAX compute tools.

| Tool (in dsh) | What it does |
|---|---|
| `mcp__kannaka__kannaka_recall` / `_remember` / `_status` / `_dream` | HRM memory: search, store, metrics, consolidation |
| `mcp__kannaka__swarm_status` / `swarm_send` / `swarm_tail` | NATS swarm: peers, messages, live pulse |
| `mcp__kannaka__compute_machines` / `_status` / `_events` / `_wake` / `_grant` | KAX Compute District roster, events, signed wakes and credit grants |

This package is a thin bundle. It mounts dsh's own `@deepseek-ai/dsh-mcp-client` for the Kannaka MCP server that ships with the [Kannaka Claude Code plugin](https://github.com/kannaka-labs/kannaka-plugin). There is no copy of the server here, so fixes to the server reach dsh with no change to this package.

## Requirements

- dsh `>=0.2.2-rc.1 <0.3.0`
- The `kannaka` binary in `~/.local/bin` or `~/.kannaka/bin`
- `kannaka-mcp.mjs`, found in this order:
  1. the `script` config field
  2. `KANNAKA_MCP_SCRIPT`
  3. `~/.claude/plugins/marketplaces/kannaka/plugins/kannaka/mcp/`
  4. the newest `~/.claude/plugins/cache/kannaka/kannaka/<version>/mcp/`
- For swarm and KAX auth: NATS credentials in `~/.kannaka-nats.env`. dsh strips credential-looking env vars such as `NATS_PASSWORD` from MCP children, so environment variables alone won't reach the server.

## Install

```sh
dsh plugin --profile web add <path-to-this-folder>    # or the npm name once published
dsh web
```

## Config (optional)

```yaml
- id: kannaka
  name: dsh-plugin-kannaka
  config:
    script: /path/to/kannaka-mcp.mjs   # override discovery
    serverName: kannaka                # tool namespace
    toolCallTimeoutMs: 200000          # default; status/dream are slow on big stores
    env: {}                            # extra env for the server process
```

## Notes

- `kannaka_status` takes 30-60 s on a store of about 1,300 memories. Kannaka plugin 1.4.9 allows it 150 s; 1.4.8 and older kill it at 20 s.
- A timed-out `kannaka_remember` may still have stored the memory. Check with `kannaka_recall` before retrying.

## Test

```sh
npm test
```

Verified on 2026-11-06 against dsh 0.2.2-rc.1 (web profile, Windows): dsh started the server, completed `initialize` and `tools/list` (12 tools), and stopped it on exit.

## License

Copyright 2026 Nick Flach

Licensed under the [Space Child License, Version 1.0](LICENSE): free for peaceful use, including commercial use. It includes a peace clause that carries over to derivative works. Offensive military use needs a separate paid license. See the LICENSE file for the full terms.
