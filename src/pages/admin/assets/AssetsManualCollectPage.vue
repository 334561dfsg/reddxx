<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, ref, watch } from 'vue'
import { Button, Card, Checkbox, Col, Descriptions, DescriptionsItem, Empty, Form, FormItem, Row, Select, Space, Statistic, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { ASSET_WALLET_STATUS } from '../../../admin/constants/assets'
import { createManualCollectConfigMock } from '../../../admin/mock/assets'

const selectedCoin = ref('USDT')
const selectedNetwork = ref('Ethereum (ERC20)')
const confirmCollect = ref(false)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingCollectData = ref(null)
const mfaLoading = ref(false)

const pageSize = ref(10)
const currentPage = ref(1)
const loading = ref(false)
const loadError = ref('')
const lastLoadedAt = ref('')
const loadRequestId = ref(0)

const { coinOptions, networkOptionsMap, networkMap, walletSource } = createManualCollectConfigMock()

const wallets = ref([])

const currentNetworkOptions = computed(() => networkOptionsMap[selectedCoin.value] || [])
const detail = computed(() => {
  const item = networkMap[`${selectedCoin.value}|${selectedNetwork.value}`]
  if (!item) return { collectAddress: '-', threshold: '-', gasLimit: '-' }
  return {
    collectAddress: item.collectAddress,
    threshold: `${item.threshold} ${selectedCoin.value}`,
    gasLimit: item.gasLimit
  }
})

const total = computed(() => wallets.value.length)
const collectableWallets = computed(() => wallets.value.filter((w) => w.status === ASSET_WALLET_STATUS.COLLECTABLE))

const getCollectAmount = (wallet) => {
  if (!wallet || wallet.status !== ASSET_WALLET_STATUS.COLLECTABLE) return 0
  return Number(wallet.balance)
}

const selectedWallets = computed(() => wallets.value.filter((w) => w.checked && w.status === ASSET_WALLET_STATUS.COLLECTABLE))
const selectedCount = computed(() => selectedWallets.value.length)
const selectedTotal = computed(() => selectedWallets.value.reduce((sum, w) => sum + getCollectAmount(w), 0))

const globalAllChecked = computed({
  get: () => collectableWallets.value.length > 0 && collectableWallets.value.every((w) => w.checked),
  set: (val) => {
    collectableWallets.value.forEach((w) => {
      w.checked = Boolean(val)
    })
  }
})

// Ant Table selection mirrors wallet.checked; only collectable wallets can be selected. The header checkbox selects
// the current page (the old 仅当前页全选); the card toolbar keeps 全选 for every collectable wallet.
const rowSelection = computed(() => ({
  selectedRowKeys: wallets.value.filter((w) => w.checked).map((w) => w.id),
  onChange: (keys) => {
    const picked = new Set(keys)
    wallets.value.forEach((w) => { w.checked = w.status === ASSET_WALLET_STATUS.COLLECTABLE && picked.has(w.id) })
  },
  getCheckboxProps: (wallet) => ({ disabled: wallet.status !== ASSET_WALLET_STATUS.COLLECTABLE, 'aria-label': `选择 ${wallet.name}` })
}))
const walletColumns = [
  { key: 'wallet', title: '钱包' },
  { key: 'balance', title: '余额', align: 'right', width: 180 },
  { key: 'collect', title: '预计归集', align: 'right', width: 180 },
  { key: 'status', title: '状态', width: 100 }
]
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (count) => `共 ${count} 条地址`,
  onChange: (page, size) => {
    if (size !== pageSize.value) pageSize.value = size
    else currentPage.value = page
  }
}))

const fmtTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const loadWallets = async () => {
  const key = `${selectedCoin.value}|${selectedNetwork.value}`
  const reqId = ++loadRequestId.value
  loading.value = true
  loadError.value = ''

  try {
    const delay = 800 + Math.floor(Math.random() * 1200)
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (Math.random() < 0.12) throw new Error('网络响应较慢，请重试')
    if (reqId !== loadRequestId.value) return

    const previousChecked = new Map(wallets.value.map((w) => [w.id, w.checked]))
    const source = walletSource[key] || []
    wallets.value = source.map((item) => {
      const prev = previousChecked.has(item.id) ? previousChecked.get(item.id) : item.checked
      const checked = item.status === ASSET_WALLET_STATUS.COLLECTABLE ? Boolean(prev) : false
      return { ...item, checked }
    })
    currentPage.value = 1
    lastLoadedAt.value = fmtTime()
  } catch (err) {
    if (reqId !== loadRequestId.value) return
    loadError.value = err instanceof Error ? err.message : '加载失败'
    wallets.value = []
  } finally {
    if (reqId === loadRequestId.value) loading.value = false
  }
}

watch(
  selectedCoin,
  (coin) => {
    selectedNetwork.value = networkOptionsMap[coin]?.[0] || ''
  },
  { immediate: true }
)

watch(
  [selectedCoin, selectedNetwork],
  () => {
    if (!selectedNetwork.value) return
    loadWallets()
  },
  { immediate: true }
)

watch(pageSize, () => {
  currentPage.value = 1
})

const statusText = (status) => (status === ASSET_WALLET_STATUS.COLLECTABLE ? '可归集' : '低于阈值')

// 处理归集操作
const handleCollectClick = () => {
  // 准备归集数据
  const collectData = {
    coin: selectedCoin.value,
    network: selectedNetwork.value,
    wallets: selectedWallets.value.map(w => ({
      id: w.id,
      address: w.address,
      balance: getCollectAmount(w)
    })),
    totalAmount: selectedTotal.value,
    count: selectedCount.value
  }
  
  // 保存待提交的数据，显示 MFA 验证弹窗
  pendingCollectData.value = collectData
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
    
    // 验证成功后执行实际的归集操作
    if (pendingCollectData.value) {
      // TODO: 调用后端 API 执行归集
      // await api.executeCollect(pendingCollectData.value)
      
      message.success(`成功归集 ${pendingCollectData.value.totalAmount.toFixed(4)} ${pendingCollectData.value.coin}，共 ${pendingCollectData.value.count} 个地址`)
      
      // 重置选中状态
      wallets.value.forEach(w => {
        if (w.checked) w.checked = false
      })
      
      pendingCollectData.value = null
      showMfaModal.value = false
      confirmCollect.value = false
      
      // 重新加载钱包列表
      loadWallets()
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
    <Row :gutter="[24, 24]">
      <Col :xs="24" :xl="8">
        <Space direction="vertical" :size="24" class="manual-collect-side">
          <Card title="归集配置" :bordered="false">
            <Form layout="vertical" name="manual-collect-config">
              <FormItem label="选择币种">
                <Select v-model:value="selectedCoin" show-search option-filter-prop="label" not-found-content="无匹配币种" :options="coinOptions.map((coin) => ({ value: coin, label: coin }))" aria-label="选择币种" />
              </FormItem>
              <FormItem label="选择网络">
                <Select v-model:value="selectedNetwork" show-search option-filter-prop="label" not-found-content="无匹配网络" :options="currentNetworkOptions.map((network) => ({ value: network, label: network }))" aria-label="选择网络" />
              </FormItem>
            </Form>
            <Descriptions :column="1" size="small" bordered>
              <DescriptionsItem label="归集地址"><span class="font-mono">{{ detail.collectAddress }}</span></DescriptionsItem>
              <DescriptionsItem label="最小归集数量">{{ detail.threshold }}</DescriptionsItem>
              <DescriptionsItem label="Gas 限制">{{ detail.gasLimit }}</DescriptionsItem>
            </Descriptions>
            <Space direction="vertical" :size="8" class="manual-collect-block">
              <Button block :loading="loading" @click="loadWallets"><template #icon><ReloadOutlined /></template>{{ loading ? '加载中' : '加载钱包余额' }}</Button>
              <TypographyText v-if="lastLoadedAt" type="secondary">最近加载时间：{{ lastLoadedAt }}</TypographyText>
            </Space>
            <FeedbackToast v-if="loadError" type="error" :source="() => (loadError ? `${loadError}，请重试。` : '')"></FeedbackToast>
          </Card>

          <Card title="归集金额" :bordered="false">
            <Row :gutter="16">
              <Col :span="10"><Statistic title="已选地址" :value="selectedCount" suffix="个" /></Col>
              <Col :span="14"><Statistic :title="`归集总额（${selectedCoin}）`" :value="selectedTotal.toFixed(4)" /></Col>
            </Row>
            <Space direction="vertical" :size="8" class="manual-collect-block">
              <Checkbox v-model:checked="confirmCollect">我已确认归集操作</Checkbox>
              <TypographyText type="secondary">请确认地址与金额无误后再执行归集。低于阈值地址不可归集。</TypographyText>
              <Button type="primary" block :disabled="selectedCount === 0 || selectedTotal <= 0 || loading || !confirmCollect" @click="handleCollectClick">开始归集</Button>
            </Space>
          </Card>
        </Space>
      </Col>

      <Col :xs="24" :xl="16">
        <Card :title="`钱包列表（${total}）`" :bordered="false">
          <template #extra>
            <Checkbox v-model:checked="globalAllChecked" :disabled="loading || collectableWallets.length === 0">全选全部可归集地址</Checkbox>
          </template>
          <Empty v-if="loadError && !loading" description="钱包余额加载失败">
            <Button @click="loadWallets">重试加载</Button>
          </Empty>
          <Table v-else :loading="loading" :columns="walletColumns" :data-source="wallets" row-key="id" size="middle" :row-selection="rowSelection" :pagination="pagination" :locale="{ emptyText: '暂无钱包地址' }">
            <template #bodyCell="{ column, record: wallet }">
              <Space v-if="column.key === 'wallet'" direction="vertical" :size="0">
                <TypographyText strong>{{ wallet.name }}</TypographyText>
                <TypographyText type="secondary" class="font-mono">{{ wallet.address }}</TypographyText>
              </Space>
              <span v-else-if="column.key === 'balance'">{{ wallet.balance.toLocaleString() }} {{ selectedCoin }}</span>
              <template v-else-if="column.key === 'collect'">
                <span v-if="wallet.status === ASSET_WALLET_STATUS.COLLECTABLE">{{ getCollectAmount(wallet).toFixed(4) }} {{ selectedCoin }}</span>
                <TypographyText v-else type="secondary">—</TypographyText>
              </template>
              <Tag v-else-if="column.key === 'status'" :color="wallet.status === ASSET_WALLET_STATUS.COLLECTABLE ? 'green' : 'orange'">{{ statusText(wallet.status) }}</Tag>
            </template>
          </Table>
        </Card>
      </Col>
    </Row>
  </PageShell>

  <!-- MFA 验证弹窗 -->
  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    title="资金归集验证"
    description="执行资金归集属于敏感操作，请输入 MFA 验证码"
    @verify="handleMfaVerify"
    @cancel="pendingCollectData = null"
  />
</template>

<style scoped>
.manual-collect-side,
.manual-collect-block { width: 100%; }
.manual-collect-block { margin-top: 16px; }
</style>
