<script setup>
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { nativeControl } from '../../../admin/components/antd/controls.js'
import { computed, reactive, ref } from 'vue'
import { Button, Card, Col, Empty, Form, FormItem, Input, InputNumber, Row, Space, Statistic, Switch, Table, Tag, TypographyParagraph, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import EarnAdminModal from '../earn/EarnAdminModal.vue'
import { publicDepositAddressRepository } from '../../../admin/repositories/publicDepositAddressRepository.js'
import MinimumDepositDialog from '../../../admin/components/assets/MinimumDepositDialog.vue'
import PanelSingleSelect from '../../../admin/components/form/PanelSingleSelect.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import {
  PUBLIC_DEPOSIT_COINS,
  PUBLIC_DEPOSIT_NETWORKS,
} from '../../../admin/mock/publicDepositAddress'

const minimumDepositTrigger = ref(null)
const minimumDepositOpen = ref(false)
const repository = publicDepositAddressRepository
const rows = ref(repository.list())
const page = ref(1)
const modalOpen = ref(false)
const showMfaModal = ref(false)
const mfaLoading = ref(false)
const pendingMutation = ref(null)
const editingAddress = ref('')
const formError = ref('')
const revealedIds = ref(new Set())
const logDialogOpen = ref(false)
const logRow = ref(null)
const addressLogs = ref([])
const logPage = ref(1)
const addressDialogRef = ref(null)
const addressInitialFocusRef = ref(null)
const logDialogRef = ref(null)
const logInitialFocusRef = ref(null)

const LOG_PAGE_SIZE = 5

const LOG_FIELD_LABELS = {
  coin: '币种', network: '网络', address: '收款地址', enabled: '启用状态', sortOrder: '排序', remark: '备注'
}

const LOG_ACTION_LABELS = {
  create: '新增配置', edit: '编辑配置', enable: '启用地址', disable: '停用地址',
  replace: '更换地址（原地址）', 'replace-in': '更换地址（新地址）'
}

const logPageCount = computed(() => Math.max(1, Math.ceil(addressLogs.value.length / LOG_PAGE_SIZE)))
const paginatedAddressLogs = computed(() => {
  const start = (logPage.value - 1) * LOG_PAGE_SIZE
  return addressLogs.value.slice(start, start + LOG_PAGE_SIZE)
})

const emptyForm = () => ({
  id: '',
  coin: 'USDT',
  network: 'TRC20',
  address: '',
  enabled: true,
  sortOrder: 0,
  remark: ''
})

const form = reactive(emptyForm())

const coinOptions = computed(() => PUBLIC_DEPOSIT_COINS.map((coin) => ({
  value: coin,
  label: coin,
  searchText: coin
})))

const networkOptions = computed(() => PUBLIC_DEPOSIT_NETWORKS.map((network) => ({
  value: network,
  label: network,
  searchText: network
})))

// Query card (Ant Design Pro, 2026-11-28): the old combined keyword box is split into one field per column.
const blankFilters = () => ({ coin: 'all', network: 'all', status: 'all', address: '', remark: '' })
const filters = ref(blankFilters())
const filterFields = [
  { key: 'coin', label: '币种', searchable: true, options: [{ value: 'all', label: '全部币种' }, ...PUBLIC_DEPOSIT_COINS.map((value) => ({ value, label: value }))] },
  { key: 'network', label: '网络', searchable: true, options: [{ value: 'all', label: '全部网络' }, ...PUBLIC_DEPOSIT_NETWORKS.map((value) => ({ value, label: value }))] },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }] },
  { key: 'address', label: '收款地址' },
  { key: 'remark', label: '备注' }
]
const contains = (value, query) => !query || String(value || '').toLowerCase().includes(query.trim().toLowerCase())
const filteredRows = computed(() => {
  const f = filters.value
  return rows.value.filter((row) => {
    const matchesStatus = f.status === 'all' || (f.status === 'enabled' ? row.enabled : !row.enabled)
    return (f.coin === 'all' || row.coin === f.coin) && (f.network === 'all' || row.network === f.network) &&
      matchesStatus && contains(row.address, f.address) && contains(row.remark, f.remark)
  })
})
function searchRows(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function resetRows() { filters.value = blankFilters(); page.value = 1 }
const columns = [
  { key: 'coin', title: '币种 / 网络', width: 140, fixed: 'left' },
  { key: 'address', title: '收款地址', width: 320 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'sortOrder', title: '排序权重', width: 100, align: 'right' },
  { key: 'updated', title: '更新信息', width: 180 },
  { key: 'actions', title: '操作', width: 200, fixed: 'right' }
]

const enabledCount = computed(() => rows.value.filter((row) => row.enabled).length)
const coveredNetworkCount = computed(
  () => new Set(rows.value.filter((row) => row.enabled).map((row) => row.network)).size
)
const coveredPairCount = computed(
  () => new Set(rows.value.filter((row) => row.enabled).map((row) => `${row.coin}:${row.network}`)).size
)

const {
  rendered: addressDialogRendered,
  phase: addressDialogPhase,
  layerStyle: addressDialogLayerStyle,
  requestDialogClose: requestAddressDialogClose,
  onAfterEnter: onAddressDialogAfterEnter,
  onAfterLeave: onAddressDialogAfterLeave
} = useDialogLifecycle({
  open: modalOpen,
  dialogRef: addressDialogRef,
  initialFocusRef: addressInitialFocusRef,
  requestClose: () => {
    modalOpen.value = false
    formError.value = ''
  }
})

const {
  rendered: logDialogRendered,
  phase: logDialogPhase,
  layerStyle: logDialogLayerStyle,
  requestDialogClose: requestLogDialogClose,
  onAfterEnter: onLogDialogAfterEnter,
  onAfterLeave: onLogDialogAfterLeave
} = useDialogLifecycle({
  open: logDialogOpen,
  dialogRef: logDialogRef,
  initialFocusRef: logInitialFocusRef,
  // The log content stays visible through the close animation; it is cleared once the dialog has closed.
  requestClose: () => {
    logDialogOpen.value = false
  }
})

function refreshRows() {
  rows.value = repository.list()
}

function normalizeSortOrder(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.trunc(parsed))
}

function nowText() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')
}

function openCreate() {
  Object.assign(form, emptyForm())
  editingAddress.value = ''
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    coin: row.coin,
    network: row.network,
    address: row.address,
    enabled: row.enabled,
    sortOrder: row.sortOrder ?? 0,
    remark: row.remark || ''
  })
  editingAddress.value = row.address
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  requestAddressDialogClose()
}

function openLogDialog(row) {
  logRow.value = row
  addressLogs.value = repository.listLogs(row.id)
  logPage.value = 1
  logDialogOpen.value = true
}

function closeLogDialog() {
  requestLogDialogClose()
}

function changedLogFields(log) {
  return Object.keys(LOG_FIELD_LABELS).filter((field) => {
    if (!log.before || !log.after) return true
    return log.before[field] !== log.after[field]
  })
}

function formatLogValue(field, value) {
  if (value === undefined || value === null || value === '') return '—'
  if (field === 'enabled') return value ? '已启用' : '已停用'
  return value
}

function requestMfa(mutation) {
  pendingMutation.value = mutation
  showMfaModal.value = true
}

function cancelMfa() {
  pendingMutation.value = null
  mfaLoading.value = false
}

async function handleMfaVerify() {
  if (!pendingMutation.value) return
  mfaLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 600))
    repository.save(pendingMutation.value.payload)
    refreshRows()
    message.success(pendingMutation.value.type === 'save' ? '收款地址配置已保存' : (pendingMutation.value.payload.enabled ? '收款地址已启用' : '收款地址已停用'))
    if (pendingMutation.value.type === 'save') {
      modalOpen.value = false
      formError.value = ''
    }
    pendingMutation.value = null
    showMfaModal.value = false
  } finally {
    mfaLoading.value = false
  }
}

function saveAddress() {
  const address = form.address.trim()
  const sortOrder = normalizeSortOrder(form.sortOrder)
  if (!form.coin || !form.network || !address) {
    formError.value = '请完整填写币种、网络和收款地址。'
    return
  }
  if (sortOrder === null) {
    formError.value = '排序必须填写数字，数值越大展示越靠前。'
    return
  }

  requestMfa({
    type: 'save',
    payload: {
      id: form.id || undefined,
      coin: form.coin,
      network: form.network,
      address,
      enabled: form.enabled,
      sortOrder,
      remark: form.remark.trim(),
      operator: 'admin_current',
      updatedAt: nowText()
    }
  })
}

// Enable/disable asks in an Ant confirmation dialog (was window.confirm), then goes through MFA as before.
const statusConfirmRow = ref(null)
const statusConfirmOpen = ref(false)
function toggleStatus(row) {
  statusConfirmRow.value = row
  statusConfirmOpen.value = true
}
function confirmToggleStatus() {
  const row = statusConfirmRow.value
  statusConfirmOpen.value = false
  if (!row) return
  requestMfa({
    type: 'status',
    payload: { ...row, enabled: !row.enabled, operator: 'admin_current', updatedAt: nowText() }
  })
}

function maskedAddress(row) {
  if (revealedIds.value.has(row.id) || row.address.length <= 18) return row.address
  return `${row.address.slice(0, 9)}••••••${row.address.slice(-7)}`
}

function toggleReveal(id) {
  const next = new Set(revealedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  revealedIds.value = next
}

async function copyAddress(row) {
  try {
    await navigator.clipboard.writeText(row.address)
    message.success('收款地址已复制')
  } catch {
    message.error('复制失败，请手动选择地址复制')
  }
}

// The shared Ant frames (AdminDialog) drive these page-owned lifecycles (dialog migration 2026-11-27). Defined last so
// every handler they reference is initialised.
const addressDialogLifecycle = { rendered: addressDialogRendered, phase: addressDialogPhase, layerStyle: addressDialogLayerStyle, requestDialogClose: requestAddressDialogClose, onAfterEnter: onAddressDialogAfterEnter, onAfterLeave: onAddressDialogAfterLeave, dialogRef: addressDialogRef }
const logDialogLifecycle = { rendered: logDialogRendered, phase: logDialogPhase, layerStyle: logDialogLayerStyle, requestDialogClose: requestLogDialogClose, onAfterEnter: onLogDialogAfterEnter, onAfterLeave: async () => { const done = await onLogDialogAfterLeave(); if (done) { logRow.value = null; addressLogs.value = []; logPage.value = 1 } return done }, dialogRef: logDialogRef }
</script>

<template>
  <PageShell>
    <SearchForm name="public-deposit-address-filters" :model="filters" :fields="filterFields" @search="searchRows" @reset="resetRows" />

    <Card :bordered="false" title="地址覆盖">
      <Row :gutter="24">
        <Col :xs="24" :md="8"><Statistic title="当前启用" :value="enabledCount" /><TypographyText type="secondary">可用于前台充值展示</TypographyText></Col>
        <Col :xs="24" :md="8"><Statistic title="已覆盖币种网络" :value="coveredPairCount" /><TypographyText type="secondary">按币种与网络精确匹配</TypographyText></Col>
        <Col :xs="24" :md="8"><Statistic title="已覆盖网络" :value="coveredNetworkCount" /><TypographyText type="secondary">至少一个启用地址的网络</TypographyText></Col>
      </Row>
    </Card>

    <AdminTable title="公共收款地址" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <Button :ref="el => { minimumDepositTrigger = nativeControl(el) }" aria-haspopup="dialog" @click="minimumDepositOpen = true">最低充值金额</Button>
          <Button type="primary" @click="openCreate"><template #icon><PlusOutlined /></template>新增地址</Button>
        </Space>
      </template>
      <template #cell="{ column, record: row }">
        <Space v-if="column.key === 'coin'" direction="vertical" :size="0">
          <TypographyText strong>{{ row.coin }}</TypographyText>
          <TypographyText type="secondary">{{ row.network }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'address'" direction="vertical" :size="0">
          <span class="font-mono break-all" :title="row.address">{{ maskedAddress(row) }}</span>
          <Space :size="8">
            <Button type="link" size="small" class="px-0" @click="toggleReveal(row.id)">{{ revealedIds.has(row.id) ? '隐藏' : '查看完整地址' }}</Button>
            <Button type="link" size="small" class="px-0" @click="copyAddress(row)">复制</Button>
          </Space>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="row.enabled ? 'green' : 'default'">{{ row.enabled ? '已启用' : '已停用' }}</Tag>
        <template v-else-if="column.key === 'sortOrder'">{{ row.sortOrder ?? 0 }}</template>
        <Space v-else-if="column.key === 'updated'" direction="vertical" :size="0">
          <span>{{ row.updatedAt || '—' }}</span>
          <TypographyText type="secondary">{{ row.operator || '—' }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openEdit(row)">编辑</Button>
          <Button type="link" class="px-0" @click="openLogDialog(row)">修改日志</Button>
          <Button type="link" class="px-0" :danger="row.enabled" @click="toggleStatus(row)">{{ row.enabled ? '停用' : '启用' }}</Button>
        </Space>
        <template v-else>{{ row[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <MinimumDepositDialog :return-focus="minimumDepositTrigger" :open="minimumDepositOpen" @close="minimumDepositOpen = false" @saved="value => message.success(`最低充值金额已保存：${value.amountUsdt} USDT（当前浏览器演示配置）`)" />

    <EarnAdminModal :open="statusConfirmOpen" :width="480" :title="statusConfirmRow?.enabled ? '停用收款地址' : '启用收款地址'" :confirm-text="statusConfirmRow?.enabled ? '确认停用' : '确认启用'" :danger="Boolean(statusConfirmRow?.enabled)" @close="statusConfirmOpen = false" @confirm="confirmToggleStatus" @closed="statusConfirmOpen || (statusConfirmRow = null)">
      <TypographyParagraph>确认{{ statusConfirmRow?.enabled ? '停用' : '启用' }}该收款地址？停用后仍保留历史记录，不支持物理删除。</TypographyParagraph>
      <TypographyText v-if="statusConfirmRow" type="secondary">{{ statusConfirmRow.coin }} · {{ statusConfirmRow.network }} · <span class="font-mono break-all">{{ statusConfirmRow.address }}</span></TypographyText>
    </EarnAdminModal>

    <AdminDialog :open="addressDialogRendered" :lifecycle="addressDialogLifecycle" :title="form.id ? '编辑收款地址' : '新增收款地址'" title-id="public-deposit-address-dialog-title" :width="672" plain>
      <template #subtitle>更换地址会生成新记录，原地址自动停用并保留。</template>
      <Form class="public-deposit-form" layout="vertical" name="public-deposit-address-form" :model="form" @finish="saveAddress">
        <div class="public-deposit-form-body">
          <Row :gutter="16">
            <Col :xs="24" :sm="12">
              <PanelSingleSelect
                :ref="el => { addressInitialFocusRef = nativeControl(el) }"
                v-model="form.coin"
                label="币种"
                search-label="搜索币种"
                placeholder="请选择币种"
                id-base="public-deposit-address-coin"
                required
                :options="coinOptions"
              />
            </Col>
            <Col :xs="24" :sm="12">
              <PanelSingleSelect
                v-model="form.network"
                label="网络"
                search-label="搜索网络"
                placeholder="请选择网络"
                id-base="public-deposit-address-network"
                required
                :options="networkOptions"
              />
            </Col>
          </Row>

          <FormItem label="收款地址" required :extra="form.id && editingAddress !== form.address ? '检测到地址变更：保存后将新建记录并停用原地址。' : undefined">
            <Input v-model:value="form.address" spellcheck="false" placeholder="请输入完整链上地址" class="font-mono" />
          </FormItem>

          <FormItem label="排序权重" required extra="数值越大越靠前；相同排序按更新时间降序。">
            <InputNumber v-model:value="form.sortOrder" :min="0" :precision="0" placeholder="数值越大越靠前" class="public-deposit-number" />
          </FormItem>

          <FormItem label="备注">
            <Input.TextArea v-model:value="form.remark" :rows="3" placeholder="填写地址用途或更换原因" />
          </FormItem>

          <FormItem label="启用状态" extra="启用后可参与前台充值地址匹配">
            <Switch v-model:checked="form.enabled" aria-label="启用状态" checked-children="启用" un-checked-children="停用" />
          </FormItem>

          <FeedbackToast v-if="formError" type="error" :source="() => (formError) ? (formError) : ''"></FeedbackToast>
        </div>

        <footer class="public-deposit-form-footer">
          <Button @click="closeModal">取消</Button>
          <Button type="primary" html-type="submit">保存配置</Button>
        </footer>
      </Form>
    </AdminDialog>

    <AdminDialog :open="logDialogRendered" :lifecycle="logDialogLifecycle" title="修改日志" title-id="public-deposit-address-log-title" :width="896" plain>
      <template #subtitle>{{ logRow?.coin }} · {{ logRow?.network }} · {{ logRow?.id }}</template>
      <div class="public-deposit-log-body">
        <TypographyParagraph type="secondary">
          系统会在新增、编辑、启用、停用或更换公共收款地址成功后自动生成日志，记录操作类型、操作人、操作时间以及变更前后内容。日志按地址独立归档，仅用于审计追溯，不支持修改或删除。
        </TypographyParagraph>

        <Space v-if="addressLogs.length" direction="vertical" :size="16" class="public-deposit-log-list">
          <Card v-for="log in paginatedAddressLogs" :key="log.id" size="small">
            <template #title>
              <Space :size="8" wrap>
                <Tag color="purple">{{ LOG_ACTION_LABELS[log.action] || log.action }}</Tag>
                <TypographyText type="secondary">{{ log.occurredAt }}</TypographyText>
              </Space>
            </template>
            <template #extra><TypographyText type="secondary">操作人：{{ log.operator }}</TypographyText></template>
            <Table :data-source="changedLogFields(log)" :pagination="false" size="small" :row-key="(field) => field" :columns="[{ key: 'field', title: '变更字段', width: 120 }, { key: 'before', title: '变更前' }, { key: 'after', title: '变更后' }]">
              <template #bodyCell="{ column, record: field }">
                <TypographyText v-if="column.key === 'field'" strong>{{ LOG_FIELD_LABELS[field] }}</TypographyText>
                <TypographyText v-else-if="column.key === 'before'" type="secondary" class="break-all" :class="field === 'address' ? 'font-mono' : ''">{{ formatLogValue(field, log.before?.[field]) }}</TypographyText>
                <span v-else class="break-all" :class="field === 'address' ? 'font-mono' : ''">{{ formatLogValue(field, log.after?.[field]) }}</span>
              </template>
            </Table>
          </Card>

          <div class="public-deposit-log-pagination">
            <TypographyText type="secondary">共 {{ addressLogs.length }} 条 · 第 {{ logPage }} / {{ logPageCount }} 页</TypographyText>
            <a-pagination size="small" v-model:current="logPage" :page-size="LOG_PAGE_SIZE" :total="addressLogs.length" :show-size-changer="false" />
          </div>
        </Space>
        <Empty v-else description="暂无修改日志：该地址尚未发生配置变更" />
      </div>
    </AdminDialog>

    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="公共收款地址属于敏感资金配置，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="cancelMfa"
    />
  </PageShell>
</template>

<style scoped>
.public-deposit-form { display: flex; flex: 1 1 auto; min-height: 0; flex-direction: column; }
.public-deposit-form-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-top: 24px; padding-bottom: 8px; }
.public-deposit-form-footer { flex: none; display: flex; justify-content: flex-end; gap: 8px; margin: 0 -24px; padding: 10px 24px; border-top: 1px solid rgb(5 5 5 / 6%); }
.public-deposit-number { width: 100%; }
.public-deposit-log-body { overflow-y: auto; padding-top: 24px; padding-bottom: 24px; }
.public-deposit-log-list { width: 100%; }
.public-deposit-log-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
</style>
