// Finds (and with --write removes) declarations that a later rule in the same file always overrides:
// identical selector text, identical @media/@supports context, same property, and the later one is
// at least as important. Such earlier declarations can never win, so removing them is behaviour-neutral.
// Fallback pairs are kept: if the later value uses syntax an older browser may drop at parse time
// (dvh/svh, color-mix, oklab, env(), …) the earlier declaration stays as the fallback.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import postcss from 'postcss'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const write = process.argv.includes('--write')
const modernSyntax = /\b[dsl]v[hwib]\b|\d[dsl]v[hwib]|color-mix|okl(ab|ch)|\blab\(|\blch\(|env\(|light-dark|\bcq[whib]|:has\(|anchor/i

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.css')) out.push(full)
  }
  return out
}
const context = node => { const parts = []; for (let p = node.parent; p && p.type !== 'root'; p = p.parent) parts.unshift(p.type === 'atrule' ? `@${p.name} ${p.params}` : p.selector); return parts.join(' > ') }
const normalize = selector => selector.split(',').map(s => s.trim().replace(/\s+/g, ' ').replace(/\s*([>+~])\s*/g, '$1')).join(',')

let total = 0
for (const file of [path.join(root, 'src/styles.css'), ...walk(path.join(root, 'src/styles')), ...walk(path.join(root, 'src/pages'))]) {
  const css = fs.readFileSync(file, 'utf8')
  const ast = postcss.parse(css)
  const rules = []
  ast.walkRules(rule => { if (!(rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name))) rules.push(rule) })
  const later = new Map() // key → Map(prop → {important, modern})
  let removed = 0
  for (const rule of rules.reverse()) {
    const key = context(rule) + ' | ' + normalize(rule.selector)
    const seen = later.get(key) || new Map()
    const own = new Map()
    rule.each(decl => {
      if (decl.type !== 'decl') return
      const prop = decl.prop.toLowerCase(), next = seen.get(prop)
      if (next && (next.important || !decl.important) && !next.modern) { decl.remove(); removed++; return }
      const prev = own.get(prop)
      own.set(prop, {important: decl.important || prev?.important || false, modern: modernSyntax.test(decl.value)})
    })
    for (const [prop, info] of own) seen.set(prop, seen.get(prop) && seen.get(prop).important && !info.important ? seen.get(prop) : info)
    later.set(key, seen)
    if (rule.nodes.length === 0) rule.remove()
  }
  let changed = true
  while (changed) { changed = false; ast.walkAtRules(at => { if (at.nodes && at.nodes.length === 0) { at.remove(); changed = true } }) }
  const out = ast.toString()
  if (removed) console.log(`${path.relative(root, file)}: ${removed} overridden declarations, ${css.length} → ${out.length} bytes`)
  total += removed
  if (write && out !== css) fs.writeFileSync(file, out)
}
console.log(`${total} overridden declarations${write ? ' removed' : ' (dry run; pass --write to apply)'}`)
