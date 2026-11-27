import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

const sourceFiles = [
  '../src/admin/components/user-control/UserControlModal.vue',
  '../src/admin/components/MfaVerificationModal.vue',
  '../src/pages/admin/user/UserListPage.vue',
  '../src/pages/admin/user-control/ModuleUserControlPage.vue'
]

test('compiled dialog utilities keep vh fallbacks and place dvh overrides inside feature queries', async () => {
  const content = sourceFiles.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')
  const result = await postcss([
    tailwindcss({
      content: [{ raw: content, extension: 'vue' }],
      corePlugins: { preflight: false }
    })
  ]).process('@tailwind utilities;', { from: undefined })

  const declarations = []
  result.root.walkDecls((declaration) => {
    declarations.push({
      property: declaration.prop,
      value: declaration.value,
      supports: declaration.parent.parent?.type === 'atrule'
        ? declaration.parent.parent.params
        : ''
    })
  })

  for (const [property, fallback, dynamic] of [
    ['max-height', 'calc(100vh - 1.5rem)', 'calc(100dvh - 1.5rem)'],
    ['max-height', 'calc(100vh - 2rem)', 'calc(100dvh - 2rem)'],
    ['min-height', '100vh', '100dvh']
  ]) {
    const fallbackIndex = declarations.findIndex((item) => (
      item.property === property && item.value === fallback && !item.supports
    ))
    const dynamicIndex = declarations.findIndex((item) => (
      item.property === property
      && item.value === dynamic
      && item.supports.replace(/\s/g, '') === '(height:100dvh)'
    ))

    assert.notEqual(fallbackIndex, -1, `missing ${property} ${fallback} fallback`)
    assert.notEqual(dynamicIndex, -1, `missing supported ${property} ${dynamic} override`)
    assert.ok(dynamicIndex > fallbackIndex, `${dynamic} must compile after ${fallback}`)
  }
})
