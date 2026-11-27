<script setup>
// 信用分配置 — Ant Design Pro config page (2026-11-28): PageShell title, grouped Cards (基础配置 / 获取规则 / 扣除规则 /
// 人工审核) with Ant Form controls instead of the hand-built tab bar, the live calculator in a sticky side Card, and a
// bottom action bar (primary 保存配置 + default 重置). Feedback is toast-only (Ant message); invalid fields keep
// aria-invalid and an error status.
// Data fixes: the 有未保存的修改 badge was set by a deep watcher that also fired right after loading, so it showed on
// every visit; it is now a comparison with the saved snapshot. Saved custom rule lists were the same arrays as the
// drafts (and the mock config), so editing a draft after saving changed the preview and the mock without saving; they
// are now copied on load and save.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Checkbox, CheckboxGroup, Col, Descriptions, DescriptionsItem, Divider, Form, FormItem, Input, InputNumber, Row, Space, Statistic, Switch, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { getAllCreditScoreConfig, updateCreditScoreConfigs } from '../../../admin/mock/creditScore'
import { CREDIT_SCORE_CONFIG_KEYS, CREDIT_SCORE_CHANGE_TYPE, CREDIT_SCORE_CHANGE_TYPE_OPTIONS } from '../../../admin/constants/creditScore'

const clone = (value) => JSON.parse(JSON.stringify(value ?? null))

// 表单数据
const formData = ref({
  maxScore: 800,
  initialScore: 60,
  rechargeAmount: 100000,
  primaryKycScore: 0,
  advancedKycScore: 0,
  autoUpgradeVip1Enabled: true,
  autoUpgradeVip1Score: 61,
  vipUpgradeRechargeAmount: 100000,

  // 扣除规则
  deductionEnabled: true,
  violationScore: 10,
  abnormalTradeScore: 5,
  inactiveDays: 90,
  inactiveScore: 3,
  withdrawFailScore: 2,
  disputeScore: 8,
  maliciousScore: 20,
  riskAlertScore: 5,
  minScore: 0,

  // 自定义扣分行为（扩展规则）
  deductionCustomRules: [],

  // 自定义加分行为（扩展规则）
  earnCustomRules: [],

  // 人工审核
  manualAuditEnabled: true,
  manualAuditThreshold: 10,
  manualAuditTypes: [
    CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST,
    CREDIT_SCORE_CHANGE_TYPE.PENALTY,
    CREDIT_SCORE_CHANGE_TYPE.REWARD
  ]
})

// 保存状态
const isSaving = ref(false)
const savedSnapshot = ref('')

// 验证错误（字段状态与 aria-invalid；文字反馈走 toast）
const validationErrors = ref({
  initialScore: '',
  rechargeAmount: '',
  autoUpgradeVip1Score: ''
})

// 计算器输入
const calculatorInputs = ref({
  rechargeAmount: 500000,
  hasPrimaryKyc: false,
  hasAdvancedKyc: false,

  // 扣除场景
  hasViolation: false,
  hasAbnormalTrade: false,
  hasDispute: false,

  // 自定义扣分行为勾选
  customDeductionSelected: {},

  // 自定义加分行为勾选
  customEarnSelected: {}
})

// 自定义扣分行为表单
const customDeductionDraft = ref({
  name: '',
  score: 1
})

// 自定义扣分表的 draft：编辑时不影响右侧预览，直到保存配置才生效
const deductionCustomRulesDraft = ref([])

// 自定义加分行为表单（draft）
const customEarnDraft = ref({
  name: '',
  score: 1
})

// 自定义加分表的 draft：编辑时不影响右侧预览，直到保存配置才生效
const earnCustomRulesDraft = ref([])

const snapshot = () => JSON.stringify({
  form: { ...formData.value, deductionCustomRules: undefined, earnCustomRules: undefined },
  deduction: deductionCustomRulesDraft.value,
  earn: earnCustomRulesDraft.value
})
const hasUnsavedChanges = computed(() => Boolean(savedSnapshot.value) && snapshot() !== savedSnapshot.value)

// 计算总信用分
const calculatedScore = computed(() => {
  let score = Number(formData.value.initialScore) || 0

  // 充值增加
  if (formData.value.rechargeAmount > 0) {
    const rechargeScore = Math.floor((Number(calculatorInputs.value.rechargeAmount) || 0) / formData.value.rechargeAmount)
    score += rechargeScore
  }

  // 认证增加
  if (calculatorInputs.value.hasPrimaryKyc) {
    score += Number(formData.value.primaryKycScore) || 0
  }
  if (calculatorInputs.value.hasAdvancedKyc) {
    score += Number(formData.value.advancedKycScore) || 0
  }

  // 自定义加分行为（基于已保存配置进行预览）
  {
    const selected = calculatorInputs.value.customEarnSelected || {}
    const rules = formData.value.earnCustomRules || []
    for (const rule of rules) {
      if (selected[rule.id]) {
        score += Number(rule.score || 0)
      }
    }
  }

  // 扣除场景（扣除规则默认始终启用）
  const selected = calculatorInputs.value.customDeductionSelected || {}
  const customRules = formData.value.deductionCustomRules || []
  for (const rule of customRules) {
    if (selected[rule.id]) {
      score -= Number(rule.score || 0)
    }
  }

  // 不超过最大值，不低于最小值
  return Math.max(Number(formData.value.minScore) || 0, Math.min(score, Number(formData.value.maxScore) || 0))
})

// 计算能否升级VIP1
const canUpgradeToVip1 = computed(() => {
  return formData.value.autoUpgradeVip1Enabled &&
         calculatedScore.value >= formData.value.autoUpgradeVip1Score
})

function resetCalculatorSelections() {
  calculatorInputs.value.customDeductionSelected = {}
  for (const rule of formData.value.deductionCustomRules || []) {
    calculatorInputs.value.customDeductionSelected[rule.id] = false
  }
  calculatorInputs.value.customEarnSelected = {}
  for (const rule of formData.value.earnCustomRules || []) {
    calculatorInputs.value.customEarnSelected[rule.id] = false
  }
}

// 加载配置
function loadConfig() {
  const config = clone(getAllCreditScoreConfig())
  formData.value = {
    maxScore: config[CREDIT_SCORE_CONFIG_KEYS.MAX_SCORE],
    initialScore: config[CREDIT_SCORE_CONFIG_KEYS.INITIAL_SCORE],
    rechargeAmount: config[CREDIT_SCORE_CONFIG_KEYS.RECHARGE_AMOUNT],
    primaryKycScore: config[CREDIT_SCORE_CONFIG_KEYS.PRIMARY_KYC_SCORE],
    advancedKycScore: config[CREDIT_SCORE_CONFIG_KEYS.ADVANCED_KYC_SCORE],
    autoUpgradeVip1Enabled: config[CREDIT_SCORE_CONFIG_KEYS.AUTO_UPGRADE_VIP1_ENABLED],
    autoUpgradeVip1Score: config[CREDIT_SCORE_CONFIG_KEYS.AUTO_UPGRADE_VIP1_SCORE],
    vipUpgradeRechargeAmount: config[CREDIT_SCORE_CONFIG_KEYS.VIP_UPGRADE_RECHARGE_AMOUNT],

    // UI 删除“启用扣除规则”开关：扣除规则始终启用
    deductionEnabled: true,
    violationScore: config[CREDIT_SCORE_CONFIG_KEYS.VIOLATION_SCORE],
    abnormalTradeScore: config[CREDIT_SCORE_CONFIG_KEYS.ABNORMAL_TRADE_SCORE],
    inactiveDays: config[CREDIT_SCORE_CONFIG_KEYS.INACTIVE_DAYS],
    inactiveScore: config[CREDIT_SCORE_CONFIG_KEYS.INACTIVE_SCORE],
    withdrawFailScore: config[CREDIT_SCORE_CONFIG_KEYS.WITHDRAW_FAIL_SCORE],
    disputeScore: config[CREDIT_SCORE_CONFIG_KEYS.DISPUTE_SCORE],
    maliciousScore: config[CREDIT_SCORE_CONFIG_KEYS.MALICIOUS_SCORE],
    riskAlertScore: config[CREDIT_SCORE_CONFIG_KEYS.RISK_ALERT_SCORE],
    minScore: config[CREDIT_SCORE_CONFIG_KEYS.MIN_SCORE],

    deductionCustomRules: config[CREDIT_SCORE_CONFIG_KEYS.DEDUCTION_CUSTOM_RULES] || [],

    // 自定义加分行为
    earnCustomRules: config[CREDIT_SCORE_CONFIG_KEYS.EARN_CUSTOM_RULES] || [],

    // 人工审核
    manualAuditEnabled: config[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_ENABLED] || false,
    manualAuditThreshold: config[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_THRESHOLD] || 10,
    manualAuditTypes: config[CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_TYPES] || [
      CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST,
      CREDIT_SCORE_CHANGE_TYPE.PENALTY,
      CREDIT_SCORE_CHANGE_TYPE.REWARD
    ]
  }

  // 初始化自定义扣分/加分表 draft（编辑时不影响预览）
  deductionCustomRulesDraft.value = clone(formData.value.deductionCustomRules || [])
  earnCustomRulesDraft.value = clone(formData.value.earnCustomRules || [])

  resetCalculatorSelections()
  clearValidation()
  savedSnapshot.value = snapshot()
}

onMounted(loadConfig)

function clearValidation() {
  validationErrors.value = {
    initialScore: '',
    rechargeAmount: '',
    autoUpgradeVip1Score: ''
  }
}

// 表单验证
const validateForm = () => {
  clearValidation()
  const f = formData.value

  if (f.initialScore === null || f.initialScore === '' || f.initialScore < 0 || f.initialScore > f.maxScore) {
    validationErrors.value.initialScore = `初始分数必须在 0 到 ${f.maxScore} 之间`
  }

  if (f.rechargeAmount === null || f.rechargeAmount === '' || f.rechargeAmount < 0) {
    validationErrors.value.rechargeAmount = '充值金额必须大于等于 0'
  }

  if (f.autoUpgradeVip1Enabled && !(f.autoUpgradeVip1Score > 0)) {
    validationErrors.value.autoUpgradeVip1Score = '自动升级VIP1的信用分必须大于 0'
  }

  const errors = Object.values(validationErrors.value).filter(Boolean)
  if (errors.length) message.error(errors.join('；'))
  return errors.length === 0
}

const createCustomRuleId = () => {
  return `deduction_custom_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function validateCustomDraft(draft, verb) {
  const name = String(draft.name || '').trim()
  const score = Number(draft.score)
  if (!name) return { error: '请填写行为名称' }
  if (draft.score === null || draft.score === '' || !Number.isFinite(score) || score < 0) return { error: `${verb}必须是 >= 0 的数字` }
  if (score > formData.value.maxScore) return { error: `${verb}不能超过最大分数（${formData.value.maxScore}）` }
  return { name, score }
}

const addCustomDeductionRule = () => {
  const { error, name, score } = validateCustomDraft(customDeductionDraft.value, '扣分')
  if (error) {
    message.error(error)
    return
  }
  const id = createCustomRuleId()
  deductionCustomRulesDraft.value.push({ id, name, score })
  calculatorInputs.value.customDeductionSelected[id] = false
  customDeductionDraft.value = { name: '', score: 1 }
}

const removeCustomDeductionRule = (id) => {
  deductionCustomRulesDraft.value = (deductionCustomRulesDraft.value || []).filter((r) => r.id !== id)
}

const addCustomEarnRule = () => {
  const { error, name, score } = validateCustomDraft(customEarnDraft.value, '加分')
  if (error) {
    message.error(error)
    return
  }
  const id = createCustomRuleId()
  earnCustomRulesDraft.value.push({ id, name, score })
  calculatorInputs.value.customEarnSelected[id] = false
  customEarnDraft.value = { name: '', score: 1 }
}

const removeCustomEarnRule = (id) => {
  earnCustomRulesDraft.value = (earnCustomRulesDraft.value || []).filter((r) => r.id !== id)
}

// 保存配置
const saveConfig = () => {
  if (isSaving.value) return
  if (!validateForm()) return
  const emptyName = [...deductionCustomRulesDraft.value, ...earnCustomRulesDraft.value].some((rule) => !String(rule.name || '').trim())
  if (emptyName) {
    message.error('自定义行为名称不能为空')
    return
  }

  isSaving.value = true

  // 模拟保存
  setTimeout(() => {
    // 将自定义扣分/加分表 draft 的副本提交到正式配置里，更新右侧预览
    formData.value.deductionCustomRules = clone(deductionCustomRulesDraft.value)
    formData.value.earnCustomRules = clone(earnCustomRulesDraft.value)
    resetCalculatorSelections()

    updateCreditScoreConfigs(clone({
      [CREDIT_SCORE_CONFIG_KEYS.ENABLED]: true,
      [CREDIT_SCORE_CONFIG_KEYS.MAX_SCORE]: formData.value.maxScore,
      [CREDIT_SCORE_CONFIG_KEYS.INITIAL_SCORE]: formData.value.initialScore,
      [CREDIT_SCORE_CONFIG_KEYS.RECHARGE_AMOUNT]: formData.value.rechargeAmount,
      [CREDIT_SCORE_CONFIG_KEYS.PRIMARY_KYC_SCORE]: formData.value.primaryKycScore,
      [CREDIT_SCORE_CONFIG_KEYS.ADVANCED_KYC_SCORE]: formData.value.advancedKycScore,
      [CREDIT_SCORE_CONFIG_KEYS.AUTO_UPGRADE_VIP1_ENABLED]: formData.value.autoUpgradeVip1Enabled,
      [CREDIT_SCORE_CONFIG_KEYS.AUTO_UPGRADE_VIP1_SCORE]: formData.value.autoUpgradeVip1Score,
      [CREDIT_SCORE_CONFIG_KEYS.VIP_UPGRADE_RECHARGE_AMOUNT]: formData.value.vipUpgradeRechargeAmount,

      // 扣除规则
      [CREDIT_SCORE_CONFIG_KEYS.DEDUCTION_ENABLED]: true,
      [CREDIT_SCORE_CONFIG_KEYS.VIOLATION_SCORE]: formData.value.violationScore,
      [CREDIT_SCORE_CONFIG_KEYS.ABNORMAL_TRADE_SCORE]: formData.value.abnormalTradeScore,
      [CREDIT_SCORE_CONFIG_KEYS.INACTIVE_DAYS]: formData.value.inactiveDays,
      [CREDIT_SCORE_CONFIG_KEYS.INACTIVE_SCORE]: formData.value.inactiveScore,
      [CREDIT_SCORE_CONFIG_KEYS.WITHDRAW_FAIL_SCORE]: formData.value.withdrawFailScore,
      [CREDIT_SCORE_CONFIG_KEYS.DISPUTE_SCORE]: formData.value.disputeScore,
      [CREDIT_SCORE_CONFIG_KEYS.MALICIOUS_SCORE]: formData.value.maliciousScore,
      [CREDIT_SCORE_CONFIG_KEYS.RISK_ALERT_SCORE]: formData.value.riskAlertScore,
      [CREDIT_SCORE_CONFIG_KEYS.MIN_SCORE]: formData.value.minScore,
      [CREDIT_SCORE_CONFIG_KEYS.DEDUCTION_CUSTOM_RULES]: formData.value.deductionCustomRules,
      [CREDIT_SCORE_CONFIG_KEYS.EARN_CUSTOM_RULES]: formData.value.earnCustomRules,

      // 人工审核
      [CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_ENABLED]: formData.value.manualAuditEnabled,
      [CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_THRESHOLD]: formData.value.manualAuditThreshold,
      [CREDIT_SCORE_CONFIG_KEYS.MANUAL_AUDIT_TYPES]: formData.value.manualAuditTypes
    }))

    savedSnapshot.value = snapshot()
    isSaving.value = false
    message.success('配置已成功保存！')
  }, 500)
}

function resetConfig() {
  if (isSaving.value) return
  loadConfig()
  message.info('已恢复为已保存的配置')
}

// 格式化数字
const formatNumber = (value) => {
  if (!value && value !== 0) return '0'
  return new Intl.NumberFormat('zh-CN').format(value)
}

const customRuleColumns = (scoreTitle) => [
  { key: 'name', title: '行为名称' },
  { key: 'score', title: scoreTitle, width: 180 },
  { key: 'actions', title: '操作', width: 80 }
]
const earnColumns = customRuleColumns('加分')
const deductionColumns = customRuleColumns('扣分')
const auditTypeOptions = CREDIT_SCORE_CHANGE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))
</script>

<template>
  <PageShell title="信用分配置" class="credit-score-config" :style="{ paddingBottom: 0 }">
    <template #description>
      <TypographyText type="secondary">配置信用分规则、自动升级策略，并在右侧计算器实时预览效果。</TypographyText>
    </template>

    <Row :gutter="[24, 24]" align="top">
      <Col :xs="24" :xl="16">
        <Form name="credit-score-config" layout="vertical" :model="formData" class="credit-score-config-form">
          <Card title="基础配置" :bordered="false">
            <Row :gutter="24">
              <Col :xs="24" :md="12">
                <FormItem label="最大分数" extra="信用分上限">
                  <InputNumber v-model:value="formData.maxScore" :min="0" :max="1000" :precision="0" class="credit-score-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="12">
                <FormItem label="初始分数" extra="新用户默认分数" :validate-status="validationErrors.initialScore ? 'error' : undefined">
                  <InputNumber v-model:value="formData.initialScore" :min="0" :max="formData.maxScore" :precision="0" :aria-invalid="validationErrors.initialScore ? 'true' : undefined" class="credit-score-number" />
                </FormItem>
              </Col>
            </Row>
            <Divider />
            <FormItem label="VIP 自动升级" extra="根据信用分自动升级 VIP 等级">
              <Switch v-model:checked="formData.autoUpgradeVip1Enabled" checked-children="开启" un-checked-children="关闭" aria-label="信用分自动升级 VIP" />
            </FormItem>
            <Row v-if="formData.autoUpgradeVip1Enabled" :gutter="24">
              <Col :xs="24" :md="12">
                <FormItem label="升级到 VIP1 所需信用分" extra="普通用户达到此分数自动升级为 VIP1" :validate-status="validationErrors.autoUpgradeVip1Score ? 'error' : undefined">
                  <InputNumber v-model:value="formData.autoUpgradeVip1Score" :min="0" :max="formData.maxScore" :precision="0" :aria-invalid="validationErrors.autoUpgradeVip1Score ? 'true' : undefined" class="credit-score-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="12">
                <FormItem label="VIP 升级充值金额（USDT）" extra="VIP 用户每充值该金额升一级，例如 VIP1 用户充值该金额后自动升级为 VIP2">
                  <InputNumber v-model:value="formData.vipUpgradeRechargeAmount" :min="0" :step="1000" class="credit-score-number" />
                </FormItem>
              </Col>
            </Row>
            <TypographyText v-else type="secondary">自动升级功能已关闭</TypographyText>
          </Card>

          <Card title="获取规则" :bordered="false">
            <Row :gutter="24">
              <Col :xs="24" :md="12">
                <FormItem label="充值规则：每充值（USDT）获得 +1 信用分" :extra="`例如：设置为 ${formatNumber(100000)}，用户充值 ${formatNumber(500000)} USDT 将获得 5 信用分`" :validate-status="validationErrors.rechargeAmount ? 'error' : undefined">
                  <InputNumber v-model:value="formData.rechargeAmount" :min="0" :step="1000" :aria-invalid="validationErrors.rechargeAmount ? 'true' : undefined" class="credit-score-number" />
                </FormItem>
              </Col>
            </Row>
            <Row :gutter="24">
              <Col :xs="24" :md="12">
                <FormItem label="初级认证奖励（信用分）">
                  <InputNumber v-model:value="formData.primaryKycScore" :min="0" :max="formData.maxScore" :precision="0" class="credit-score-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="12">
                <FormItem label="高级认证奖励（信用分）">
                  <InputNumber v-model:value="formData.advancedKycScore" :min="0" :max="formData.maxScore" :precision="0" class="credit-score-number" />
                </FormItem>
              </Col>
            </Row>
            <Divider orientation="left" orientation-margin="0">自定义加分行为</Divider>
            <Row :gutter="24" align="bottom">
              <Col :xs="24" :md="10">
                <FormItem label="行为名称">
                  <Input v-model:value="customEarnDraft.name" placeholder="例如：活动奖励" :maxlength="40" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="8">
                <FormItem label="加分">
                  <InputNumber v-model:value="customEarnDraft.score" :min="0" :max="formData.maxScore" addon-before="+" addon-after="分" class="credit-score-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="6">
                <FormItem>
                  <Button @click="addCustomEarnRule"><template #icon><PlusOutlined /></template>添加</Button>
                </FormItem>
              </Col>
            </Row>
            <Table :columns="earnColumns" :data-source="earnCustomRulesDraft" row-key="id" :pagination="false" size="middle" :locale="{ emptyText: '暂无自定义加分项' }">
              <template #bodyCell="{ column, record }">
                <Input v-if="column.key === 'name'" v-model:value="record.name" :maxlength="40" aria-label="加分行为名称" />
                <InputNumber v-else-if="column.key === 'score'" v-model:value="record.score" :min="0" :max="formData.maxScore" addon-before="+" addon-after="分" aria-label="加分" />
                <Button v-else-if="column.key === 'actions'" type="link" danger class="px-0" @click="removeCustomEarnRule(record.id)">删除</Button>
              </template>
            </Table>
          </Card>

          <Card title="扣除规则" :bordered="false">
            <TypographyText type="secondary">扣除规则始终启用，请根据实际情况合理设置扣分力度。</TypographyText>
            <Divider orientation="left" orientation-margin="0">自定义扣分行为</Divider>
            <Row :gutter="24" align="bottom">
              <Col :xs="24" :md="10">
                <FormItem label="行为名称">
                  <Input v-model:value="customDeductionDraft.name" placeholder="例如：违规退款" :maxlength="40" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="8">
                <FormItem label="扣分">
                  <InputNumber v-model:value="customDeductionDraft.score" :min="0" :max="formData.maxScore" addon-before="-" addon-after="分" class="credit-score-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="6">
                <FormItem>
                  <Button @click="addCustomDeductionRule"><template #icon><PlusOutlined /></template>添加</Button>
                </FormItem>
              </Col>
            </Row>
            <Table :columns="deductionColumns" :data-source="deductionCustomRulesDraft" row-key="id" :pagination="false" size="middle" :locale="{ emptyText: '暂无自定义扣分项' }">
              <template #bodyCell="{ column, record }">
                <Input v-if="column.key === 'name'" v-model:value="record.name" :maxlength="40" aria-label="扣分行为名称" />
                <InputNumber v-else-if="column.key === 'score'" v-model:value="record.score" :min="0" :max="formData.maxScore" addon-before="-" addon-after="分" aria-label="扣分" />
                <Button v-else-if="column.key === 'actions'" type="link" danger class="px-0" @click="removeCustomDeductionRule(record.id)">删除</Button>
              </template>
            </Table>
            <Divider />
            <Row :gutter="24">
              <Col :xs="24" :md="12">
                <FormItem label="最低分数保护" extra="扣分后不会低于此值（0 表示无保护）">
                  <InputNumber v-model:value="formData.minScore" :min="0" :max="formData.maxScore" :precision="0" class="credit-score-number" />
                </FormItem>
              </Col>
            </Row>
          </Card>

          <Card title="人工审核" :bordered="false">
            <FormItem label="启用人工审核" extra="开启后，同时满足所选变动类型和阈值的积分变动进入待审核队列，在「信用分变动审核」页面审批通过后才生效，拒绝则不生效。">
              <Switch v-model:checked="formData.manualAuditEnabled" checked-children="开启" un-checked-children="关闭" aria-label="人工审核" />
            </FormItem>
            <template v-if="formData.manualAuditEnabled">
              <Row :gutter="24">
                <Col :xs="24" :md="12">
                  <FormItem label="审核阈值（分）" :extra="`积分变动绝对值超过该值时需要审核。当前阈值 ${formData.manualAuditThreshold ?? 0} 分：手动调整 +15 分需要审核，未勾选类型（如充值 +5 分）无需审核。`">
                    <InputNumber v-model:value="formData.manualAuditThreshold" :min="0" :max="formData.maxScore" :precision="0" class="credit-score-number" />
                  </FormItem>
                </Col>
              </Row>
              <FormItem label="需要审核的变动类型" extra="勾选的变动类型在满足阈值条件时需要人工审核">
                <CheckboxGroup v-model:value="formData.manualAuditTypes" :options="auditTypeOptions" />
              </FormItem>
            </template>
            <TypographyText v-else type="secondary">人工审核已关闭，所有积分变动将自动生效</TypographyText>
          </Card>
        </Form>
      </Col>

      <Col :xs="24" :xl="8" class="credit-score-aside">
        <Card title="实时计算器" :bordered="false">
          <Form name="credit-score-calculator" layout="vertical" :model="calculatorInputs">
            <FormItem label="充值金额（USDT）" :extra="`当前输入：${formatNumber(calculatorInputs.rechargeAmount)} USDT`">
              <InputNumber v-model:value="calculatorInputs.rechargeAmount" :min="0" :step="10000" class="credit-score-number" />
            </FormItem>
            <FormItem label="加分项">
              <Space direction="vertical" :size="8">
                <Checkbox v-model:checked="calculatorInputs.hasPrimaryKyc">已完成初级认证</Checkbox>
                <Checkbox v-model:checked="calculatorInputs.hasAdvancedKyc">已完成高级认证</Checkbox>
                <Checkbox v-for="rule in formData.earnCustomRules" :key="rule.id" v-model:checked="calculatorInputs.customEarnSelected[rule.id]">{{ rule.name }}（+{{ rule.score }}分）</Checkbox>
              </Space>
            </FormItem>
            <FormItem label="扣分项">
              <Space v-if="formData.deductionCustomRules?.length" direction="vertical" :size="8">
                <Checkbox v-for="rule in formData.deductionCustomRules" :key="rule.id" v-model:checked="calculatorInputs.customDeductionSelected[rule.id]">{{ rule.name }}（-{{ rule.score }}分）</Checkbox>
              </Space>
              <TypographyText v-else type="secondary">暂无已保存的自定义扣分项</TypographyText>
            </FormItem>
          </Form>
          <Divider />
          <Statistic title="预计总信用分" :value="calculatedScore" :suffix="`/ ${formData.maxScore}`" />
          <Descriptions :column="1" size="small" class="credit-score-result">
            <DescriptionsItem label="VIP1 自动升级">
              <Tag v-if="canUpgradeToVip1" color="green">可自动升级为 VIP1</Tag>
              <TypographyText v-else-if="formData.autoUpgradeVip1Enabled">还需 {{ formData.autoUpgradeVip1Score - calculatedScore }} 分升级 VIP1</TypographyText>
              <TypographyText v-else type="secondary">自动升级已关闭</TypographyText>
            </DescriptionsItem>
          </Descriptions>
          <TypographyText type="secondary">计算器使用已保存的自定义行为，修改后请先保存配置。</TypographyText>
        </Card>
      </Col>
    </Row>

    <Card class="credit-score-footer" :body-style="{ padding: '12px 24px' }" :bordered="false">
      <div class="credit-score-actions">
        <TypographyText v-if="hasUnsavedChanges" type="warning">有未保存的修改</TypographyText>
        <Space :size="8" wrap>
          <Button :disabled="isSaving" @click="resetConfig">重置</Button>
          <Button type="primary" :loading="isSaving" @click="saveConfig">保存配置</Button>
        </Space>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.credit-score-config-form { display: grid; gap: 24px; }
.credit-score-number { width: 100%; }
.credit-score-aside { position: sticky; top: 16px; }
.credit-score-result { margin: 16px 0 8px; }
.credit-score-footer { position: sticky; bottom: 0; z-index: 10; }
.credit-score-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap; padding-bottom: env(safe-area-inset-bottom); }
</style>
