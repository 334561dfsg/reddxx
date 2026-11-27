<script setup>
// 代理记佣配置 — Ant Design Pro config page (2026-11-28): PageShell title, grouped Cards with Ant Form controls and a
// sticky bottom action bar (重置为默认 / 保存配置). The former 记佣规则 / 佣金结算 tabs are one grouped page; feedback is
// toast-only (Ant message) and the reset asks for confirmation in a dialog instead of window.confirm.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Checkbox, Col, Form, FormItem, InputNumber, Row, Select, Space, Switch, Tag, TimePicker, TypographyParagraph, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  mockAgentCommissionConfig,
  agentCommissionApi,
  normalizeAgentGlobalCommission
} from '../../../admin/mock/agentCommission'
import {
  DEFAULT_AGENT_GLOBAL_COMMISSION,
  normalizeAgentLineRate,
  AGENT_SETTLEMENT_CYCLE,
  AGENT_SETTLEMENT_CYCLE_OPTIONS,
  AGENT_SETTLEMENT_WEEKDAY_OPTIONS,
  getAgentSettlementScheduleSummary,
  getAgentSettlementNotifyLine
} from '../../../admin/constants/agentCommission'
import { REFERRAL_COMMISSION_CREDIT_TO_OPTIONS } from '../../../admin/constants/referral'

const config = ref(normalizeAgentGlobalCommission({ ...mockAgentCommissionConfig }))
const isSaving = ref(false)
const demoBaseAmount = ref(10000)
const resetOpen = ref(false)

const settlementScheduleLine = computed(() => getAgentSettlementScheduleSummary(config.value))
const settlementNotifyLine = computed(() => getAgentSettlementNotifyLine(config.value))
const currentCycleOption = computed(() =>
  AGENT_SETTLEMENT_CYCLE_OPTIONS.find((o) => o.value === config.value.agentSettlementCycle)
)
const cycleOptions = AGENT_SETTLEMENT_CYCLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const weekdayOptions = AGENT_SETTLEMENT_WEEKDAY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
// The shared option hint speaks of the referral upline; on the agent page the commission goes to the agent.
const creditToOptions = REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const creditToHint = computed(() => {
  const option = REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.find((o) => o.value === config.value.agentCommissionCreditTo)
  return option ? `记入代理人${option.label}余额。` : ''
})

const PRODUCT_LINES = [
  {
    key: 'deposit',
    enabledKey: 'agentDepositCommissionEnabled',
    rateKey: 'agentDepositCommissionRate',
    title: '充值',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔充值成功后的实际到账 USDT 金额（与充值入账流水中的到账金额相同）。',
    formula: '佣金 = A × r',
    firstDepositExtra: true,
    theme: 'blue'
  },
  {
    key: 'perpetual',
    enabledKey: 'agentPerpetualCommissionEnabled',
    rateKey: 'agentPerpetualCommissionRate',
    title: '永续合约',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔永续订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'indigo'
  },
  {
    key: 'delivery',
    enabledKey: 'agentDeliveryCommissionEnabled',
    rateKey: 'agentDeliveryCommissionRate',
    title: '交割合约',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔交割合约订单自开仓至持仓全部了结并完成交割结算期间实收的交易手续费 USDT 金额之总和；不包含已实现盈亏、保证金及其它非手续费科目；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'violet'
  },
  {
    key: 'spot',
    enabledKey: 'agentSpotCommissionEnabled',
    rateKey: 'agentSpotCommissionRate',
    title: '现货',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔现货订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'orange'
  },
  {
    key: 'aiQuant',
    enabledKey: 'agentAiQuantCommissionEnabled',
    rateKey: 'agentAiQuantCommissionRate',
    title: 'AI 量化',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔 AI 量化订单实收的认购手续费、违约手续费等 USDT 手续费金额之和；理财类及产品策略按认购手续费、违约手续费记佣。',
    formula: '佣金 = A × r',
    theme: 'amber'
  },
  {
    key: 'portfolio',
    enabledKey: 'agentPortfolioCommissionEnabled',
    rateKey: 'agentPortfolioCommissionRate',
    title: '投资组合',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔投资组合订单实收的认购手续费、提前赎回违约手续费等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'cyan'
  },
  {
    key: 'lending',
    enabledKey: 'agentLendingCommissionEnabled',
    rateKey: 'agentLendingCommissionRate',
    title: '流动性挖矿',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔流动性挖矿订单实收的认购手续费、提前退出或违约手续费等 USDT 手续费金额之和；流动性挖矿产品不按本金记佣。',
    formula: '佣金 = A × r',
    theme: 'emerald'
  },
  {
    key: 'borrowing',
    enabledKey: 'agentBorrowingCommissionEnabled',
    rateKey: 'agentBorrowingCommissionRate',
    title: '借贷产品',
    baseDesc:
      '计佣基数 A = 代理名下客户该笔借贷订单实收的认购手续费、违约手续费、逾期违约金等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金 = A × r',
    theme: 'rose'
  }
]

const PRODUCT_GROUPS = [
  { id: 'fund', name: '入金', blurb: '含链上与站内 USDT 充值', lineKeys: ['deposit'] },
  { id: 'trade', name: '交易', blurb: '合约与现货订单', lineKeys: ['perpetual', 'delivery', 'spot'] },
  { id: 'fin', name: '产品与策略', blurb: '量化、投资组合、理财、借贷', lineKeys: ['aiQuant', 'portfolio', 'lending', 'borrowing'] }
]

function lineByKey(key) {
  return PRODUCT_LINES.find((p) => p.key === key)
}

function linesInGroup(group) {
  return group.lineKeys.map((k) => lineByKey(k)).filter(Boolean)
}

function rateNum(line) {
  return parseFloat(normalizeAgentLineRate(config.value[line.rateKey]))
}

function setRate(line, raw) {
  config.value[line.rateKey] = normalizeAgentLineRate(raw ?? 0)
}

function formatUsdt(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return x.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function previewCommission(line, base) {
  const b = Number(base)
  if (Number.isNaN(b) || b <= 0) return null
  const r = rateNum(line)
  return b * r
}

function isLineEnabled(line) {
  return config.value[line.enabledKey] === true
}

const loadConfig = async () => {
  try {
    const result = await agentCommissionApi.getAgentCommissionConfig()
    if (result.success) {
      config.value = normalizeAgentGlobalCommission(result.data)
    }
  } catch (error) {
    message.error('代理记佣配置加载失败：' + (error?.message || '请稍后重试'))
  }
}

const saveConfig = async () => {
  if (isSaving.value) return
  const validateOne = (rateStr) => {
    const n = parseFloat(normalizeAgentLineRate(rateStr))
    return !Number.isNaN(n) && n >= 0 && n <= 1
  }

  for (const line of PRODUCT_LINES) {
    if (!config.value[line.enabledKey]) continue
    config.value[line.rateKey] = normalizeAgentLineRate(config.value[line.rateKey])
    if (!validateOne(config.value[line.rateKey])) {
      message.error(`「${line.title}」已开启记佣：比例须为 0～1 之间的小数。`)
      return
    }
  }

  for (const line of PRODUCT_LINES) {
    if (config.value[line.enabledKey]) continue
    const raw = config.value[line.rateKey]
    if (raw != null && String(raw).trim() && !validateOne(raw)) {
      message.error(`「${line.title}」比例格式有误，请修正后再保存。`)
      return
    }
  }

  const payload = normalizeAgentGlobalCommission({ ...config.value })

  isSaving.value = true
  try {
    const result = await agentCommissionApi.updateAgentCommissionConfig(payload)
    if (result.success) {
      message.success(result.message || '代理记佣配置已保存')
    } else {
      message.error(result.message || '保存失败')
    }
  } catch (error) {
    message.error('保存失败：' + error.message)
  } finally {
    isSaving.value = false
  }
}

const confirmReset = () => {
  config.value = normalizeAgentGlobalCommission({ ...DEFAULT_AGENT_GLOBAL_COMMISSION })
  resetOpen.value = false
  message.success('已恢复默认配置，保存后生效')
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <PageShell class="agent-config-page" :style="{ paddingBottom: 0 }" title="代理记佣配置">
    <template #description>
      <TypographyText type="secondary">本页为全站默认，单个代理可在代理列表「记佣配置」中覆盖。</TypographyText>
    </template>
    <Form class="agent-config-form" name="agent-commission-config" layout="vertical" :model="config" @finish="saveConfig">
      <Card title="计佣公式" :bordered="false">
        <Row :gutter="24">
          <Col :xs="24" :lg="12">
            <TypographyParagraph><TypographyText code>佣金 = A × r</TypographyText></TypographyParagraph>
            <TypographyParagraph type="secondary">
              A：本条业务单实收手续费形成的计佣基数，币种为 USDT；各产品线对 A 的取值定义见下方对应产品线，每条订单对应一个 A。
              r：该产品线下代理的一级分佣比例，取值范围为闭区间 [0, 1]；例如 0.1 表示 10%。
            </TypographyParagraph>
          </Col>
          <Col :xs="24" :lg="12">
            <TypographyParagraph type="secondary">每条产品线可单独关闭记佣；关闭后该业务不产生代理线佣金（比例可保留）。</TypographyParagraph>
            <TypographyParagraph type="secondary">下方示例使用统一的假设基数，仅用于核对「A × r」的乘法关系；线上环境每一条真实订单单独计算，其 A 取自账务系统为该笔订单记录的实收手续费。</TypographyParagraph>
          </Col>
        </Row>
      </Card>

      <Card title="代理线全局规则" :bordered="false">
        <FormItem label="仅首笔充值参与代理线记佣" extra="仅作用于「充值」产品线：开启时，代理名下客户仅其第一笔充值成功订单参与本条线的 A 与佣金计算；该客户后续充值订单不参与本条线记佣。">
          <Switch v-model:checked="config.agentCommissionDepositFirstOnly" aria-label="代理仅首充返佣" checked-children="开启" un-checked-children="关闭" />
        </FormItem>
      </Card>

      <Card title="产品线 · 代理记佣（全局默认）" :bordered="false">
        <template #extra>
          <Space :size="8">
            <TypographyText type="secondary">示例手续费基数（USDT）</TypographyText>
            <InputNumber v-model:value="demoBaseAmount" :min="0" :step="100" aria-label="示例手续费基数（USDT）" style="width: 144px" />
          </Space>
        </template>
        <TypographyParagraph type="secondary">代理线仅一级分佣：每条产品线一个比例 r。新代理默认使用本页数值；示例佣金 = 基数 × r。</TypographyParagraph>
        <div v-for="group in PRODUCT_GROUPS" :key="group.id" class="agent-config-group">
          <TypographyText strong>{{ group.name }}</TypographyText>
          <TypographyText type="secondary"> · {{ group.blurb }}</TypographyText>
          <Row :gutter="[16, 16]" class="agent-config-lines">
            <Col v-for="line in linesInGroup(group)" :key="line.key" :xs="24" :md="12" :xl="8">
              <Card size="small" :title="line.title" class="agent-config-line">
                <template #extra>
                  <Switch v-model:checked="config[line.enabledKey]" :aria-label="`${line.title}记佣`" checked-children="记佣" un-checked-children="关闭" />
                </template>
                <TypographyParagraph type="secondary">{{ line.baseDesc }}</TypographyParagraph>
                <TypographyParagraph><TypographyText code>{{ line.formula }}</TypographyText></TypographyParagraph>
                <TypographyParagraph v-if="line.firstDepositExtra && line.key === 'deposit'" type="secondary">
                  已开启「仅首笔充值」时：仅代理名下客户第一笔充值成功订单产生本条线的 A 与佣金；其余充值不产生本条线佣金。
                </TypographyParagraph>
                <template v-if="isLineEnabled(line)">
                  <FormItem :label="`比例 r（0～1）`" :html-for="'agcr-' + line.key" class="agent-config-rate">
                    <InputNumber :id="'agcr-' + line.key" :value="rateNum(line)" :min="0" :max="1" :step="0.001" style="width: 100%" @update:value="setRate(line, $event)" />
                  </FormItem>
                  <Space :size="8" wrap>
                    <Tag>r = {{ (rateNum(line) * 100).toFixed(2) }}%</Tag>
                    <TypographyText type="secondary">示例基数 {{ formatUsdt(demoBaseAmount) }} USDT，佣金 ≈ {{ formatUsdt(previewCommission(line, demoBaseAmount) ?? 0) }} USDT</TypographyText>
                  </Space>
                </template>
                <TypographyText v-else type="secondary">未参与记佣，不产生代理线佣金。</TypographyText>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      <Card title="佣金结算" :bordered="false">
        <TypographyParagraph type="secondary">{{ settlementScheduleLine }} {{ settlementNotifyLine }}</TypographyParagraph>
        <Row :gutter="24" class="agent-config-fields">
          <Col :xs="24">
            <FormItem label="自动入账" extra="开启后：账期汇总单生成后系统自动划转至代理人账户。关闭后：汇总单进入「佣金结算」，由运营审核通过后入账。">
              <Switch v-model:checked="config.agentCommissionAutoExecute" aria-label="自动发放代理佣金" checked-children="开启" un-checked-children="关闭" />
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="结算周期" :extra="currentCycleOption?.desc">
              <Select v-model:value="config.agentSettlementCycle" :options="cycleOptions" />
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="结算触发时刻" extra="24 小时制，与平台默认时区一致（与裂变日结时刻配置方式相同）。">
              <TimePicker v-model:value="config.agentSettlementTimeLocal" format="HH:mm" value-format="HH:mm" :allow-clear="false" style="width: 100%" />
            </FormItem>
          </Col>
          <Col v-if="config.agentSettlementCycle !== AGENT_SETTLEMENT_CYCLE.MONTHLY" :xs="24" :lg="12">
            <FormItem label="结算日 · 星期" :extra="config.agentSettlementCycle === AGENT_SETTLEMENT_CYCLE.WEEKLY ? '单周：每个自然周在指定星期触发上一完整周账期。' : '双周：每两个自然周在指定星期触发账期汇总（与账务双周历对齐）。'">
              <Select v-model:value="config.agentSettlementWeekday" :options="weekdayOptions" />
            </FormItem>
          </Col>
          <Col v-else :xs="24" :lg="12">
            <FormItem label="结算日 · 每月几号" extra="按自然月；若某月无该日（如 31 号），由账务任务按月末规则处理。">
              <InputNumber v-model:value="config.agentSettlementMonthDay" :min="1" :max="31" :precision="0" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="佣金入账账户" :extra="creditToHint">
              <Select v-model:value="config.agentCommissionCreditTo" :options="creditToOptions" />
            </FormItem>
          </Col>
          <Col :xs="24">
            <FormItem label="结算完成后通知代理" extra="账期批次完成入账后，按勾选渠道向对应代理发送通知（需站内消息 / 短信 / 邮件服务已开通；与裂变「结算完成后通知用户」一致）。">
              <Space :size="16" wrap>
                <Checkbox id="agent-notify-email" v-model:checked="config.agentNotifyAfterSettlementEmail">发送邮件</Checkbox>
                <Checkbox id="agent-notify-site" v-model:checked="config.agentNotifyAfterSettlementSite">发送站内信</Checkbox>
                <Checkbox id="agent-notify-sms" v-model:checked="config.agentNotifyAfterSettlementSms">发送手机短信</Checkbox>
              </Space>
            </FormItem>
          </Col>
        </Row>
      </Card>
    </Form>

    <Card class="agent-config-footer" :body-style="{ padding: '12px 24px' }" :bordered="false">
      <div class="agent-config-actions">
        <Space :size="8" wrap>
          <Button :disabled="isSaving" @click="resetOpen = true">重置为默认</Button>
          <Button type="primary" :loading="isSaving" @click="saveConfig">保存配置</Button>
        </Space>
      </div>
    </Card>

    <AdminModal :open="resetOpen" title="重置代理记佣配置" confirm-text="确认重置" danger :width="480" @close="resetOpen = false" @confirm="confirmReset">
      <TypographyText>确认重置为代理记佣默认配置？当前未保存的修改将被覆盖，重置后需保存才会生效。</TypographyText>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.agent-config-form { display: grid; gap: 24px; }
.agent-config-group + .agent-config-group { margin-top: 24px; }
.agent-config-lines { margin-top: 12px; }
.agent-config-line { height: 100%; }
.agent-config-rate { margin-bottom: 12px; }
.agent-config-fields { max-width: 1100px; }
.agent-config-footer { position: sticky; bottom: 0; z-index: 10; }
.agent-config-actions { display: flex; justify-content: flex-end; padding-bottom: env(safe-area-inset-bottom); }
</style>
