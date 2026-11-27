<script setup>
// VIP 等级配置 — Ant Design Pro list page (2026-11-28): no filters, so the page starts with the table card; create in
// the toolbar, status as a text Tag, link actions (启用/禁用 moved out of the status badge; 删除 is danger and
// confirmed in a dialog instead of a native confirm). Native alerts are replaced by toasts, and a new level can no
// longer reuse an existing level number (the old form allowed duplicate levels).
import { ref, computed } from 'vue'
import { Button, Image, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { vipLevels } from '../../../admin/mock/vip'
import { VIP_LEVEL_STATUS } from '../../../admin/constants/vip'

// 编辑模态框状态
const showModal = ref(false)
const editingVip = ref(null)
const isEditing = ref(false)
const page = ref(1)

// 表单数据
const formData = ref({
  level: 0,
  name: '',
  displayName: '',
  iconUrl: '',
  status: VIP_LEVEL_STATUS.ENABLED,
  description: ''
})

// 图标上传预览
const iconPreview = ref('')
const fileInput = ref(null)

// 本地VIP列表
const localVipLevels = ref([...vipLevels])

// 状态配置
const statusConfig = {
  [VIP_LEVEL_STATUS.ENABLED]: { text: '启用', color: 'green' },
  [VIP_LEVEL_STATUS.DISABLED]: { text: '禁用', color: 'default' }
}

const columns = [
  { key: 'level', title: '等级', width: 80, align: 'right' },
  { key: 'name', title: '系统名称', width: 140 },
  { key: 'displayName', title: '显示名称', width: 180 },
  { key: 'icon', title: '图标', width: 90 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' }
]

// 触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click()
}

// 处理图标上传
const handleIconUpload = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    message.error('请上传图片文件')
    event.target.value = ''
    return
  }

  // 验证文件大小（限制为1MB）
  if (file.size > 1024 * 1024) {
    message.error('图片大小不能超过1MB')
    event.target.value = ''
    return
  }

  // 创建预览
  const reader = new FileReader()
  reader.onload = (e) => {
    iconPreview.value = e.target.result
    formData.value.iconUrl = e.target.result // 实际项目中应上传到服务器
  }
  reader.readAsDataURL(file)
}

// 清除图标
const clearIcon = () => {
  iconPreview.value = ''
  formData.value.iconUrl = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const nextLevel = () => localVipLevels.value.reduce((max, vip) => Math.max(max, Number(vip.level) || 0), -1) + 1

// 打开新增模态框
const openAddModal = () => {
  isEditing.value = false
  editingVip.value = null
  const level = nextLevel()
  formData.value = {
    level,
    name: `VIP${level}`,
    displayName: '',
    iconUrl: '',
    status: VIP_LEVEL_STATUS.ENABLED,
    description: ''
  }
  iconPreview.value = ''
  showModal.value = true
}

// 打开编辑模态框
const openEditModal = (vip) => {
  isEditing.value = true
  editingVip.value = vip
  formData.value = {
    level: vip.level,
    name: vip.name,
    displayName: vip.displayName,
    iconUrl: vip.iconUrl || '',
    status: vip.status,
    description: vip.description
  }
  iconPreview.value = vip.iconUrl || ''
  showModal.value = true
}

// 关闭模态框
const closeModal = () => {
  showModal.value = false
  editingVip.value = null
}

// 保存VIP配置
const saveVip = () => {
  if (!String(formData.value.displayName || '').trim()) {
    message.error('请输入显示名称')
    return
  }

  if (isEditing.value) {
    // 编辑（会员权益不在此页维护，沿用原数据）
    const index = localVipLevels.value.findIndex(v => v.id === editingVip.value.id)
    if (index !== -1) {
      localVipLevels.value[index] = {
        ...editingVip.value,
        ...formData.value,
        benefits: editingVip.value.benefits,
        updatedAt: new Date().toISOString()
      }
    }
    message.success('VIP 等级已保存')
  } else {
    const level = Number(formData.value.level)
    if (formData.value.level === '' || !Number.isInteger(level) || level < 0) {
      message.error('等级编号须为不小于 0 的整数')
      return
    }
    if (localVipLevels.value.some((v) => Number(v.level) === level)) {
      message.error(`等级编号 ${level} 已存在`)
      return
    }
    // 新增
    const newVip = {
      id: `vip_${Date.now()}`,
      ...formData.value,
      level,
      benefits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    localVipLevels.value.push(newVip)
    message.success('VIP 等级已创建')
  }

  closeModal()
}

// 删除VIP配置（确认对话框替代原生 confirm）
const deleteTarget = ref(null)
const requestDelete = (vip) => {
  if (vip.level === 0) {
    message.warning('普通用户等级不能删除')
    return
  }
  deleteTarget.value = vip
}
const confirmDelete = () => {
  const vip = deleteTarget.value
  if (!vip) return
  const index = localVipLevels.value.findIndex(v => v.id === vip.id)
  if (index !== -1) {
    localVipLevels.value.splice(index, 1)
    message.success(`已删除 ${vip.displayName}`)
  }
  deleteTarget.value = null
}

// 切换状态
const toggleStatus = (vip) => {
  if (vip.level === 0) {
    message.warning('普通用户等级不能禁用')
    return
  }

  const index = localVipLevels.value.findIndex(v => v.id === vip.id)
  if (index !== -1) {
    const next = vip.status === VIP_LEVEL_STATUS.ENABLED ? VIP_LEVEL_STATUS.DISABLED : VIP_LEVEL_STATUS.ENABLED
    localVipLevels.value[index].status = next
    message.success(next === VIP_LEVEL_STATUS.ENABLED ? `${vip.displayName} 已启用` : `${vip.displayName} 已禁用`)
  }
}

// 按等级排序
const sortedVipLevels = computed(() => {
  return [...localVipLevels.value].sort((a, b) => a.level - b.level)
})
</script>

<template>
  <PageShell>
    <AdminTable title="VIP 等级" v-model:page="page" :rows="sortedVipLevels" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openAddModal"><template #icon><PlusOutlined /></template>添加 VIP 等级</Button>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'name'" strong>{{ record.name }}</TypographyText>
        <template v-else-if="column.key === 'icon'">
          <Image v-if="record.iconUrl" :src="record.iconUrl" :alt="`${record.displayName}图标`" :width="32" :height="32" :preview="false" />
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <Tag v-else-if="column.key === 'status'" :color="statusConfig[record.status]?.color">{{ statusConfig[record.status]?.text || record.status }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openEditModal(record)">编辑</Button>
          <template v-if="record.level !== 0">
            <Button type="link" class="px-0" @click="toggleStatus(record)">{{ record.status === VIP_LEVEL_STATUS.ENABLED ? '禁用' : '启用' }}</Button>
            <Button type="link" danger class="px-0" @click="requestDelete(record)">删除</Button>
          </template>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminModal :open="!!deleteTarget" title="删除 VIP 等级" :width="448" confirm-text="确认删除" danger @close="deleteTarget = null" @confirm="confirmDelete">
      <p>确定要删除 {{ deleteTarget?.displayName }} 吗？删除后将无法恢复。</p>
    </AdminModal>

    <!-- 编辑/新增模态框 -->
    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">
                    {{ isEditing ? '编辑VIP等级' : '创建VIP等级' }}
                  </h2>
                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ isEditing ? '修改VIP等级的配置信息' : '添加新的VIP等级配置' }}
                  </p>
                </div>
                <a-button aria-label="关闭" @click="closeModal" class="hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" html-type="button">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </a-button>
              </div></template></template><template v-if="showModal"><div class="overflow-y-auto" style="max-height: calc(90vh - 180px);">
                <div class="p-6 space-y-5">
                  <!-- 基本信息 -->
                  <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                    <h3 class="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <svg class="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      基本信息
                    </h3>

                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <!-- 等级 -->
                      <div class="sm:col-span-1">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">
                          等级编号
                          <span v-if="isEditing" class="text-xs font-normal text-slate-500">（不可改）</span>
                        </label>
                        <a-input type="number" :min="0" :disabled="isEditing" class="w-full disabled:cursor-not-allowed" :value="formData.level" @update:value="formData.level = $event === '' ? '' : Number($event)" />
                      </div>

                      <!-- 系统名称 -->
                      <div class="sm:col-span-1">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">系统名称</label>
                        <a-input v-model:value="formData.name" type="text" placeholder="例如：VIP1" class="w-full" />
                      </div>

                      <!-- 显示名称 整行 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">
                          显示名称 <span class="text-rose-500">*</span>
                        </label>
                        <a-input v-model:value="formData.displayName" type="text" placeholder="例如：黄金会员" required class="w-full" />
                      </div>

                      <!-- 前台徽章 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">前台徽章图标</label>
                        <input
                          ref="fileInput"
                          type="file"
                          accept="image/*"
                          style="display: none"
                          @change="handleIconUpload"
                        />
                        <div class="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                            title="接近前台展示尺寸"
                          >
                            <img
                              v-if="iconPreview"
                              :src="iconPreview"
                              alt=""
                              class="h-full w-full object-contain"
                            />
                            <svg
                              v-else
                              class="h-5 w-5 text-slate-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div class="flex flex-wrap gap-2">
                              <a-button html-type="button" class="!text-xs" @click="triggerFileSelect" type="primary">
                                {{ iconPreview ? '更换' : '上传' }}
                              </a-button>
                              <a-button v-if="iconPreview" html-type="button" class="!text-xs" @click="clearIcon">
                                清除
                              </a-button>
                            </div>
                            <p class="text-xs text-slate-500">小徽章图，建议 48×48～64×64，≤1MB，PNG。</p>
                          </div>
                        </div>
                      </div>

                      <!-- 状态 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                        <a-select v-model:value="formData.status" class="w-full">
                          <a-select-option value="enabled">启用</a-select-option>
                          <a-select-option value="disabled">禁用</a-select-option>
                        </a-select>
                      </div>
                    </div>
                  </div>

                  <!-- 等级说明（全宽，独立区块） -->
                  <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                    <h3 class="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                      <svg class="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      等级说明
                    </h3>
                    <p class="text-xs text-slate-500 mb-3">面向用户或运营展示的文案，可选填。</p>
                    <a-textarea v-model:value="formData.description" :rows="5" placeholder="简要说明该等级的权益亮点、适用人群或升级提示等…" class="w-full resize-y leading-relaxed"></a-textarea>
                  </div>
                </div>
              </div></template><template #footer><template v-if="Boolean(showModal)"><div class="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <a-button html-type="button" @click="closeModal" >
                  取消
                </a-button>
                <a-button html-type="button" type="primary" @click="saveVip">
                  {{ isEditing ? '保存修改' : '创建等级' }}
                </a-button>
              </div></template></template></a-modal>
  </PageShell>
</template>
