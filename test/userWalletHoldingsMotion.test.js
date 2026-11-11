import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const source = readFileSync(new URL('../src/admin/components/user/UserWalletHoldingsDialog.vue', import.meta.url), 'utf8')
const css = postcss.parse(source.match(/<style>([\s\S]*?)<\/style>/)[1])

// Ant's enterFrom/enterActive classes include `enter-prepare` before it adds
// `enter-active` on the next frame. That first painted frame must be hidden.
for (const part of ['dialog', 'mask']) {
  test(`wallet ${part} stays transparent before Ant starts the enter animation`, () => {
    const declarations = {}
    css.walkRules(rule => {
      if (rule.parent.type !== 'root') return
      if (rule.selectors.includes(`.wallet-ant-${part}-enter-prepare`)) {
        rule.walkDecls(decl => { declarations[decl.prop] = decl.value })
      }
    })
    assert.equal(declarations.opacity, '0')
    if (part === 'dialog') assert.equal(declarations.transform, 'scale(.96)')
  })
}
