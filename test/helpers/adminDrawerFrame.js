// Frame contract of drawers migrated onto src/admin/components/antd/AdminDrawer.vue (2026-11-27). The frame rules that
// used to be asserted in every drawer's own Teleport/Transition markup (shared layer, backdrop never closes, motion
// timings, reduced motion, safe areas, fixed header with the close button) now live in the adapter once.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const frameSource = () => readFileSync(resolve('src/admin/components/antd/AdminDrawer.vue'), 'utf8')

export const assertAdminDrawerFrame = (source) => {
  assert.match(source, /<AdminDrawer\b[^>]*:open="/)
  // No hand-built overlay frame (Teleport + Transition + dimmed fixed backdrop) and no backdrop close handlers.
  assert.doesNotMatch(source, /<Teleport to="body">\s*<Transition|fixed inset-0[^"]*bg-slate-950|@click\.self|@mousedown\.self|@touchend\.self|@pointerup\.self/)
  const frame = frameSource()
  assert.match(frame, /useDialogLifecycle\(/)
  assert.match(frame, /\.ant-drawer-content \{ overflow: hidden/)
  assert.match(frame, /:z-index="layerStyle\.zIndex"/)
  assert.match(frame, /:mask-closable="false"/)
  assert.match(frame, /:keyboard="false"/)
  assert.match(frame, /aria-label="关闭"/)
  assert.match(frame, /200ms !important; transition-timing-function: ease-out/)
  assert.match(frame, /150ms !important; transition-timing-function: ease-in/)
  assert.match(frame, /prefers-reduced-motion: reduce[\s\S]*50ms/)
  for (const edge of ['top', 'right', 'bottom', 'left']) assert.match(frame, new RegExp(`\\.ant-drawer-content \\{[^}]*safe-area-inset-${edge}`))
}
