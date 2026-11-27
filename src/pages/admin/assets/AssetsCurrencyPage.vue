<script setup>
// 币种管理 — Ant Design Pro list page (2026-11-28): query card (one field per filter, name and symbol split), table
// card with the 新增币种 toolbar action and a network popover, and the editor on the shared AdminDialog frame with Ant
// Tabs/Form/Collapse. Saving now rejects an empty name/symbol, a duplicate symbol and unnamed networks.
import { computed, reactive, ref, watch } from 'vue'
import { Avatar, Button, Card, Col, Collapse, CollapsePanel, Descriptions, DescriptionsItem, Empty, Form, FormItem, Input, InputNumber, Popover, Radio, RadioGroup, Row, Select, Space, Switch, TabPane, Tabs, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { ASSET_COMMON_FILTER_ALL, ASSET_CURRENCY_TYPE, ASSET_MODAL_TAB, ASSET_STATUS } from '../../../admin/constants/assets'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'

const showEditModal = ref(false)
const editingCoinId = ref('')
const modalTab = ref(ASSET_MODAL_TAB.BASIC)
const activeNetworkId = ref('')

const page = ref(1)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const coins = ref(createAssetsCoinsMock())

const normalizeCurrencyType = (value) => {
  if (value === ASSET_CURRENCY_TYPE.VIRTUAL || value === ASSET_CURRENCY_TYPE.METAL || value === ASSET_CURRENCY_TYPE.FIAT) return value
  if (value === 'onchain') return ASSET_CURRENCY_TYPE.VIRTUAL
  if (value === 'offchain') return ASSET_CURRENCY_TYPE.FIAT
  return ASSET_CURRENCY_TYPE.VIRTUAL
}

const isNonVirtualType = (value) => normalizeCurrencyType(value) !== ASSET_CURRENCY_TYPE.VIRTUAL

const currencyTypeLabel = (value) => {
  const type = normalizeCurrencyType(value)
  if (type === ASSET_CURRENCY_TYPE.VIRTUAL) return '虚拟币'
  if (type === ASSET_CURRENCY_TYPE.METAL) return '贵金属'
  if (type === ASSET_CURRENCY_TYPE.FIAT) return '法币'
  return String(type || '')
}

const coinIconFallback = (symbol) => String(symbol || '?').slice(0, 1).toUpperCase()

const form = reactive({
  type: ASSET_CURRENCY_TYPE.VIRTUAL,
  name: '',
  symbol: '',
  isQuoteCurrency: false,
  canDeposit: true,
  canWithdraw: true,
  precision: 6,
  status: ASSET_STATUS.ENABLED,
  autoCollect: true,
  networks: []
})

const isOffchain = computed(() => isNonVirtualType(form.type))

const currencyTypeOptions = [
  { value: ASSET_CURRENCY_TYPE.VIRTUAL, label: '虚拟币', hint: '可配置网络，支持充值/提现/归集' },
  { value: ASSET_CURRENCY_TYPE.METAL, label: '贵金属', hint: '无区块链网络，仅用于报价/资产记账（如 XAU）' },
  { value: ASSET_CURRENCY_TYPE.FIAT, label: '法币', hint: '无区块链网络，常用于汇率报价与法币记账' }
]

watch(
  () => form.type,
  (nextType) => {
    if (isNonVirtualType(nextType)) {
      form.autoCollect = false
      form.networks = []
      activeNetworkId.value = ''
      if (modalTab.value !== ASSET_MODAL_TAB.BASIC) modalTab.value = ASSET_MODAL_TAB.BASIC
      return
    }

    if (!form.networks.length) {
      const id = `nw-${Date.now()}`
      form.networks = [{ id, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED }]
      activeNetworkId.value = id
    }
  }
)

const switchOptions = (allLabel) => [{ value: 'all', label: allLabel }, { value: 'enabled', label: '开启' }, { value: 'disabled', label: '关闭' }]
const blankFilters = () => ({ type: 'all', status: ASSET_COMMON_FILTER_ALL, deposit: 'all', withdraw: 'all', name: '', symbol: '' })
const filters = ref(blankFilters())
const filterFields = [
  { key: 'type', label: '币种类型', options: [{ value: 'all', label: '全部币种类型' }, ...currencyTypeOptions.map(({ value, label }) => ({ value, label }))] },
  { key: 'status', label: '状态', options: [{ value: ASSET_COMMON_FILTER_ALL, label: '全部状态' }, { value: ASSET_STATUS.ENABLED, label: '已启用' }, { value: ASSET_STATUS.DISABLED, label: '已禁用' }] },
  { key: 'deposit', label: '入金', options: switchOptions('全部') },
  { key: 'withdraw', label: '出金', options: switchOptions('全部') },
  { key: 'name', label: '币种名称' },
  { key: 'symbol', label: '币种符号' }
]
const contains = (value, query) => !query || String(value || '').toLowerCase().includes(query.trim().toLowerCase())
const filteredCoins = computed(() => {
  const f = filters.value
  return coins.value.filter((coin) => {
    const hitStatus = f.status === ASSET_COMMON_FILTER_ALL || coin.status === f.status
    const hitType = f.type === 'all' || normalizeCurrencyType(coin.type) === f.type
    const hitDeposit = f.deposit === 'all' || Boolean(coin.canDeposit) === (f.deposit === 'enabled')
    const hitWithdraw = f.withdraw === 'all' || Boolean(coin.canWithdraw) === (f.withdraw === 'enabled')
    return hitStatus && hitType && hitDeposit && hitWithdraw && contains(coin.name, f.name) && contains(coin.symbol, f.symbol)
  })
})
function searchCoins(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function resetCoins() { filters.value = blankFilters(); page.value = 1 }
const columns = [
  { key: 'coin', title: '币种', width: 200, fixed: 'left' },
  { key: 'type', title: '类型', width: 140 },
  { key: 'precision', title: '精度（位）', width: 100, align: 'right' },
  { key: 'deposit', title: '入金', width: 80 },
  { key: 'withdraw', title: '出金', width: 80 },
  { key: 'networks', title: '支持网络', width: 120 },
  { key: 'autoCollect', title: '归集设置', width: 130 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

const enabledCount = computed(() => coins.value.filter((c) => c.status === ASSET_STATUS.ENABLED).length)

const cloneCoinToForm = (coin) => {
  form.type = normalizeCurrencyType(coin.type)
  form.name = coin.name
  form.symbol = coin.symbol
  form.isQuoteCurrency = Boolean(coin.isQuoteCurrency)
  form.canDeposit = coin.canDeposit ?? true
  form.canWithdraw = coin.canWithdraw ?? true
  form.precision = coin.precision
  form.status = coin.status
  form.autoCollect = coin.autoCollect
  form.networks = Array.isArray(coin.networks)
    ? coin.networks.map((n) => ({
        ...n,
        threshold: Number(n.threshold),
        gasLimit: Number(n.gasLimit),
        intervalMin: Number(n.intervalMin ?? coin.intervalMin ?? 60)
      }))
    : []
}

const openEdit = (coin) => {
  editingCoinId.value = coin.id
  cloneCoinToForm(coin)
  modalTab.value = ASSET_MODAL_TAB.BASIC
  activeNetworkId.value = form.networks[0]?.id || ''
  showEditModal.value = true
}

const openCreate = () => {
  editingCoinId.value = ''
  form.type = ASSET_CURRENCY_TYPE.VIRTUAL
  form.name = ''
  form.symbol = ''
  form.isQuoteCurrency = false
  form.canDeposit = true
  form.canWithdraw = true
  form.precision = 6
  form.status = ASSET_STATUS.ENABLED
  form.autoCollect = true
  form.networks = [
    { id: `nw-${Date.now()}`, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED }
  ]
  modalTab.value = ASSET_MODAL_TAB.BASIC
  activeNetworkId.value = form.networks[0]?.id || ''
  showEditModal.value = true
}

const addNetwork = () => {
  const id = `nw-${Date.now()}`
  form.networks.push({ id, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED })
  modalTab.value = ASSET_MODAL_TAB.NETWORK
  activeNetworkId.value = id
}

const removeNetwork = (id) => {
  form.networks = form.networks.filter((n) => n.id !== id)
  if (activeNetworkId.value === id) activeNetworkId.value = form.networks[0]?.id || ''
}

const setActiveNetwork = (key) => {
  activeNetworkId.value = (Array.isArray(key) ? key[key.length - 1] : key) || ''
}

const saveCoin = () => {
  const type = normalizeCurrencyType(form.type)
  const offchain = isNonVirtualType(type)
  if (![ASSET_CURRENCY_TYPE.VIRTUAL, ASSET_CURRENCY_TYPE.METAL, ASSET_CURRENCY_TYPE.FIAT].includes(type)) return message.error('请选择有效的币种类型')
  const symbol = form.symbol.trim().toUpperCase()
  if (!form.name.trim() || !symbol) {
    modalTab.value = ASSET_MODAL_TAB.BASIC
    return message.error('请填写币种名称和币种符号')
  }
  if (coins.value.some((coin) => coin.id !== editingCoinId.value && String(coin.symbol).toUpperCase() === symbol)) {
    modalTab.value = ASSET_MODAL_TAB.BASIC
    return message.error(`币种符号 ${symbol} 已存在`)
  }
  if (!offchain && form.networks.some((n) => !String(n.name || '').trim())) {
    modalTab.value = ASSET_MODAL_TAB.NETWORK
    activeNetworkId.value = form.networks.find((n) => !String(n.name || '').trim())?.id || activeNetworkId.value
    return message.error('请填写每个网络的网络名称')
  }
  const payload = {
    type,
    name: form.name.trim(),
    symbol,
    isQuoteCurrency: Boolean(form.isQuoteCurrency),
    canDeposit: Boolean(form.canDeposit),
    canWithdraw: Boolean(form.canWithdraw),
    precision: Number(form.precision),
    status: form.status,
    autoCollect: offchain ? false : Boolean(form.autoCollect),
    networks: offchain
      ? []
      : form.networks.map((n) => ({
          ...n,
          threshold: Number(n.threshold),
          intervalMin: Number.isFinite(Number(n.intervalMin)) ? Number(n.intervalMin) : 60,
          gasLimit: Number(n.gasLimit)
        }))
  }

  // 保存待提交的数据，先显示 MFA 验证弹窗
  pendingSaveData.value = payload
  showMfaModal.value = true
}

// 处理 MFA 验证
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    // TODO: 这里调用后端 API 验证 MFA 验证码
    // const response = await api.verifyMFA(code)
    
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 验证成功后执行实际的保存操作
    if (pendingSaveData.value) {
      if (editingCoinId.value) {
        coins.value = coins.value.map((coin) => (coin.id === editingCoinId.value ? { ...coin, ...pendingSaveData.value } : coin))
      } else {
        coins.value.unshift({ id: `coin-${Date.now()}`, ...pendingSaveData.value })
      }

      showEditModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      message.success('币种配置已保存')
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
    <SearchForm name="asset-currency-filters" :model="filters" :fields="filterFields" @search="searchCoins" @reset="resetCoins" />

    <AdminTable :title="`币种（启用 ${enabledCount} / ${coins.length}）`" v-model:page="page" :rows="filteredCoins" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreate"><template #icon><PlusOutlined /></template>新增币种</Button>
      </template>
      <template #cell="{ column, record: coin }">
        <Space v-if="column.key === 'coin'" :size="12">
          <Avatar>{{ coinIconFallback(coin.symbol) }}</Avatar>
          <Space direction="vertical" :size="0">
            <TypographyText strong>{{ coin.symbol }}</TypographyText>
            <TypographyText type="secondary">{{ coin.name }}</TypographyText>
          </Space>
        </Space>
        <Space v-else-if="column.key === 'type'" :size="4" wrap>
          <Tag>{{ currencyTypeLabel(coin.type) }}</Tag>
          <Tag v-if="coin.isQuoteCurrency" color="blue">计价</Tag>
        </Space>
        <template v-else-if="column.key === 'precision'">{{ coin.precision }}</template>
        <Tag v-else-if="column.key === 'deposit'" :color="coin.canDeposit ? 'green' : 'default'">{{ coin.canDeposit ? '开启' : '关闭' }}</Tag>
        <Tag v-else-if="column.key === 'withdraw'" :color="coin.canWithdraw ? 'green' : 'default'">{{ coin.canWithdraw ? '开启' : '关闭' }}</Tag>
        <template v-else-if="column.key === 'networks'">
          <TypographyText v-if="isNonVirtualType(coin.type)" type="secondary">不适用</TypographyText>
          <TypographyText v-else-if="!coin.networks.length" type="secondary">0 个</TypographyText>
          <Popover v-else trigger="click" placement="bottomLeft" :title="`${coin.symbol} 支持网络`">
            <template #content>
              <Space direction="vertical" :size="12" class="currency-network-popover">
                <Card v-for="network in coin.networks" :key="network.id" size="small" :title="network.name">
                  <template #extra><Tag :color="network.status === ASSET_STATUS.ENABLED ? 'green' : 'default'">{{ network.status === ASSET_STATUS.ENABLED ? '启用' : '禁用' }}</Tag></template>
                  <Descriptions :column="1" size="small">
                    <DescriptionsItem label="合约"><span class="font-mono">{{ network.contract || '—' }}</span></DescriptionsItem>
                    <DescriptionsItem label="归集地址"><span class="font-mono">{{ network.collectAddress || '—' }}</span></DescriptionsItem>
                    <DescriptionsItem label="归集间隔">{{ network.intervalMin }} 分钟</DescriptionsItem>
                    <DescriptionsItem label="阈值">{{ network.threshold }} {{ coin.symbol }}</DescriptionsItem>
                  </Descriptions>
                </Card>
              </Space>
            </template>
            <Button type="link" class="px-0">{{ coin.networks.length }} 个网络</Button>
          </Popover>
        </template>
        <template v-else-if="column.key === 'autoCollect'">
          <TypographyText v-if="isNonVirtualType(coin.type)" type="secondary">不适用</TypographyText>
          <Tag v-else :color="coin.autoCollect ? 'blue' : 'default'">{{ coin.autoCollect ? '开启（按网络）' : '关闭' }}</Tag>
        </template>
        <Tag v-else-if="column.key === 'status'" :color="coin.status === ASSET_STATUS.ENABLED ? 'green' : 'default'">{{ coin.status === ASSET_STATUS.ENABLED ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="openEdit(coin)">编辑</Button>
        <template v-else>{{ coin[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminDialog :open="showEditModal" :title="editingCoinId ? '编辑币种配置' : '新增币种配置'" :width="960" plain @close="showEditModal = false">
      <div class="currency-dialog-body">
        <Tabs v-model:activeKey="modalTab">
          <TabPane :key="ASSET_MODAL_TAB.BASIC" tab="基本信息">
            <Form layout="vertical" name="asset-currency-basic" :model="form">
              <FormItem label="币种类型" required :extra="isOffchain ? '已选择非虚拟币：将不显示归集设置与网络设置，保存时自动清空网络。' : undefined">
                <RadioGroup v-model:value="form.type" aria-label="币种类型">
                  <Space direction="vertical" :size="8">
                    <Radio v-for="option in currencyTypeOptions" :key="option.value" :value="option.value">
                      <TypographyText strong>{{ option.label }}</TypographyText>
                      <TypographyText type="secondary" class="currency-type-hint">{{ option.hint }}</TypographyText>
                    </Radio>
                  </Space>
                </RadioGroup>
              </FormItem>
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="币种名称" required><Input v-model:value="form.name" :maxlength="60" placeholder="如：Tether" /></FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="币种符号" required><Input v-model:value="form.symbol" :maxlength="20" placeholder="如：USDT" /></FormItem>
                </Col>
              </Row>
              <FormItem label="币种 Icon">
                <Card size="small">
                  <Space :size="16" align="center">
                    <Avatar :size="56">{{ coinIconFallback(form.symbol) }}</Avatar>
                    <Space direction="vertical" :size="0">
                      <TypographyText strong>上传 Icon</TypographyText>
                      <TypographyText type="secondary">支持 PNG/JPG/SVG，建议 120x120；当前仅展示界面，后续接入上传接口。</TypographyText>
                    </Space>
                    <Button>选择图片</Button>
                  </Space>
                </Card>
              </FormItem>
              <Row :gutter="16">
                <Col :xs="24" :sm="8"><FormItem label="是否计价货币"><Switch v-model:checked="form.isQuoteCurrency" aria-label="是否计价货币" checked-children="是" un-checked-children="否" /></FormItem></Col>
                <Col :xs="24" :sm="8"><FormItem label="允许入金"><Switch v-model:checked="form.canDeposit" aria-label="允许入金" checked-children="开启" un-checked-children="关闭" /></FormItem></Col>
                <Col :xs="24" :sm="8"><FormItem label="允许出金"><Switch v-model:checked="form.canWithdraw" aria-label="允许出金" checked-children="开启" un-checked-children="关闭" /></FormItem></Col>
              </Row>
              <Row :gutter="16">
                <Col :xs="24" :sm="12">
                  <FormItem label="精度位数"><InputNumber v-model:value="form.precision" :min="0" :max="18" :precision="0" class="currency-number" /></FormItem>
                </Col>
                <Col :xs="24" :sm="12">
                  <FormItem label="状态">
                    <Select v-model:value="form.status" :options="[{ value: ASSET_STATUS.ENABLED, label: '启用' }, { value: ASSET_STATUS.DISABLED, label: '禁用' }]" aria-label="状态" />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </TabPane>

          <TabPane v-if="!isOffchain" :key="ASSET_MODAL_TAB.NETWORK" tab="设置网络">
            <Card size="small" title="归集设置">
              <Space :size="8"><Switch v-model:checked="form.autoCollect" aria-label="启用自动归集" /><TypographyText>启用自动归集</TypographyText></Space>
            </Card>
            <div class="currency-network-toolbar">
              <TypographyText type="secondary">仅展开当前编辑网络，减少干扰；可切换网络逐个配置。</TypographyText>
              <Button type="primary" @click="addNetwork"><template #icon><PlusOutlined /></template>添加网络</Button>
            </div>
            <Empty v-if="!form.networks.length" description="暂无网络，请添加网络" />
            <Collapse v-else accordion :active-key="activeNetworkId || undefined" @change="setActiveNetwork">
              <CollapsePanel v-for="(network, index) in form.networks" :key="network.id" :header="`网络 ${index + 1} · ${network.name || '未命名网络'}`">
                <template #extra>
                  <Space :size="8" @click.stop>
                    <Tag :color="network.status === ASSET_STATUS.ENABLED ? 'green' : 'default'">{{ network.status === ASSET_STATUS.ENABLED ? '启用' : '禁用' }}</Tag>
                    <Button type="link" danger size="small" @click.stop="removeNetwork(network.id)">删除</Button>
                  </Space>
                </template>
                <Form layout="vertical" :name="`asset-currency-network-${index}`" :model="network">
                  <Row :gutter="16">
                    <Col :xs="24" :sm="12"><FormItem label="网络名称" required><Input v-model:value="network.name" placeholder="如：TRC20" /></FormItem></Col>
                    <Col :xs="24" :sm="12"><FormItem :label="`最小归集数量（${form.symbol || '币种'}）`"><InputNumber v-model:value="network.threshold" :min="0" class="currency-number" /></FormItem></Col>
                    <Col :xs="24" :sm="12"><FormItem label="归集间隔（分钟）"><InputNumber v-model:value="network.intervalMin" :disabled="!form.autoCollect" :min="0" :precision="0" class="currency-number" /></FormItem></Col>
                    <Col :xs="24" :sm="12"><FormItem label="Gas 限制"><InputNumber v-model:value="network.gasLimit" :min="0" :precision="0" class="currency-number" /></FormItem></Col>
                    <Col :xs="24"><FormItem label="合约地址"><Input v-model:value="network.contract" class="font-mono" /></FormItem></Col>
                    <Col :xs="24"><FormItem label="归集地址"><Input v-model:value="network.collectAddress" class="font-mono" /></FormItem></Col>
                    <Col :xs="24">
                      <FormItem label="启用该网络">
                        <Switch :checked="network.status === ASSET_STATUS.ENABLED" aria-label="启用该网络" checked-children="启用" un-checked-children="禁用" @update:checked="network.status = $event ? ASSET_STATUS.ENABLED : ASSET_STATUS.DISABLED" />
                      </FormItem>
                    </Col>
                  </Row>
                </Form>
              </CollapsePanel>
            </Collapse>
          </TabPane>
        </Tabs>
      </div>
      <footer>
        <Button @click="showEditModal = false">取消</Button>
        <Button type="primary" @click="saveCoin">保存</Button>
      </footer>
    </AdminDialog>

    <!-- MFA 验证弹窗 -->
    <MfaVerificationModal
      v-model:open="showMfaModal"
      :loading="mfaLoading"
      title="安全验证"
      description="编辑币种配置属于敏感操作，请输入 MFA 验证码"
      @verify="handleMfaVerify"
      @cancel="pendingSaveData = null"
    />
  </PageShell>
</template>

<style scoped>
.currency-dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-top: 8px; padding-bottom: 24px; }
.currency-number { width: 100%; }
.currency-type-hint { margin-left: 8px; }
.currency-network-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 16px 0; }
.currency-network-popover { width: 360px; max-height: 420px; overflow-y: auto; }
</style>
