import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createSfcHarness, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const adjustFile = resolve(process.cwd(), 'src/admin/components/user/UserAdjustAction.vue')
const panelFile = resolve(process.cwd(), 'src/admin/components/form/PanelSingleSelect.vue')
const creditScoreMockFile = resolve(process.cwd(), 'src/admin/mock/creditScore.js')
const creditScoreConstantsFile = resolve(process.cwd(), 'src/admin/constants/creditScore.js')
const source = () => readFileSync(adjustFile, 'utf8')

const user = {
  id: 'user_adjust_choices',
  username: '选择测试用户',
  vipLevel: 1,
  creditScore: 100
}

const loadAdjustAction = async () => {
  const panelModuleUrl = loadVueSfcModuleUrl(panelFile)
  const creditScoreModuleUrl = `data:text/javascript;base64,${Buffer.from(
    readFileSync(creditScoreMockFile, 'utf8').replace(
      "from '../constants/creditScore'",
      `from '${pathToFileURL(creditScoreConstantsFile).href}'`
    )
  ).toString('base64')}`
  const { descriptor, errors } = parse(source(), { filename: adjustFile })
  if (errors.length) throw errors[0]
  let code = compileScript(descriptor, {
    id: `adjust-action-${Buffer.from(adjustFile).toString('hex')}`,
    inlineTemplate: true
  }).content
  const imports = new Map([
    ['vue', import.meta.resolve('vue')],
    ['../../mock/vip', pathToFileURL(resolve(dirname(adjustFile), '../../mock/vip.js')).href],
    ['../../mock/creditScore', creditScoreModuleUrl],
    ['../../constants/creditScore', pathToFileURL(creditScoreConstantsFile).href],
    ['../../composables/useDialogLifecycle.js', pathToFileURL(resolve(dirname(adjustFile), '../../composables/useDialogLifecycle.js')).href],
    ['../form/PanelSingleSelect.vue', panelModuleUrl]
  ])
  code = code.replace(
    /(from\s+)(['"])([^'"]+)(\2)/g,
    (_, prefix, quote, specifier) => `${prefix}${quote}${imports.get(specifier) || specifier}${quote}`
  )
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default
}

const openDialog = async (harness) => {
  const trigger = harness.allNodes().find((node) => (
    node.tag === 'button' && node.textContent.includes('调整')
  ))
  assert.ok(trigger, 'expected adjustment trigger')
  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
}

const setQuery = async (harness, value) => {
  const input = harness.findByTestId('panel-single-select-search')
  assert.ok(input)
  input.value = value
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
}

const options = (harness) => harness.allNodes().filter((node) => (
  node.getAttribute?.('role') === 'option'
))

const selectRadio = async (harness, name, value) => {
  const radio = harness.allNodes().find((node) => (
    node.tag === 'input' &&
    node.getAttribute?.('type') === 'radio' &&
    node.getAttribute('name') === name &&
    Object.is(node.value, value)
  ))
  assert.ok(radio, `expected ${name} radio for ${value}`)
  radio.checked = true
  radio.dispatchEvent({ type: 'change', target: radio })
  await harness.flush()
  return radio
}

test('VIP choices are a labelled native radio-card group with numeric levels', async (t) => {
  const component = await loadAdjustAction()
  const harness = await createSfcHarness(component, { user })
  t.after(harness.cleanup)
  await openDialog(harness)

  const fieldset = harness.allNodes().find((node) => node.tag === 'fieldset' && node.textContent.includes('调整为'))
  assert.ok(fieldset)
  const legend = harness.allNodes().find((node) => (
    node.tag === 'legend' && fieldset.contains(node)
  ))
  assert.equal(legend.textContent.trim(), '调整为')

  const radios = harness.allNodes().filter((node) => (
    node.tag === 'input' &&
    node.getAttribute?.('type') === 'radio' &&
    node.getAttribute('name') === 'vip-target-level' &&
    fieldset.contains(node)
  ))
  assert.ok(radios.length > 1)
  assert.ok(radios.every((radio) => typeof radio.value === 'number'))
  assert.ok(radios.every((radio) => (
    harness.allNodes().some((node) => node.tag === 'label' && node.contains(radio))
  )))

  const ruleTrigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(harness.findByTestId('panel-single-select-required'), undefined)
  assert.equal(ruleTrigger.getAttribute('aria-describedby'), null)
})

test('earn rule search stays draft until commit and preserves the exact adjustment payload', async (t) => {
  const component = await loadAdjustAction()
  const harness = await createSfcHarness(component, { user }, { onSubmit: () => {} })
  t.after(harness.cleanup)
  await openDialog(harness)

  await selectRadio(harness, 'vip-target-level', 2)
  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.match(trigger.textContent, /活动奖励（\+3）/)
  trigger.click()
  await harness.flush()

  await setQuery(harness, '推荐奖励')
  assert.deepEqual(options(harness).map((option) => option.textContent), ['推荐奖励（+5）'])
  assert.match(trigger.textContent, /活动奖励（\+3）/)
  assert.deepEqual(harness.emitted, [])

  options(harness)[0].click()
  await harness.finishTransitions()
  assert.match(trigger.textContent, /推荐奖励（\+5）/)

  const remark = harness.allNodes().find((node) => node.tag === 'textarea')
  remark.value = ' 运营调整 '
  remark.dispatchEvent({ type: 'input', target: remark })
  await harness.flush()
  harness.findByText('确认调整', 'button').click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    {
      type: 'adjust',
      userId: 'user_adjust_choices',
      vip: { from: 1, to: 2 },
      creditScore: {
        changeType: 'manual_adjust',
        before: 100,
        delta: 5,
        after: 105,
        rule: { id: 'earn_referral', name: '推荐奖励', score: 5 }
      },
      remark: '运营调整'
    }
  ]])
})

test('deduction rule search uses direction metadata and preserves the deduction payload', async (t) => {
  const component = await loadAdjustAction()
  const harness = await createSfcHarness(component, { user }, { onSubmit: () => {} })
  t.after(harness.cleanup)
  await openDialog(harness)

  await selectRadio(harness, 'credit-score-direction', 'decrease')
  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.match(trigger.textContent, /违规行为（-10）/)
  trigger.click()
  await harness.flush()
  await setQuery(harness, '扣分')
  assert.equal(options(harness).length, 7)
  await setQuery(harness, '风控')
  assert.deepEqual(options(harness).map((option) => option.textContent), ['风控预警（-5）'])
  assert.match(trigger.textContent, /违规行为（-10）/)

  options(harness)[0].click()
  await harness.finishTransitions()
  harness.findByText('确认调整', 'button').click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    {
      type: 'adjust',
      userId: 'user_adjust_choices',
      vip: null,
      creditScore: {
        changeType: 'manual_adjust',
        before: 100,
        delta: -5,
        after: 95,
        rule: { id: 'risk_alert', name: '风控预警', score: 5 }
      },
      remark: ''
    }
  ]])
})

test('adjustment source removes legacy selects and maps both rule lists to the shared panel selector', () => {
  assert.doesNotMatch(source(), /<select\b/)
  assert.match(source(), /import PanelSingleSelect from '\.\.\/form\/PanelSingleSelect\.vue'/)
  assert.match(source(), /v-model="form\.earnRuleId"/)
  assert.match(source(), /v-model="form\.deductionRuleId"/)
  assert.match(source(), /searchText:/)
  assert.doesNotMatch(source(), /ensureRuleSelection/)
})
