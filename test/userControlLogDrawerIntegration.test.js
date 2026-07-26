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

const mountUserList = async () => {
  const routerPushes = []
  const controlLogDrawerUrl = loadVueSfcModuleUrl(controlLogDrawerFile, {
    vueImports: {
      [controlLogContentFile]: loadVueSfcModuleUrl(controlLogContentFile)
    }
  })
  const userList = await loadVueSfc(userListFile, {
    vueImports: {
      [operationDrawerFile]: loadVueSfcModuleUrl(operationDrawerFile),
      [controlLogDrawerFile]: controlLogDrawerUrl
    }
  })
  const host = {
    setup() {
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

  harness.findByText('更多', 'button').click()
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
