import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { candidates, resolveScript, clientConfig } from '../index.js'

function fakeHome(versions = [], marketplace = false) {
  const home = mkdtempSync(join(tmpdir(), 'dsh-kannaka-'))
  const put = (dir) => { mkdirSync(join(dir, 'mcp'), { recursive: true }); writeFileSync(join(dir, 'mcp', 'kannaka-mcp.mjs'), '') }
  for (const v of versions) put(join(home, '.claude', 'plugins', 'cache', 'kannaka', 'kannaka', v))
  if (marketplace) put(join(home, '.claude', 'plugins', 'marketplaces', 'kannaka', 'plugins', 'kannaka'))
  return home
}

test('marketplace checkout wins over the cache', () => {
  const home = fakeHome(['1.4.8'], true)
  assert.match(resolveScript({}, {}, home, null), /marketplaces/)
})

test('cache falls back to the newest version, numerically', () => {
  const home = fakeHome(['1.4.9', '1.4.10', '1.4.8'])
  assert.match(resolveScript({}, {}, home, null), /1\.4\.10/)
})

test('config.script, then KANNAKA_MCP_SCRIPT, then the npm dependency, then Claude Code paths', () => {
  const home = fakeHome([], true)
  const c = candidates({ script: '/a.mjs' }, { KANNAKA_MCP_SCRIPT: '/b.mjs' }, home, '/dep.mjs')
  assert.deepEqual(c.slice(0, 3), ['/a.mjs', '/b.mjs', '/dep.mjs'])
})

test('nothing installed: a clear error listing what was tried', () => {
  assert.throws(() => resolveScript({}, {}, fakeHome(), null), /kannaka-mcp\.mjs not found[\s\S]*Tried:/)
})

test('client row: one stdio server, the dsh node binary, long tool timeout', () => {
  const e = clientConfig({}, '/x/kannaka-mcp.mjs')
  assert.equal(e.serverName, 'kannaka')
  assert.equal(e.transport, 'stdio')
  assert.equal(e.command, process.execPath)
  assert.deepEqual(e.args, ['/x/kannaka-mcp.mjs'])
  assert.ok(e.toolCallTimeoutMs >= 150000)
})
