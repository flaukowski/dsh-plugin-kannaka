// Copyright 2026 Nick Flach. Licensed under the Space Child License, Version 1.0 (see LICENSE).
// dsh-plugin-kannaka: connects DeepSeek Harness to the Kannaka MCP server.
//
// It mounts dsh's own @deepseek-ai/dsh-mcp-client for one stdio server for
// this plugin's lifetime; disabling or uninstalling the plugin removes the
// server and its tools. The server is the kannaka-mcp.mjs that ships with the
// Kannaka Claude Code plugin (kannaka-labs/kannaka-plugin); nothing is vendored.
//
// Why not ctx.mcpManager.register(): the MCP manager is on upstream master but
// not in any npm release yet (checked 0.2.2-rc.1), while mcp-client ships in
// every profile. Works in any profile with a tool registry (base, web, tui).
import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const name = 'kannaka'

const MCP_REL = join('mcp', 'kannaka-mcp.mjs')

// Newest first, comparing dotted numeric versions ("1.4.10" > "1.4.9").
function byVersionDesc(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] || 0) - (pa[i] || 0)
    if (d) return d
  }
  return 0
}

/** Candidate locations for kannaka-mcp.mjs, in the order they are tried. */
export function candidates(config = {}, env = process.env, home = homedir()) {
  const out = []
  if (config.script) out.push(config.script)
  if (env.KANNAKA_MCP_SCRIPT) out.push(env.KANNAKA_MCP_SCRIPT)
  const plugins = join(home, '.claude', 'plugins')
  out.push(join(plugins, 'marketplaces', 'kannaka', 'plugins', 'kannaka', MCP_REL))
  const cache = join(plugins, 'cache', 'kannaka', 'kannaka')
  try {
    for (const v of readdirSync(cache).sort(byVersionDesc)) out.push(join(cache, v, MCP_REL))
  } catch {}
  return out
}

export function resolveScript(config, env, home) {
  const tried = candidates(config, env, home)
  const hit = tried.find((p) => existsSync(p))
  if (!hit) {
    throw new Error(
      'dsh-plugin-kannaka: kannaka-mcp.mjs not found. Install the Kannaka Claude Code plugin, ' +
        'or set `script` in this plugin\'s config or KANNAKA_MCP_SCRIPT. Tried:\n  ' + tried.join('\n  '),
    )
  }
  return hit
}

/** The mcp-client row this plugin mounts, as a memory-guide entry would write it. */
export function clientConfig(config = {}, script = resolveScript(config)) {
  return {
    serverName: config.serverName || 'kannaka',
    transport: 'stdio',
    // The Node running dsh; no reliance on `node` being on PATH.
    command: process.execPath,
    args: [script],
    env: config.env || {},
    cwd: process.cwd(),
    // kannaka status can take ~1-2 min on a large store and dream up to 3 min
    // (the server's own budgets); dsh's default of 60 s would cut them off.
    toolCallTimeoutMs: config.toolCallTimeoutMs || 200000,
  }
}

// dsh-mcp-client ships inside dsh, not beside this package (which may be a
// link: checkout anywhere on disk), so resolve it from dsh's own location.
async function loadMcpClient() {
  const bases = [process.argv[1], join(process.cwd(), 'index.js')].filter(Boolean)
  for (const base of bases) {
    try {
      const path = createRequire(base).resolve('@deepseek-ai/dsh-mcp-client')
      return await import(pathToFileURL(path).href)
    } catch {}
  }
  throw new Error('dsh-plugin-kannaka: @deepseek-ai/dsh-mcp-client not found next to dsh (looked from ' + bases.join(', ') + ')')
}

export async function apply(ctx, config = {}) {
  const entry = clientConfig(config)
  const client = await loadMcpClient()
  // A child plugin: unloading this plugin unloads the client, its server
  // process and its tools.
  ctx.plugin(client, entry)
}
