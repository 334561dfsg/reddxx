// Admin overlays use the shared Ant frames (AdminDialog / AdminDrawer, or Ant Modal/Drawer directly) and operation
// feedback uses Ant message (AGENTS.md, migration finished 2026-11-28). This keeps hand-built frames and toasts out.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve('src')
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])
const adminFiles = [...walk(join(root, 'admin')), ...walk(join(root, 'pages/admin'))].filter((file) => file.endsWith('.vue'))
const rel = (file) => relative(root, file)

test('admin has no hand-built modal frames', () => {
  // A Teleport is still fine for popups anchored to a control (select panels, filter menus).
  const hits = adminFiles.filter((file) => /<Teleport to="body">\s*(?:<!--[\s\S]*?-->\s*)*<Transition/.test(readFileSync(file, 'utf8'))).map(rel)
  assert.deepEqual(hits, [])
})

test('Ant Modal and Drawer are not wrapped in an extra Teleport (they portal themselves)', () => {
  const hits = adminFiles.filter((file) => /<Teleport to="body">\s*(?:<!--[\s\S]*?-->\s*)*<(?:a-modal|a-drawer|Modal|Drawer)\b/.test(readFileSync(file, 'utf8'))).map(rel)
  assert.deepEqual(hits, [])
})

test('admin operation feedback has no hand-built toast', () => {
  const hits = adminFiles.filter((file) => /v-if="(?:toast\.visible|staffToast)"/.test(readFileSync(file, 'utf8'))).map(rel)
  assert.deepEqual(hits, [])
})
