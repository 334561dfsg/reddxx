import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const mutationPath = new URL('../src/admin/components/user/UserFundsMutationDialog.vue', import.meta.url)

test('funds mutation dialog follows the shared layered dialog contract', async () => {
  const source = await readFile(mutationPath, 'utf8')

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /v-if="rendered"/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /class="fixed inset-0/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="user-funds-mutation-title"/)
  assert.match(source, /aria-label="关闭"/)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /data-testid="user-funds-mutation-body"[^>]*overflow-y-auto/)
  assert.match(source, /closeDisabled/)
})

test('funds mutation dialog previews and confirms all three operation modes', async () => {
  const source = await readFile(mutationPath, 'utf8')

  assert.match(source, /冻结全部资金/)
  assert.match(source, /解冻后台冻结/)
  assert.match(source, /划扣可用资金/)
  assert.match(source, /stage\.value = 'confirm'/)
  assert.match(source, /返回修改/)
  assert.match(source, /提交并验证/)
  assert.match(source, /type: modeToType\[props\.mode\]/)
  assert.match(source, /userId: userId\.value/)
  assert.match(source, /reason: form\.reason\.trim\(\)/)
  assert.match(source, /props\.mode === 'deduct'/)
  assert.match(source, /returnFocus: submitButtonRef\.value/)
  assert.match(source, /role="alert"/)
})

test('funds mutation dialog uses required open, close, and reduced-motion timings', async () => {
  const source = await readFile(mutationPath, 'utf8')

  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
})
