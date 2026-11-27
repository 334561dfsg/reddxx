<script setup>
// 费率模板管理 — Ant Design Pro list page (2026-11-28): query card, table card with the 新增模板 toolbar action, and the
// editor on the shared AdminDialog frame with an Ant Form. Fix: rate inputs are labelled in % but edited the stored
// fraction (0.005 shown as "0.005 %"); they now show and accept percentages and store the fraction. Empty names are rejected.
import { computed, reactive, ref } from 'vue'
import { Button, Card, Col, Descriptions, DescriptionsItem, Empty, Form, FormItem, Input, InputNumber, List, ListItem, Popover, Row, Space, Switch, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import {
  FEE_TEMPLATE_TYPE
} from '../../../admin/constants/assets'
import { createFeeTemplatesMock } from '../../../admin/mock/assets'
import { getActiveVipLevels } from '../../../admin/mock/vip'

const showEditModal = ref(false)
const editingId = ref('')

const page = ref(1)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const feeTemplates = ref(createFeeTemplatesMock())

// 费率模板表单
const templateForm = reactive({
  name: '',
  type: FEE_TEMPLATE_TYPE.STANDARD,
  description: '',
  baseMarkup: { buy: 0.005, sell: 0.005 },
  userLevelRates: {},
  enabled: true
})

const blankFilters = () => ({ status: 'all', name: '', description: '' })
const filters = ref(blankFilters())
const filterFields = [
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已禁用' }] },
  { key: 'name', label: '模板名称' },
  { key: 'description', label: '描述说明' }
]
const contains = (value, query) => !query || String(value || '').toLowerCase().includes(query.trim().toLowerCase())
const filteredTemplates = computed(() => {
  const f = filters.value
  return feeTemplates.value.filter((template) => {
    const hitStatus = f.status === 'all' || (f.status === 'enabled' && template.enabled) || (f.status === 'disabled' && !template.enabled)
    return hitStatus && contains(template.name, f.name) && contains(template.description, f.description)
  })
})
function searchTemplates(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function resetTemplates() { filters.value = blankFilters(); page.value = 1 }
const columns = [
  { key: 'name', title: '模板', width: 260, fixed: 'left' },
  { key: 'buy', title: '回兑费率（Q→B）', width: 150, align: 'right' },
  { key: 'sell', title: '兑换费率（B→Q）', width: 150, align: 'right' },
  { key: 'levels', title: 'VIP 分级费率', width: 130 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'updatedAt', title: '最后更新', width: 170 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]
// Rates are stored as fractions (0.005) and edited/shown as percentages (0.5).
const percent = (value) => `${((Number(value) || 0) * 100).toFixed(2)}%`
const toPercent = (value) => (value === '' || value === null || value === undefined ? null : Number((Number(value) * 100).toFixed(6)))
const fromPercent = (value) => (value === null || value === undefined || value === '' ? 0 : Number((Number(value) / 100).toFixed(8)))

const enabledTemplatesCount = computed(() => feeTemplates.value.filter((t) => t.enabled).length)
const activeVipLevels = computed(() => getActiveVipLevels().slice().sort((a, b) => a.level - b.level))

const templatePreviewLevelEntries = computed(() => {
  const rates = templateForm.userLevelRates || {}
  const byVip = activeVipLevels.value
    .map((vip) => {
      const key = `vip${vip.level}`
      return rates[key] ? [key, rates[key]] : null
    })
    .filter(Boolean)
  const has = new Set(byVip.map(([key]) => key))
  const rest = Object.entries(rates).filter(([key]) => !has.has(key))
  return [...byVip, ...rest]
})

const getTemplateLevelEntries = (template) => {
  const rates = template?.userLevelRates || {}
  const byVip = activeVipLevels.value
    .map((vip) => {
      const key = `vip${vip.level}`
      return rates[key] ? [key, rates[key]] : null
    })
    .filter(Boolean)
  const has = new Set(byVip.map(([key]) => key))
  const rest = Object.entries(rates).filter(([key]) => !has.has(key))
  return [...byVip, ...rest]
}

const TEMPLATE_LEVEL_PREVIEW_LIMIT = 5
const templatePreviewExpanded = ref(false)

const getVisibleTemplatePreviewLevelEntries = () => {
  if (templatePreviewExpanded.value) return templatePreviewLevelEntries.value
  return templatePreviewLevelEntries.value.slice(0, TEMPLATE_LEVEL_PREVIEW_LIMIT)
}

const hasMoreTemplatePreviewLevels = computed(() => templatePreviewLevelEntries.value.length > TEMPLATE_LEVEL_PREVIEW_LIMIT)

// ========== 通用方法 ==========
const getVipLevelNumber = (level) => {
  const match = String(level || '').toLowerCase().match(/^vip(\d+)$/)
  return match ? Number(match[1]) : null
}

const sortVipLevels = (levels) => {
  return [...levels].sort((a, b) => {
    const aNum = getVipLevelNumber(a)
    const bNum = getVipLevelNumber(b)
    if (aNum !== null && bNum !== null) return aNum - bNum
    if (aNum !== null) return -1
    if (bNum !== null) return 1
    return String(a).localeCompare(String(b))
  })
}

const defaultVipRateFactor = (index) => Math.max(0.2, 1 - index * 0.2)

const normalizeVipLevelRates = (levelRates, baseMarkup = templateForm.baseMarkup) => {
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0
  const entries = Object.entries(levelRates || {})

  if (!entries.length) {
    return {
      vip0: { buy: baseBuy, sell: baseSell }
    }
  }

  const normalized = {}
  let nextIndex = 0

  sortVipLevels(entries.map(([level]) => level)).forEach((level) => {
    const origin = levelRates[level] || {}
    const vipIndex = getVipLevelNumber(level) ?? nextIndex
    const key = `vip${vipIndex}`
    normalized[key] = {
      buy: Number(origin.buy) || 0,
      sell: Number(origin.sell) || 0
    }
    nextIndex = Math.max(nextIndex, vipIndex + 1)
  })

  return normalized
}

const syncVipLevelRatesWithModule = (levelRates = {}, baseMarkup = templateForm.baseMarkup) => {
  const normalized = normalizeVipLevelRates(levelRates, baseMarkup)
  const baseBuy = Number(baseMarkup.buy) || 0
  const baseSell = Number(baseMarkup.sell) || 0

  return activeVipLevels.value.reduce((acc, vip, index) => {
    const key = `vip${vip.level}`
    const fallbackByOrder = normalized[`vip${index}`] || normalized[`vip${index + 1}`]
    const fallback = normalized[key] || fallbackByOrder
    const factor = defaultVipRateFactor(index)
    acc[key] = {
      buy: Number((Number(fallback?.buy ?? baseBuy * factor) || 0).toFixed(6)),
      sell: Number((Number(fallback?.sell ?? baseSell * factor) || 0).toFixed(6))
    }
    return acc
  }, {})
}

const cloneTemplateToForm = (template) => {
  templateForm.name = template.name
  templateForm.type = template.type
  templateForm.description = template.description
  templateForm.baseMarkup = JSON.parse(JSON.stringify(template.baseMarkup))
  templateForm.userLevelRates = syncVipLevelRatesWithModule(JSON.parse(JSON.stringify(template.userLevelRates)), template.baseMarkup)
  templateForm.enabled = template.enabled
}

const initUserLevelRates = () => {
  templateForm.userLevelRates = syncVipLevelRatesWithModule({}, templateForm.baseMarkup)
}

const vipLevelLabel = (level) => {
  const number = getVipLevelNumber(level)
  const meta = activeVipLevels.value.find((vip) => vip.level === number)
  if (meta) {
    return meta.displayName ? `${meta.name}（${meta.displayName}）` : meta.name
  }
  return number !== null ? `VIP ${number}` : String(level || '').toUpperCase()
}

// ========== 费率模板操作 ==========
const openEditTemplate = (template) => {
  editingId.value = template.id
  cloneTemplateToForm(template)
  templatePreviewExpanded.value = false
  showEditModal.value = true
}

const openCreateTemplate = () => {
  editingId.value = ''
  Object.assign(templateForm, {
    name: '',
    type: FEE_TEMPLATE_TYPE.STANDARD,
    description: '',
    baseMarkup: { buy: 0.005, sell: 0.005 },
    userLevelRates: {},
    enabled: true
  })
  initUserLevelRates()
  templatePreviewExpanded.value = false
  showEditModal.value = true
}

const updateBaseMarkup = () => {
  initUserLevelRates()
}

const saveTemplate = () => {
  if (!templateForm.name.trim()) {
    message.error('请输入模板名称')
    return
  }
  const payload = {
    name: templateForm.name.trim(),
    type: templateForm.type,
    description: templateForm.description.trim(),
    baseMarkup: {
      buy: Number(templateForm.baseMarkup.buy),
      sell: Number(templateForm.baseMarkup.sell)
    },
    userLevelRates: templateForm.userLevelRates,
    enabled: Boolean(templateForm.enabled),
    updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
  }

  pendingSaveData.value = payload
  showMfaModal.value = true
}

// ========== MFA 验证处理 ==========
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (pendingSaveData.value) {
      // 保存费率模板
      if (editingId.value) {
        const template = feeTemplates.value.find(t => t.id === editingId.value)
        Object.assign(template, {
          ...pendingSaveData.value,
          usageCount: template.usageCount
        })
      } else {
        feeTemplates.value.unshift({ 
          id: `template-${Date.now()}`, 
          ...pendingSaveData.value,
          usageCount: 0,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        })
      }

      showEditModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      message.success('费率模板已保存')
    }
  } catch (error) {
    message.error('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="fee-template-filters" :model="filters" :fields="filterFields" @search="searchTemplates" @reset="resetTemplates" />

    <AdminTable :title="`费率模板（启用 ${enabledTemplatesCount} / ${feeTemplates.length}）`" v-model:page="page" :rows="filteredTemplates" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateTemplate()"><template #icon><PlusOutlined /></template>新增模板</Button>
      </template>
      <template #cell="{ column, record: template }">
        <Space v-if="column.key === 'name'" direction="vertical" :size="0">
          <TypographyText strong>{{ template.name }}</TypographyText>
          <TypographyText type="secondary">{{ template.description || '—' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'buy'">{{ percent(template.baseMarkup.buy) }}</template>
        <template v-else-if="column.key === 'sell'">{{ percent(template.baseMarkup.sell) }}</template>
        <template v-else-if="column.key === 'levels'">
          <TypographyText v-if="getTemplateLevelEntries(template).length === 0" type="secondary">暂无分级费率</TypographyText>
          <Popover v-else trigger="click" placement="bottomLeft" :title="`${template.name} · VIP 分级费率`">
            <template #content>
              <List size="small" :data-source="getTemplateLevelEntries(template)" class="fee-template-levels">
                <template #renderItem="{ item: [level, rates] }">
                  <ListItem>
                    <TypographyText strong>{{ vipLevelLabel(level) }}</TypographyText>
                    <TypographyText type="secondary">回兑 {{ percent(rates.buy) }} / 兑换 {{ percent(rates.sell) }}</TypographyText>
                  </ListItem>
                </template>
              </List>
            </template>
            <Button type="link" class="px-0">共 {{ getTemplateLevelEntries(template).length }} 级</Button>
          </Popover>
        </template>
        <Tag v-else-if="column.key === 'status'" :color="template.enabled ? 'green' : 'default'">{{ template.enabled ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openEditTemplate(template)">编辑</Button>
        <template v-else>{{ template[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <!-- 编辑/新增弹窗 -->
    <AdminDialog :open="showEditModal" :title="editingId ? '编辑费率模板' : '新增费率模板'" :width="960" plain @close="showEditModal = false">
      <template #subtitle>左侧配置模板参数，右侧实时预览效果</template>
      <div class="fee-template-dialog-body">
        <Row :gutter="24">
          <Col :xs="24" :lg="14">
            <Form layout="vertical" name="fee-template-editor" :model="templateForm">
              <Card size="small" title="基本信息">
                <FormItem label="模板名称" required>
                  <Input v-model:value="templateForm.name" :maxlength="60" placeholder="如：标准费率模板" />
                </FormItem>
                <FormItem label="描述说明">
                  <Input v-model:value="templateForm.description" :maxlength="200" placeholder="模板适用场景说明" />
                </FormItem>
                <FormItem label="启用该模板">
                  <Switch v-model:checked="templateForm.enabled" aria-label="启用该模板" checked-children="启用" un-checked-children="禁用" />
                </FormItem>
              </Card>

              <Card size="small" title="基础费率设置" class="fee-template-section">
                <Row :gutter="16">
                  <Col :xs="24" :sm="12">
                    <FormItem label="回兑费率加成（目标币 → 基础币，%）">
                      <InputNumber class="fee-template-number" :min="0" :max="100" :step="0.01" :precision="4" :value="toPercent(templateForm.baseMarkup.buy)" @update:value="templateForm.baseMarkup.buy = fromPercent($event)" @change="updateBaseMarkup" />
                    </FormItem>
                  </Col>
                  <Col :xs="24" :sm="12">
                    <FormItem label="兑换费率加成（基础币 → 目标币，%）">
                      <InputNumber class="fee-template-number" :min="0" :max="100" :step="0.01" :precision="4" :value="toPercent(templateForm.baseMarkup.sell)" @update:value="templateForm.baseMarkup.sell = fromPercent($event)" @change="updateBaseMarkup" />
                    </FormItem>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="VIP 分级费率设置" class="fee-template-section">
                <template #extra><Button size="small" @click="initUserLevelRates">按 VIP 模块重置</Button></template>
                <Empty v-if="activeVipLevels.length === 0" description="VIP 模块暂无可用等级，请先在 VIP 配置中启用等级" />
                <template v-else>
                <Row v-for="vip in activeVipLevels" :key="vip.id" :gutter="16" align="bottom">
                  <Col :xs="24" :sm="8">
                    <FormItem label="等级">
                      <Space :size="8"><Tag color="purple">VIP {{ vip.level }}</Tag><TypographyText>{{ vip.displayName ? `${vip.name}（${vip.displayName}）` : vip.name }}</TypographyText></Space>
                    </FormItem>
                  </Col>
                  <Col :xs="12" :sm="8">
                    <FormItem label="回兑费率（%）">
                      <InputNumber class="fee-template-number" :min="0" :max="100" :step="0.01" :precision="4" :aria-label="`VIP ${vip.level} 回兑费率`" :value="toPercent(templateForm.userLevelRates[`vip${vip.level}`]?.buy)" @update:value="templateForm.userLevelRates[`vip${vip.level}`].buy = fromPercent($event)" />
                    </FormItem>
                  </Col>
                  <Col :xs="12" :sm="8">
                    <FormItem label="兑换费率（%）">
                      <InputNumber class="fee-template-number" :min="0" :max="100" :step="0.01" :precision="4" :aria-label="`VIP ${vip.level} 兑换费率`" :value="toPercent(templateForm.userLevelRates[`vip${vip.level}`]?.sell)" @update:value="templateForm.userLevelRates[`vip${vip.level}`].sell = fromPercent($event)" />
                    </FormItem>
                  </Col>
                </Row>
                </template>
              </Card>
            </Form>
          </Col>
          <Col :xs="24" :lg="10">
            <Space direction="vertical" :size="16" class="fee-template-preview">
              <Card size="small" title="模板概览">
                <template #extra><Tag :color="templateForm.enabled ? 'green' : 'default'">{{ templateForm.enabled ? '已启用' : '已禁用' }}</Tag></template>
                <Descriptions :column="1" size="small">
                  <DescriptionsItem label="模板名称">{{ templateForm.name || '未命名模板' }}</DescriptionsItem>
                </Descriptions>
              </Card>
              <Card size="small" title="基础费率预览">
                <Descriptions :column="1" size="small">
                  <DescriptionsItem label="回兑费率（Q→B）">{{ percent(templateForm.baseMarkup.buy) }}</DescriptionsItem>
                  <DescriptionsItem label="兑换费率（B→Q）">{{ percent(templateForm.baseMarkup.sell) }}</DescriptionsItem>
                </Descriptions>
              </Card>
              <Card size="small" title="VIP 分级费率预览">
                <template #extra><TypographyText type="secondary">共 {{ templatePreviewLevelEntries.length }} 级</TypographyText></template>
                <Empty v-if="templatePreviewLevelEntries.length === 0" description="暂无分级费率数据" />
                <List v-else size="small" :data-source="getVisibleTemplatePreviewLevelEntries()">
                  <template #renderItem="{ item: [level, rates] }">
                    <ListItem>
                      <TypographyText strong>{{ vipLevelLabel(level) }}</TypographyText>
                      <TypographyText type="secondary">回兑 {{ percent(rates.buy) }} / 兑换 {{ percent(rates.sell) }}</TypographyText>
                    </ListItem>
                  </template>
                </List>
                <Button v-if="hasMoreTemplatePreviewLevels" type="link" block @click="templatePreviewExpanded = !templatePreviewExpanded">
                  {{ templatePreviewExpanded ? '收起' : `展开剩余 ${templatePreviewLevelEntries.length - TEMPLATE_LEVEL_PREVIEW_LIMIT} 级` }}
                </Button>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
      <footer>
        <Button @click="showEditModal = false">取消</Button>
        <Button type="primary" @click="saveTemplate()">保存模板</Button>
      </footer>
    </AdminDialog>

    <!-- MFA 验证弹窗 -->
    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="编辑费率模板属于敏感操作，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="pendingSaveData = null"
    />
  </PageShell>
</template>

<style scoped>
.fee-template-dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-top: 24px; padding-bottom: 24px; }
.fee-template-section { margin-top: 16px; }
.fee-template-number { width: 100%; }
.fee-template-preview { width: 100%; }
.fee-template-levels { min-width: 280px; max-height: 320px; overflow-y: auto; }
</style>
