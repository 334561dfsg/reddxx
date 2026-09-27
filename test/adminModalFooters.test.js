import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'

test('admin modals do not suppress their custom action footer', () => {
  const conflicts = []
  let checked = 0
  for (const directory of ['src/pages/admin', 'src/admin/components']) {
    for (const file of readdirSync(directory, { recursive: true }).filter(path => path.endsWith('.vue'))) {
      const path = `${directory}/${file}`
      const template = parse(readFileSync(path, 'utf8')).descriptor.template
      if (!template) continue
      const visit = node => {
        const hasFooterSlot = node.children?.some(child => child.type === 1 && child.props.some(
          prop => prop.name === 'slot' && prop.arg?.content === 'footer'
        ))
        if (node.type === 1 && node.tag === 'a-modal' && hasFooterSlot) {
          checked++
          if (node.props.some(prop => prop.name === 'bind' && prop.arg?.content === 'footer' && prop.exp?.content === 'null')) {
            conflicts.push(`${path}:${node.loc.start.line}`)
          }
        }
        node.children?.forEach(visit)
      }
      visit(baseParse(template.content))
    }
  }
  assert.ok(checked > 0, 'must inspect actual admin modal footer slots')
  assert.deepEqual(conflicts, [], 'footer=null hides save/cancel actions even when a footer slot exists')
})
