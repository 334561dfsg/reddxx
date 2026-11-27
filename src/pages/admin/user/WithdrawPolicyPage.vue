<script setup>
// 出金策略 — Ant Design Pro config page (2026-11-28): PageShell title, grouped Cards with Ant Form controls and Tables,
// the strategy trial in a sticky side Card, and a bottom action bar (primary 保存配置 + default 重置). The hand-built
// fixed toast is replaced by Ant message. Saving now rejects credit-score ranges whose lower bound exceeds the upper
// bound or that overlap another range (the page asked for non-overlapping ranges but never checked).
import { ref, computed, onMounted } from 'vue'
import { Button, Card, Checkbox, Col, Descriptions, DescriptionsItem, Form, FormItem, InputNumber, Row, Select, Space, Switch, Table, TypographyParagraph, TypographyText, message } from 'ant-design-vue'
import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { vipLevels } from '../../../admin/mock/vip'
import { verificationConfig } from '../../../admin/mock/verification'
import {
  WITHDRAW_POLICY_DIMENSION_LABEL
} from '../../../admin/constants/withdrawPolicy'
import {
  getWithdrawPolicy,
  saveWithdrawPolicy,
  createEmptyCreditScoreRule,
  computeEffectiveWithdrawPolicy
} from '../../../admin/mock/withdrawPolicy'
import { VERIFICATION_LEVEL } from '../../../constants/verification'

const policy = ref(null)
const savedSignature = ref('')
const saving = ref(false)

const vipLevelOptions = computed(() =>
  [...vipLevels].sort((a, b) => a.level - b.level).map((v) => ({
    value: v.level,
    label: `${v.level} · ${v.displayName}`
  }))
)

function vipRowLabel(level) {
  const v = vipLevels.find((x) => x.level === level)
  return v ? `${v.level} · ${v.displayName}` : `等级 ${level}`
}

function verificationRowLabel(level) {
  return verificationConfig[level]?.levelName ?? level
}

const verificationOptions = [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC, VERIFICATION_LEVEL.ADVANCED]
  .map((value) => ({ value, label: verificationRowLabel(value) }))

function formatDailyCap(v) {
  if (v === null || v === undefined || Number(v) === 0) return '无限制'
  return `${v} USDT`
}

function setVerificationDailyUnlimited(row, ev) {
  if (ev.target.checked) {
    row.dailyCapUsdt = null
  } else if (row.dailyCapUsdt === null) {
    const fallback = policy.value?.defaultPolicy?.dailyCapUsdt
    row.dailyCapUsdt = Number.isFinite(Number(fallback)) ? Number(fallback) : 10000
  }
}

const sim = ref({
  vipLevel: 2,
  isAgent: true,
  verificationLevel: VERIFICATION_LEVEL.BASIC,
  creditScore: 65
})

/** 序列化当前表单配置，确保任意表格/开关修改都会触发试算重算（避免 computed 对外部函数内深层依赖收集不完整） */
const policyFormSignature = computed(() => {
  const p = policy.value
  if (!p) return ''
  return JSON.stringify({
    defaultPolicy: p.defaultPolicy,
    dimensionPriority: p.dimensionPriority,
    dimensionEnabled: p.dimensionEnabled,
    vipRules: p.vipRules,
    agentRule: p.agentRule,
    verificationRules: p.verificationRules,
    creditScoreRules: p.creditScoreRules
  })
})

const simSignature = computed(() => JSON.stringify(sim.value))
const dirty = computed(() => Boolean(policy.value) && JSON.stringify(policy.value) !== savedSignature.value)

const preview = computed(() => {
  void policyFormSignature.value
  void simSignature.value
  const p = policy.value
  if (!p) return null
  return computeEffectiveWithdrawPolicy(
    {
      vipLevel: sim.value.vipLevel,
      isAgent: sim.value.isAgent,
      verificationLevel: sim.value.verificationLevel,
      creditScore: sim.value.creditScore
    },
    p
  )
})

function load() {
  policy.value = getWithdrawPolicy()
  savedSignature.value = JSON.stringify(policy.value)
}

onMounted(load)

function validateCreditRules() {
  const ranges = policy.value.creditScoreRules.map((r) => ({ min: Number(r.minScore ?? 0), max: Number(r.maxScore ?? 0) }))
  if (ranges.some((r) => r.min > r.max)) return '信用分区间的分数下限不能大于分数上限'
  const sorted = [...ranges].sort((a, b) => a.min - b.min)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min <= sorted[i - 1].max) return '信用分区间不能互相重叠，请调整后再保存'
  }
  return ''
}

function persist() {
  if (saving.value || !policy.value) return
  const error = validateCreditRules()
  if (error) {
    message.error(error)
    return
  }
  saving.value = true
  try {
    policy.value = saveWithdrawPolicy(policy.value)
    savedSignature.value = JSON.stringify(policy.value)
    message.success('已保存出金策略配置')
  } catch (cause) {
    message.error(cause?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

function resetToSaved() {
  load()
  message.info('已恢复为已保存的配置')
}

function moveDimension(index, delta) {
  const arr = [...policy.value.dimensionPriority]
  const j = index + delta
  if (j < 0 || j >= arr.length) return
  ;[arr[index], arr[j]] = [arr[j], arr[index]]
  policy.value.dimensionPriority = arr
}

function removeCreditRule(id) {
  policy.value.creditScoreRules = policy.value.creditScoreRules.filter((r) => r.id !== id)
}

function addCreditRule() {
  policy.value.creditScoreRules.push(createEmptyCreditScoreRule())
}

function isDimensionOn(dim) {
  return policy.value?.dimensionEnabled?.[dim] !== false
}

function setDimensionEnabled(dim, value) {
  if (!policy.value?.dimensionEnabled) return
  policy.value.dimensionEnabled[dim] = Boolean(value)
}

const dimensionRows = computed(() => (policy.value?.dimensionPriority || []).map((dim, index) => ({ dim, index })))
const dimensionColumns = [
  { key: 'index', title: '序号', width: 70, align: 'right' },
  { key: 'dim', title: '维度' },
  { key: 'enabled', title: '参与试算', width: 120 },
  { key: 'actions', title: '展示顺序', width: 160 }
]
const limitColumns = (first) => [
  { key: 'label', title: first, width: 180 },
  { key: 'min', title: '单笔最低（USDT）', width: 220 },
  { key: 'daily', title: '每日上限（USDT）', width: 260 }
]
const vipColumns = limitColumns('VIP 等级')
const agentColumns = limitColumns('用户身份')
const verificationColumns = limitColumns('认证等级')
const creditColumns = [
  { key: 'minScore', title: '分数下限', width: 120 },
  { key: 'maxScore', title: '分数上限', width: 120 },
  { key: 'min', title: '单笔最低（USDT）', width: 220 },
  { key: 'daily', title: '每日上限（USDT）', width: 220 },
  { key: 'actions', title: '操作', width: 80 }
]
const agentRows = computed(() => (policy.value ? [{ id: 'agent', ...policy.value.agentRule }] : []))
</script>

<template>
  <PageShell v-if="policy" title="出金策略" class="withdraw-policy" :style="{ paddingBottom: 0 }">
    <template #description>
      <TypographyParagraph type="secondary" class="withdraw-policy-intro">
        配置 U 本位单笔最低出金与每日出金上限。VIP 等级与「VIP 等级配置」mock 同步；认证等级名称与「认证等级配置」一致（未认证 / 初级 / 高级），具体限额仅在此页维护。
        多维度同时启用且均命中规则时按最严格模式合并：单笔最低取各维度要求中的最大值，每日上限取各维度中的最小值（无限制视为较宽松，不参与收紧）。
      </TypographyParagraph>
    </template>

    <Row :gutter="[24, 24]" align="top">
      <Col :xs="24" :xl="16">
        <Form name="withdraw-policy" layout="vertical" :model="policy" class="withdraw-policy-form">
          <Card title="全局默认（兜底）" :bordered="false">
            <TypographyText type="secondary">当各细分规则均未命中时使用。</TypographyText>
            <Row :gutter="24" class="withdraw-policy-fields">
              <Col :xs="24" :md="12">
                <FormItem label="单笔最低出金（USDT）" extra="输入 0 表示不限制单笔最低出金。">
                  <InputNumber v-model:value="policy.defaultPolicy.minWithdrawUsdt" :min="0" :step="0.01" class="withdraw-policy-number" />
                </FormItem>
              </Col>
              <Col :xs="24" :md="12">
                <FormItem label="每日出金上限（USDT）" extra="输入 0 表示不限制每日出金上限。">
                  <InputNumber v-model:value="policy.defaultPolicy.dailyCapUsdt" :min="0" :step="1" class="withdraw-policy-number" />
                </FormItem>
              </Col>
            </Row>
          </Card>

          <Card title="参与维度" :bordered="false">
            <TypographyText type="secondary">仅「启用」的维度参与试算。多维度命中时合并为最严格结果（单笔最低取 max、每日上限取 min）；顺序仅影响展示，不影响合并计算。</TypographyText>
            <Table class="withdraw-policy-table" :columns="dimensionColumns" :data-source="dimensionRows" row-key="dim" :pagination="false" size="middle">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'index'">{{ record.index + 1 }}</template>
                <TypographyText v-else-if="column.key === 'dim'" :type="isDimensionOn(record.dim) ? undefined : 'secondary'" strong>{{ WITHDRAW_POLICY_DIMENSION_LABEL[record.dim] }}</TypographyText>
                <Switch v-else-if="column.key === 'enabled'" :checked="isDimensionOn(record.dim)" checked-children="启用" un-checked-children="关闭" :aria-label="`${WITHDRAW_POLICY_DIMENSION_LABEL[record.dim]}参与试算`" @change="setDimensionEnabled(record.dim, $event)" />
                <Space v-else-if="column.key === 'actions'" :size="8">
                  <Button type="link" class="px-0" :disabled="record.index === 0" :aria-label="`上移${WITHDRAW_POLICY_DIMENSION_LABEL[record.dim]}`" @click="moveDimension(record.index, -1)"><ArrowUpOutlined />上移</Button>
                  <Button type="link" class="px-0" :disabled="record.index === dimensionRows.length - 1" :aria-label="`下移${WITHDRAW_POLICY_DIMENSION_LABEL[record.dim]}`" @click="moveDimension(record.index, 1)"><ArrowDownOutlined />下移</Button>
                </Space>
              </template>
            </Table>
          </Card>

          <Card title="按 VIP 等级" :bordered="false">
            <TypographyText type="secondary">等级列表与「VIP 等级配置」页面使用的 mock（vipLevels）一致，每等级一行，不可增删等级行。</TypographyText>
            <Table class="withdraw-policy-table" :columns="vipColumns" :data-source="policy.vipRules" row-key="id" :pagination="false" size="middle" :scroll="{ x: 660 }">
              <template #bodyCell="{ column, record }">
                <TypographyText v-if="column.key === 'label'" strong>{{ vipRowLabel(record.vipLevel) }}</TypographyText>
                <Space v-else-if="column.key === 'min'" direction="vertical" :size="4">
                  <InputNumber v-model:value="record.minWithdrawUsdt" :min="0" :step="0.01" :aria-label="`${vipRowLabel(record.vipLevel)}单笔最低出金`" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
                <Space v-else-if="column.key === 'daily'" direction="vertical" :size="4">
                  <InputNumber v-model:value="record.dailyCapUsdt" :min="0" :step="1" :aria-label="`${vipRowLabel(record.vipLevel)}每日出金上限`" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
              </template>
            </Table>
          </Card>

          <Card title="按代理身份" :bordered="false">
            <TypographyText type="secondary">当前代理体系仅区分是否代理；开启「代理身份」维度后，代理用户会命中本规则。</TypographyText>
            <Table class="withdraw-policy-table" :columns="agentColumns" :data-source="agentRows" row-key="id" :pagination="false" size="middle" :scroll="{ x: 660 }">
              <template #bodyCell="{ column }">
                <TypographyText v-if="column.key === 'label'" strong>代理</TypographyText>
                <Space v-else-if="column.key === 'min'" direction="vertical" :size="4">
                  <InputNumber v-model:value="policy.agentRule.minWithdrawUsdt" :min="0" :step="0.01" aria-label="代理单笔最低出金" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
                <Space v-else-if="column.key === 'daily'" direction="vertical" :size="4">
                  <InputNumber v-model:value="policy.agentRule.dailyCapUsdt" :min="0" :step="1" aria-label="代理每日出金上限" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
              </template>
            </Table>
          </Card>

          <Card title="按账户认证等级" :bordered="false">
            <TypographyText type="secondary">等级与「认证等级配置」中的三档一致；单笔与每日上限仅在此配置，不在认证页维护。</TypographyText>
            <Table class="withdraw-policy-table" :columns="verificationColumns" :data-source="policy.verificationRules" row-key="id" :pagination="false" size="middle" :scroll="{ x: 660 }">
              <template #bodyCell="{ column, record }">
                <TypographyText v-if="column.key === 'label'" strong>{{ verificationRowLabel(record.verificationLevel) }}</TypographyText>
                <Space v-else-if="column.key === 'min'" direction="vertical" :size="4">
                  <InputNumber v-model:value="record.minWithdrawUsdt" :min="0" :step="0.01" :aria-label="`${verificationRowLabel(record.verificationLevel)}单笔最低出金`" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
                <Space v-else-if="column.key === 'daily'" direction="vertical" :size="4">
                  <Space :size="8" wrap>
                    <Checkbox :checked="record.dailyCapUsdt === null" @change="setVerificationDailyUnlimited(record, $event)">无限制</Checkbox>
                    <InputNumber v-if="record.dailyCapUsdt !== null" :value="record.dailyCapUsdt" :min="0" :step="1" :aria-label="`${verificationRowLabel(record.verificationLevel)}每日出金上限`" class="withdraw-policy-cell-number" @update:value="(value) => (record.dailyCapUsdt = value ?? 0)" />
                  </Space>
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
              </template>
            </Table>
          </Card>

          <Card title="按信用分区间" :bordered="false">
            <template #extra>
              <Button @click="addCreditRule"><template #icon><PlusOutlined /></template>添加区间</Button>
            </template>
            <TypographyText type="secondary">按信用分落入的区间匹配规则；区间请勿互相重叠。</TypographyText>
            <Table class="withdraw-policy-table" :columns="creditColumns" :data-source="policy.creditScoreRules" row-key="id" :pagination="false" size="middle" :scroll="{ x: 760 }" :locale="{ emptyText: '暂无信用分区间' }">
              <template #bodyCell="{ column, record }">
                <InputNumber v-if="column.key === 'minScore'" v-model:value="record.minScore" :min="0" :max="100" :precision="0" aria-label="分数下限" class="withdraw-policy-cell-number" />
                <InputNumber v-else-if="column.key === 'maxScore'" v-model:value="record.maxScore" :min="0" :max="100" :precision="0" aria-label="分数上限" class="withdraw-policy-cell-number" />
                <Space v-else-if="column.key === 'min'" direction="vertical" :size="4">
                  <InputNumber v-model:value="record.minWithdrawUsdt" :min="0" :step="0.01" aria-label="单笔最低出金" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
                <Space v-else-if="column.key === 'daily'" direction="vertical" :size="4">
                  <InputNumber v-model:value="record.dailyCapUsdt" :min="0" :step="1" aria-label="每日出金上限" class="withdraw-policy-cell-number" />
                  <TypographyText type="secondary">输入 0 表示不限制</TypographyText>
                </Space>
                <Button v-else-if="column.key === 'actions'" type="link" danger class="px-0" @click="removeCreditRule(record.id)">删除</Button>
              </template>
            </Table>
          </Card>
        </Form>
      </Col>

      <Col :xs="24" :xl="8" class="withdraw-policy-aside">
        <Card title="策略试算" :bordered="false">
          <TypographyText type="secondary">按左侧当前表单实时试算（无需先保存）。</TypographyText>
          <Form name="withdraw-policy-trial" layout="vertical" :model="sim" class="withdraw-policy-trial">
            <FormItem label="VIP 等级（mock）">
              <Select v-model:value="sim.vipLevel" :options="vipLevelOptions" show-search option-filter-prop="label" />
            </FormItem>
            <FormItem label="代理身份">
              <Switch v-model:checked="sim.isAgent" checked-children="是代理" un-checked-children="非代理" aria-label="代理身份" />
            </FormItem>
            <FormItem label="认证等级">
              <Select v-model:value="sim.verificationLevel" :options="verificationOptions" />
            </FormItem>
            <FormItem label="信用分">
              <InputNumber v-model:value="sim.creditScore" :min="0" :max="100" class="withdraw-policy-number" />
            </FormItem>
          </Form>
          <template v-if="preview">
            <Descriptions title="试算结果" :column="1" size="small" bordered>
              <DescriptionsItem label="单笔最低出金">{{ preview.minWithdrawUsdt }} USDT</DescriptionsItem>
              <DescriptionsItem label="每日出金上限">{{ formatDailyCap(preview.dailyCapUsdt) }}</DescriptionsItem>
            </Descriptions>
            <TypographyParagraph type="secondary" class="withdraw-policy-explain">{{ preview.explain }}</TypographyParagraph>
          </template>
        </Card>
      </Col>
    </Row>

    <Card class="withdraw-policy-footer" :body-style="{ padding: '12px 24px' }" :bordered="false">
      <div class="withdraw-policy-actions">
        <TypographyText v-if="dirty" type="warning">有未保存的修改</TypographyText>
        <Space :size="8" wrap>
          <Button :disabled="saving" @click="resetToSaved">重置</Button>
          <Button type="primary" :loading="saving" @click="persist">保存配置</Button>
        </Space>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.withdraw-policy-intro { margin-bottom: 0; max-width: 1100px; }
.withdraw-policy-form { display: grid; gap: 24px; }
.withdraw-policy-fields { margin-top: 16px; }
.withdraw-policy-table { margin-top: 16px; }
.withdraw-policy-number { width: 100%; }
.withdraw-policy-cell-number { width: 160px; }
.withdraw-policy-aside { position: sticky; top: 16px; }
.withdraw-policy-trial { margin-top: 16px; }
.withdraw-policy-explain { margin-top: 12px; margin-bottom: 0; }
.withdraw-policy-footer { position: sticky; bottom: 0; z-index: 10; }
.withdraw-policy-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap; padding-bottom: env(safe-area-inset-bottom); }
</style>
