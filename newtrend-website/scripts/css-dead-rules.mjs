// Finds (and with --write removes) CSS selectors that cannot match anything in the site.
// A selector is dead when one of its required class/id names never appears in the site source
// (src/, index.html and the shared root modules it imports). Names inside :not/:is/:where/:has are
// not required, library classes (.ant-*, .anticon*, router-link-*) are always kept, and class names built at
// runtime are kept through the string prefixes/suffixes found in source ('tone-'+x, `${kind}-workspace`).
// Conservative by design: it only removes what is provably unreferenced. Verify visually after --write.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const write = process.argv.includes('--write')
const verbose = process.argv.includes('--verbose')
const check = process.argv.includes('--check') // exit 1 when anything is dead (used by `npm run check`)

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, exts, out)
    else if (exts.some(ext => entry.name.endsWith(ext))) out.push(full)
  }
  return out
}

const sources = [...walk(path.join(root, 'src'), ['.vue', '.js', '.mjs']), path.join(root, 'index.html'), ...walk(path.resolve(root, '../src/shared'), ['.vue', '.js'])]
const text = sources.map(file => fs.readFileSync(file, 'utf8')).join('\n')
const used = new Set([...text.matchAll(/[\w-]+/g)].map(m => m[0]))
for (const token of text.split(/[\s"'`<>{}=,;]+/)) if (token) used.add(token)
for (const token of [...used]) used.add(token.toLowerCase()) // e.g. :class="riskLevel.toLowerCase()"
const prefixes = new Set([...text.matchAll(/['"`]([a-z][\w-]*-)(?:['"`]\s*\+|\$\{)/g)].map(m => m[1]))
const suffixes = new Set([...text.matchAll(/(?:\+\s*|\})['"`]?(-[a-z][\w-]*)['"`]/g)].map(m => m[1]))
const alwaysKeep = name => /^(ant-|anticon|router-link-)/.test(name)
const isUsed = name => alwaysKeep(name) || used.has(name) || [...prefixes].some(p => name.startsWith(p)) || [...suffixes].some(s => name.endsWith(s))
const optionalPseudos = new Set([':not', ':is', ':where', ':has', ':matches', ':-webkit-any', ':-moz-any'])

function deadName(selector) {
  let dead = null
  selectorParser(sel => {
    sel.walk(node => {
      if (dead) return false
      if (node.type === 'pseudo' && optionalPseudos.has(node.value.toLowerCase())) return false // children not required
      if ((node.type === 'class' || node.type === 'id') && !isUsed(node.value)) dead = (node.type === 'class' ? '.' : '#') + node.value
    })
  }).processSync(selector)
  return dead
}

const files = [path.join(root, 'src/source-theme.css'), path.join(root, 'src/styles.css'), ...walk(path.join(root, 'src/styles'), ['.css']), ...walk(path.join(root, 'src/pages'), ['.css'])]
let totalBefore = 0, totalAfter = 0
for (const file of files) {
  const css = fs.readFileSync(file, 'utf8')
  const ast = postcss.parse(css)
  let removed = 0
  ast.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const keep = rule.selectors.filter(sel => {
      const dead = deadName(sel)
      if (dead && verbose) console.log(`  ${path.relative(root, file)}: ${sel}  (${dead})`)
      return !dead
    })
    if (keep.length === rule.selectors.length) return
    removed += rule.selectors.length - keep.length
    if (keep.length) rule.selectors = keep
    else rule.remove()
  })
  // Keyframes no remaining rule (or source) refers to.
  const remaining = ast.toString()
  ast.walkAtRules(/keyframes$/i, at => {
    const name = at.params.trim()
    const refs = remaining.split(name).length - 1
    if (refs <= 1 && !used.has(name)) { at.remove(); removed++ }
  })
  let changed = true
  while (changed) { changed = false; ast.walkAtRules(at => { if (at.nodes && at.nodes.length === 0) { at.remove(); changed = true } }) }
  const out = ast.toString()
  totalBefore += css.length; totalAfter += out.length
  if (removed) console.log(`${path.relative(root, file)}: ${removed} dead selectors, ${css.length} → ${out.length} bytes`)
  if (write && out !== css) fs.writeFileSync(file, out)
}
console.log(`total ${totalBefore} → ${totalAfter} bytes${write ? ' (written)' : ' (dry run; pass --write to apply)'}`)
if (check && totalAfter !== totalBefore && !write) process.exitCode = 1
