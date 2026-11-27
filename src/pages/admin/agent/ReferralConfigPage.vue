<script setup>
// 裂变分销设置 — Ant Design Pro config page (2026-11-28): PageShell title, grouped Cards with Ant Form controls and a
// sticky bottom action bar (重置为默认 / 保存配置). The former 分佣规则 / 佣金结算 tabs are one grouped page; feedback is
// toast-only (Ant message) and the reset asks for confirmation in a dialog instead of window.confirm.
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Checkbox, Col, Form, FormItem, InputNumber, Row, Select, Space, Switch, Tag, TimePicker, TypographyParagraph, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  mockReferralConfig,
  referralApi,
  normalizeReferralConfig,
  normalizeCommissionRatesTriple
} from '../../../admin/mock/referral'
import {
  DEFAULT_REFERRAL_CONFIG,
  REFERRAL_MAX_LEVELS,
  REFERRAL_COMMISSION_CREDIT_TO_OPTIONS,
  getReferralSettlementScheduleLine,
  getReferralSettlementNotifyLine
} from '../../../admin/constants/referral'

const config = ref(normalizeReferralConfig({ ...mockReferralConfig }))

const RATE_LEVEL_INDEXES = [0, 1, 2]
const isSaving = ref(false)
const demoBaseAmount = ref(10000)
const resetOpen = ref(false)
const settlementScheduleLine = computed(() => getReferralSettlementScheduleLine(config.value))
const settlementNotifyLine = computed(() => getReferralSettlementNotifyLine(config.value))
const currentCreditOption = computed(() =>
  REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.find((o) => o.value === config.value.referralCommissionCreditTo)
)
const creditToOptions = REFERRAL_COMMISSION_CREDIT_TO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

const PRODUCT_LINES = [
  {
    key: 'deposit',
    enabledKey: 'commissionDepositEnabled',
    ratesKey: 'depositCommissionRates',
    title: '充值',
    baseDesc:
      '计佣基数 A = 被邀请用户该笔充值成功后的实际到账 USDT 金额（与充值入账流水中的到账金额相同）。',
    formula: '佣金ᵢ = A × rᵢ',
    firstDepositExtra: true,
    theme: 'blue'
  },
  {
    key: 'perpetual',
    enabledKey: 'commissionPerpetualEnabled',
    ratesKey: 'perpetualCommissionRates',
    title: '永续合约',
    baseDesc:
      '计佣基数 A = 该笔永续订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'indigo'
  },
  {
    key: 'delivery',
    enabledKey: 'commissionDeliveryEnabled',
    ratesKey: 'deliveryCommissionRates',
    title: '交割合约',
    baseDesc:
      '计佣基数 A = 该笔交割合约订单自开仓至持仓全部了结并完成交割结算期间实收的交易手续费 USDT 金额之总和；不包含已实现盈亏、保证金及其它非手续费科目；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'violet'
  },
  {
    key: 'spot',
    enabledKey: 'commissionSpotEnabled',
    ratesKey: 'spotCommissionRates',
    title: '现货',
    baseDesc:
      '计佣基数 A = 该笔现货订单实收的交易手续费 USDT 金额；交易类产品按该笔订单实收的交易手续费记佣，本笔无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'orange'
  },
  {
    key: 'aiQuant',
    enabledKey: 'commissionAiQuantEnabled',
    ratesKey: 'aiQuantCommissionRates',
    title: 'AI 量化',
    baseDesc:
      '计佣基数 A = 该笔 AI 量化订单实收的认购手续费、违约手续费等 USDT 手续费金额之和；理财类及产品策略按认购手续费、违约手续费记佣。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'amber'
  },
  {
    key: 'portfolio',
    enabledKey: 'commissionPortfolioEnabled',
    ratesKey: 'portfolioCommissionRates',
    title: '投资组合',
    baseDesc:
      '计佣基数 A = 该笔投资组合订单实收的认购手续费、提前赎回违约手续费等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'cyan'
  },
  {
    key: 'lending',
    enabledKey: 'commissionLendingEnabled',
    ratesKey: 'lendingCommissionRates',
    title: '流动性挖矿',
    baseDesc:
      '计佣基数 A = 该笔流动性挖矿订单实收的认购手续费、提前退出或违约手续费等 USDT 手续费金额之和；流动性挖矿产品不按本金记佣。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'emerald'
  },
  {
    key: 'borrowing',
    enabledKey: 'commissionBorrowingEnabled',
    ratesKey: 'borrowingCommissionRates',
    title: '借贷产品',
    baseDesc:
      '计佣基数 A = 该笔借贷订单实收的认购手续费、违约手续费、逾期违约金等 USDT 手续费金额之和；无手续费则 A = 0。',
    formula: '佣金ᵢ = A × rᵢ',
    theme: 'rose'
  }
]

/** 分组展示，阅读顺序更清晰 */
const PRODUCT_GROUPS = [
  {
    id: 'fund',
    name: '入金',
    blurb: '含链上与站内 USDT 充值',
    lineKeys: ['deposit']
  },
  {
    id: 'trade',
    name: '交易',
    blurb: '合约与现货订单',
    lineKeys: ['perpetual', 'delivery', 'spot']
  },
  {
    id: 'fin',
    name: '产品与策略',
    blurb: '量化、投资组合、理财、借贷',
    lineKeys: ['aiQuant', 'portfolio', 'lending', 'borrowing']
  }
]

function lineByKey(key) {
  return PRODUCT_LINES.find((p) => p.key === key)
}

function linesInGroup(group) {
  return group.lineKeys.map((k) => lineByKey(k)).filter(Boolean)
}

/** 固定三级，每项为 0～1 */
function parseRatesString(str) {
  const normalized = normalizeCommissionRatesTriple(str)
  return normalized.split(',').map((v) => parseFloat(v))
}

function ratesFor(line) {
  return parseRatesString(config.value[line.ratesKey])
}

function clampRate01(n) {
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function setRateAt(line, index, raw) {
  const parts = parseRatesString(config.value[line.ratesKey])
  const v = raw == null ? '' : String(raw).trim()
  let n = parseFloat(v)
  if (v === '' || Number.isNaN(n)) n = 0
  parts[index] = clampRate01(n)
  config.value[line.ratesKey] = parts.join(',')
}

function formatUsdt(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return x.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function commissionPreviewLines(rates, base) {
  const b = Number(base)
  if (Number.isNaN(b) || b <= 0) return []
  const triple = rates.slice(0, REFERRAL_MAX_LEVELS)
  while (triple.length < REFERRAL_MAX_LEVELS) triple.push(0)
  return triple.map((r, i) => ({
    level: i + 1,
    rate: r,
    ratePct: (r * 100).toFixed(2),
    commission: b * r
  }))
}

function isLineEnabled(line) {
  return config.value[line.enabledKey] === true
}

const loadConfig = async () => {
  try {
    const result = await referralApi.getReferralConfig()
    if (result.success) {
      config.value = normalizeReferralConfig(result.data)
    }
  } catch (error) {
    message.error('裂变分销设置加载失败：' + (error?.message || '请稍后重试'))
  }
}

const saveConfig = async () => {
  if (isSaving.value) return
  const validateTriple = (ratesStr) => {
    const triple = parseRatesString(ratesStr)
    return (
      triple.length === REFERRAL_MAX_LEVELS &&
      triple.every((n) => !Number.isNaN(n) && n >= 0 && n <= 1)
    )
  }

  for (const line of PRODUCT_LINES) {
    if (!config.value[line.enabledKey]) continue
    const rates = normalizeCommissionRatesTriple(config.value[line.ratesKey])
    config.value[line.ratesKey] = rates
    if (!validateTriple(rates)) {
      message.error(`「${line.title}」已开启记佣：一级 / 二级 / 三级比例须均为 0～1 之间的小数。`)
      return
    }
  }

  for (const line of PRODUCT_LINES) {
    if (config.value[line.enabledKey]) continue
    const raw = config.value[line.ratesKey]
    if (raw != null && String(raw).trim() && !validateTriple(normalizeCommissionRatesTriple(raw))) {
      message.error(`「${line.title}」比例格式有误，请修正后再保存。`)
      return
    }
  }

  const payload = normalizeReferralConfig({ ...config.value })

  isSaving.value = true
  try {
    const result = await referralApi.updateReferralConfig(payload)
    if (result.success) {
      message.success(result.message || '裂变分销设置已保存')
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
  config.value = normalizeReferralConfig({ ...DEFAULT_REFERRAL_CONFIG })
  resetOpen.value = false
  message.success('已恢复默认配置，保存后生效')
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <PageShell class="referral-config-page" :style="{ paddingBottom: 0 }" title="裂变分销设置">
    <Form class="referral-config-form" name="referral-config" layout="vertical" :model="config" @finish="saveConfig">
      <Card title="计佣公式" :bordered="false">
        <Row :gutter="24">
          <Col :xs="24" :lg="12">
            <TypographyParagraph>第 i 级上级佣金 <TypographyText code>佣金ᵢ = A × rᵢ</TypographyText></TypographyParagraph>
            <TypographyParagraph type="secondary">
              A：本条业务单实收手续费形成的计佣基数，币种为 USDT；各产品线对 A 的取值定义见下方对应产品线，每条订单对应一个 A。
              rᵢ：第 i 级邀请链上级的分佣比例，i ∈ {1, 2, 3}，取值范围为闭区间 [0, 1]；例如 0.1 表示 10%。
            </TypographyParagraph>
          </Col>
          <Col :xs="24" :lg="12">
            <TypographyParagraph type="secondary">每条产品线可单独关闭记佣；关闭后该业务不产生裂变佣金（比例可保留）。</TypographyParagraph>
            <TypographyParagraph type="secondary">每条产品线固定三个比例：一级、二级、三级上级；某级可为 0。</TypographyParagraph>
            <TypographyParagraph type="secondary">下方示例使用统一的假设基数，仅用于核对「A × rᵢ」的乘法关系；线上环境每一条真实订单单独计算，其 A 取自账务系统为该笔订单记录的实收手续费。</TypographyParagraph>
          </Col>
        </Row>
      </Card>

      <Card title="裂变全局规则" :bordered="false">
        <FormItem label="仅首笔充值参与裂变分佣" extra="仅作用于「充值」产品线：开启时，被邀请用户仅其第一笔充值成功订单参与本条线的 A 与分佣计算；该用户后续充值订单不参与本条线分佣。">
          <Switch v-model:checked="config.depositFirstOnly" aria-label="仅首充返佣" checked-children="开启" un-checked-children="关闭" />
        </FormItem>
      </Card>

      <Card title="产品线 · 邀请链记佣" :bordered="false">
        <template #extra>
          <Space :size="8">
            <TypographyText type="secondary">示例手续费基数（USDT）</TypographyText>
            <InputNumber v-model:value="demoBaseAmount" :min="0" :step="100" aria-label="示例手续费基数（USDT）" style="width: 144px" />
          </Space>
        </template>
        <TypographyParagraph type="secondary">邀请链固定三级：直属上级为一级，其上为二级，再其上为三级；每条订单按本页配置的比例分别计算三级佣金。示例佣金 = 基数 × rᵢ。</TypographyParagraph>
        <div v-for="group in PRODUCT_GROUPS" :key="group.id" class="referral-config-group">
          <TypographyText strong>{{ group.name }}</TypographyText>
          <TypographyText type="secondary"> · {{ group.blurb }}</TypographyText>
          <Row :gutter="[16, 16]" class="referral-config-lines">
            <Col v-for="line in linesInGroup(group)" :key="line.key" :xs="24" :md="12" :xl="8">
              <Card size="small" :title="line.title" class="referral-config-line">
                <template #extra>
                  <Switch v-model:checked="config[line.enabledKey]" :aria-label="`${line.title}记佣`" checked-children="记佣" un-checked-children="关闭" />
                </template>
                <TypographyParagraph type="secondary">{{ line.baseDesc }}</TypographyParagraph>
                <TypographyParagraph><TypographyText code>{{ line.formula }}</TypographyText></TypographyParagraph>
                <TypographyParagraph v-if="line.firstDepositExtra && line.key === 'deposit'" type="secondary">
                  已开启「仅首笔充值」时：仅被邀请用户第一笔充值成功订单产生本条线的 A 与佣金；其余充值不产生本条线佣金。
                </TypographyParagraph>
                <template v-if="isLineEnabled(line)">
                  <Row :gutter="8">
                    <Col v-for="idx in RATE_LEVEL_INDEXES" :key="line.key + '-lvl-' + idx" :span="8">
                      <FormItem :label="`${idx + 1} 级上级`" :html-for="line.key + '-rate-' + idx" class="referral-config-rate">
                        <InputNumber :id="line.key + '-rate-' + idx" :value="ratesFor(line)[idx]" :min="0" :max="1" :step="0.001" style="width: 100%" @update:value="setRateAt(line, idx, $event)" />
                      </FormItem>
                    </Col>
                  </Row>
                  <Space :size="[4, 4]" wrap>
                    <Tag v-for="(rate, index) in ratesFor(line)" :key="line.key + '-r-' + index">{{ index + 1 }} 级 {{ (rate * 100).toFixed(2) }}%</Tag>
                  </Space>
                  <div class="referral-config-example">
                    <TypographyText type="secondary">示例基数 {{ formatUsdt(demoBaseAmount) }} USDT：</TypographyText>
                    <TypographyText v-for="row in commissionPreviewLines(ratesFor(line), demoBaseAmount)" :key="line.key + '-ex-' + row.level" type="secondary" class="referral-config-example-line">
                      {{ row.level }} 级上级 {{ formatUsdt(row.commission) }} USDT
                    </TypographyText>
                  </div>
                </template>
                <TypographyText v-else type="secondary">未参与记佣，不产生裂变佣金。</TypographyText>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      <Card title="佣金结算" :bordered="false">
        <TypographyParagraph type="secondary">{{ settlementScheduleLine }} {{ settlementNotifyLine }}</TypographyParagraph>
        <Row :gutter="24" class="referral-config-fields">
          <Col :xs="24">
            <FormItem label="自动入账" extra="开启后：日结汇总单生成后系统自动划转至上级用户账户。关闭后：汇总单进入「裂变佣金结算」，由运营手动发放。">
              <Switch v-model:checked="config.autoExecute" aria-label="自动发放" checked-children="开启" un-checked-children="关闭" />
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="结算周期" extra="裂变佣金按自然日汇总成结算单，不配置周/月账期；充值、交易产生的明细会归入对应上级用户的日结批次。">
              <TypographyText>每自然日</TypographyText>
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="结算触发时刻" extra="24 小时制，与平台默认时区一致（与代理账期结算配置方式一致）。">
              <TimePicker v-model:value="config.referralSettlementTimeLocal" format="HH:mm" value-format="HH:mm" :allow-clear="false" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :xs="24" :lg="12">
            <FormItem label="佣金入账账户" :extra="currentCreditOption?.hint">
              <Select v-model:value="config.referralCommissionCreditTo" :options="creditToOptions" />
            </FormItem>
          </Col>
          <Col :xs="24">
            <FormItem label="结算完成后通知用户" extra="日结批次完成入账后，按勾选渠道向获得佣金的上级用户发送通知（需站内消息 / 短信 / 邮件服务已开通；与代理「结算完成后通知代理」一致）。">
              <Space :size="16" wrap>
                <Checkbox id="ref-notify-email" v-model:checked="config.referralNotifyAfterSettlementEmail">发送邮件</Checkbox>
                <Checkbox id="ref-notify-site" v-model:checked="config.referralNotifyAfterSettlementSite">发送站内信</Checkbox>
                <Checkbox id="ref-notify-sms" v-model:checked="config.referralNotifyAfterSettlementSms">发送手机短信</Checkbox>
              </Space>
            </FormItem>
          </Col>
        </Row>
      </Card>
    </Form>

    <Card class="referral-config-footer" :body-style="{ padding: '12px 24px' }" :bordered="false">
      <div class="referral-config-actions">
        <Space :size="8" wrap>
          <Button :disabled="isSaving" @click="resetOpen = true">重置为默认</Button>
          <Button type="primary" :loading="isSaving" @click="saveConfig">保存配置</Button>
        </Space>
      </div>
    </Card>

    <AdminModal :open="resetOpen" title="重置裂变分销设置" confirm-text="确认重置" danger :width="480" @close="resetOpen = false" @confirm="confirmReset">
      <TypographyText>确认重置为默认配置？当前未保存的修改将被覆盖，重置后需保存才会生效。</TypographyText>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.referral-config-form { display: grid; gap: 24px; }
.referral-config-group + .referral-config-group { margin-top: 24px; }
.referral-config-lines { margin-top: 12px; }
.referral-config-line { height: 100%; }
.referral-config-rate { margin-bottom: 12px; }
.referral-config-example { margin-top: 8px; display: grid; }
.referral-config-example-line { display: block; }
.referral-config-fields { max-width: 1100px; }
.referral-config-footer { position: sticky; bottom: 0; z-index: 10; }
.referral-config-actions { display: flex; justify-content: flex-end; padding-bottom: env(safe-area-inset-bottom); }
</style>
