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

// Frame contract of dialogs migrated onto src/admin/components/antd/AdminDialog.vue (Ant Modal, 2026-11-27).
export const assertAdminDialogFrame = (source) => {
  assert.match(source, /<AdminDialog\b[^>]*:open="/)
  assert.doesNotMatch(source, /<Teleport to="body">\s*<Transition|fixed inset-0[^"]*bg-slate-950|@click\.self|@mousedown\.self|@touchend\.self|@pointerup\.self/)
  const frame = readFileSync(resolve('src/admin/components/antd/AdminDialog.vue'), 'utf8')
  assert.match(frame, /useDialogLifecycle\(/)
  assert.match(frame, /:z-index="layerStyle\.zIndex"/)
  assert.match(frame, /:mask-closable="false"/)
  assert.match(frame, /:keyboard="false"/)
  assert.match(frame, /aria-label="关闭"/)
  assert.match(frame, /transition-name="admin-trading-dialog"/)
  assert.match(frame, /\.ant-modal-content \{[^}]*overflow: hidden/)
  assert.match(frame, /safe-area-inset-top[\s\S]*safe-area-inset-bottom/)
  // The motion itself (fade + 0.96 scale, 200ms in, 150ms out, ≤50ms reduced) lives in the console theme.
  const theme = readFileSync(resolve('src/styles/theme.css'), 'utf8')
  assert.match(theme, /\.admin-trading-dialog-appear-active \{ animation: admin-console-dialog-in 200ms ease-out/)
  assert.match(theme, /\.admin-trading-dialog-leave-active \{ animation: admin-console-dialog-out 150ms ease-in/)
  assert.match(theme, /prefers-reduced-motion: reduce[\s\S]*admin-trading-dialog-leave-active \{ animation: admin-console-mask-out 50ms/)
}
