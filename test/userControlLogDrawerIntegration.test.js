import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { getCurrentInstance, h } from 'vue'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)
const userListFile = projectFile('src/pages/admin/user/UserListPage.vue')
const operationDrawerFile = projectFile('src/admin/components/user/UserOperationDrawer.vue')
const controlLogDrawerFile = projectFile('src/admin/components/user-control/UserControlLogDrawer.vue')
const controlLogContentFile = projectFile('src/admin/components/user-control/UserControlLogContent.vue')

// Stand-ins for the shared Pro list parts (2026-11-28): the page shell renders its slot and the table card renders the
// page's `cell` slot for every row/column, like the real EarnAdminTable. The page's own Ant row parts (Button, Space,
// Tag, Typography, Dropdown/Menu) are plain stand-ins re-exported over the real library: the 更多 Dropdown renders its
// menu inline, and each menu item is a button forwarding its click. Everything else (message, …) is the real library.
const vueUrl = import.meta.resolve('vue')
const antUrl = import.meta.resolve('ant-design-vue')
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const proListStandIns = {
  [projectFile('src/pages/admin/earn/EarnPageShell.vue')]: moduleUrl(`import { h } from '${vueUrl}'; export default { name: 'PageShellStandIn', setup(_, { slots }) { return () => h('section', slots.default?.()) } }`),
  [projectFile('src/pages/admin/earn/EarnAdminTable.vue')]: moduleUrl(`import { h } from '${vueUrl}'; export default { name: 'AdminTableStandIn', props: ['title', 'rows', 'columns', 'page', 'rowKey', 'desktopOnly', 'loading'], setup(props, { slots }) { return () => h('div', [slots.toolbar?.(), h('table', props.rows.slice(0, 10).map(record => h('tr', props.columns.map(column => h('td', slots.cell?.({ record, column }))))))]) } }`),
  'ant-design-vue': moduleUrl(`import { h } from '${vueUrl}'
export * from '${antUrl}'
const passThrough = { inheritAttrs: false, setup: (_, { attrs, slots }) => () => h('span', { 'data-testid': attrs['data-testid'] }, slots.default?.()) }
export const Space = passThrough
export const Tag = passThrough
export const TypographyText = passThrough
export const Menu = passThrough
export const MenuDivider = { render: () => null }
export const Button = { inheritAttrs: false, setup: (_, { attrs, slots }) => () => h('button', attrs, slots.default?.()) }
export const Dropdown = { setup: (_, { slots }) => () => h('span', [slots.default?.(), slots.overlay?.()]) }
export const MenuItem = { inheritAttrs: false, props: ['disabled', 'danger'], setup: (_, { attrs, slots }) => () => h('button', { role: 'menuitem', onClick: attrs.onClick }, slots.default?.()) }`)
}

const mountUserList = async () => {
  const routerPushes = []
  const controlLogDrawerUrl = loadVueSfcModuleUrl(controlLogDrawerFile, {
    vueImports: {
      [controlLogContentFile]: loadVueSfcModuleUrl(controlLogContentFile)
    }
  })
  const userList = await loadVueSfc(userListFile, {
    vueImports: {
      ...proListStandIns,
      [operationDrawerFile]: loadVueSfcModuleUrl(operationDrawerFile),
      [controlLogDrawerFile]: controlLogDrawerUrl
    }
  })
  const host = {
    setup() {
      // Keep this harness focused on drawer coordination (the row's Ant parts are stand-ins, see above).
      const components = getCurrentInstance().appContext.components
      components.RouterLink = { props: { to: String, custom: Boolean }, setup: (props, { slots }) => () => props.custom ? slots.default?.({ href: props.to, navigate: () => {} }) : h('a', { href: props.to }, slots.default?.()) }
      components['a-button'] = { inheritAttrs: false, setup: (_, { attrs, slots }) => () => h('button', attrs, slots.default?.()) }
      getCurrentInstance().appContext.config.globalProperties.$router = {
        push: async (location) => { routerPushes.push(location) }
      }
      return () => h(userList)
    }
  }
  const harness = await createSfcHarness(host)
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 320))
  await harness.flush()
  return { ...harness, routerPushes }
}

const drawerCloseButton = (harness, drawer) => harness.allNodes().find((node) => (
  drawer.contains(node) && node.getAttribute?.('aria-label') === '关闭'
))

test('point-control log action keeps the operation Drawer open, opens the child log Drawer, and restores card focus on close', async (t) => {
  const harness = await mountUserList()
  t.after(harness.cleanup)

  // 更多 opens the row Dropdown; its 全部操作 entry opens the complete operation Drawer.
  const moreTrigger = harness.allNodes().find((node) => node.getAttribute?.('aria-label') === '更多用户操作')
  assert.ok(moreTrigger, 'the row 更多 trigger is rendered')
  moreTrigger.click()
  await harness.flush()
  harness.findByText('全部操作', 'button').click()
  await harness.flush()
  await harness.finishTransitions()

  const logCard = harness.allNodes().find((node) => (
    node.tag === 'button' && node.textContent.includes('点控日志')
  ))
  assert.ok(logCard, 'the point-control log card is available in the operation Drawer')
  logCard.click()
  await harness.flush()
  await harness.finishTransitions()

  assert.equal(harness.routerPushes.length, 0)
  assert.ok(harness.findByTestId('user-operation-drawer'))
  const childDrawer = harness.findByTestId('user-control-log-drawer')
  assert.ok(childDrawer)

  drawerCloseButton(harness, childDrawer).click()
  await harness.flush()
  await harness.finishTransitions()

  assert.ok(harness.findByTestId('user-operation-drawer'))
  assert.equal(harness.document.activeElement, logCard)
})
