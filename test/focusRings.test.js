// AGENTS.md "No highlighted selection/focus borders": no focus rings, outlines, focus shadows or focus border
// highlights. The single focus cue lives in src/styles/theme.css (2026-11-27); this test keeps utility classes and
// stylesheet rules from reintroducing rings.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
const files = walk(root).filter((file) => /\.(vue|js|css)$/.test(file))
const rel = (file) => path.relative(root, file)

test('no Tailwind focus ring, outline, shadow or border utilities', () => {
  const utility = /(?<![\w:/[-])(?:[\w[\]&-]+:)*(?:group-|peer-)?focus(?:-visible|-within)?(?::[\w[\]-]+)*:(?:ring|ring-offset|border|shadow|outline(?!-none\b|-0\b))(?:-[^\s"'`,)]*)?(?=[\s"'`,)]|$)/
  const hits = files.filter((file) => !file.endsWith('.css')).flatMap((file) => {
    const match = fs.readFileSync(file, 'utf8').match(utility)
    return match ? [`${rel(file)}: ${match[0]}`] : []
  })
  assert.deepEqual(hits, [])
})

test('stylesheets draw no outline, ring or border colour on focus outside forced-colors mode', () => {
  const hits = []
  for (const file of files) {
    let css = fs.readFileSync(file, 'utf8')
    if (file.endsWith('.vue')) css = [...css.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    css = css.replace(/@media\s*\(forced-colors:\s*active\)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    for (const [, selector, body] of css.matchAll(/([^{}]*:focus[^{]*)\{([^}]*)\}/g)) {
      for (const [, prop, value] of body.matchAll(/(outline|box-shadow|border(?:-(?:top|right|bottom|left))?-color)\s*:\s*([^;]+)/g)) {
        const v = value.replace(/!important/, '').trim()
        if (prop === 'outline' && /^(none|0)$/.test(v)) continue
        if (prop === 'box-shadow' && v === 'none') continue
        if (prop.endsWith('color') && v === '#d9d9d9' && rel(file) === 'styles/theme.css') continue // resting Ant border
        hits.push(`${rel(file)}: ${selector.trim().slice(-60)} { ${prop}: ${v} }`)
      }
    }
  }
  assert.deepEqual(hits, [])
})
