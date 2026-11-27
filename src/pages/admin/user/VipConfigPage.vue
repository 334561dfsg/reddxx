<script setup>
import { ref, computed } from 'vue'
import { vipLevels } from '../../../admin/mock/vip'
import { VIP_LEVEL_STATUS } from '../../../admin/constants/vip'

// 编辑模态框状态
const showModal = ref(false)
const editingVip = ref(null)
const isEditing = ref(false)

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
  [VIP_LEVEL_STATUS.ENABLED]: { text: '启用', class: 'bg-emerald-100 text-emerald-700' },
  [VIP_LEVEL_STATUS.DISABLED]: { text: '禁用', class: 'bg-gray-100 text-gray-700' }
}

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
    alert('请上传图片文件')
    return
  }

  // 验证文件大小（限制为1MB）
  if (file.size > 1024 * 1024) {
    alert('图片大小不能超过1MB')
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

// 打开新增模态框
const openAddModal = () => {
  isEditing.value = false
  editingVip.value = null
  formData.value = {
    level: localVipLevels.value.length,
    name: `VIP${localVipLevels.value.length}`,
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
  if (!formData.value.displayName.trim()) {
    alert('请输入显示名称')
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
  } else {
    // 新增
    const newVip = {
      id: `vip_${Date.now()}`,
      ...formData.value,
      benefits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    localVipLevels.value.push(newVip)
  }

  closeModal()
}

// 删除VIP配置
const deleteVip = (vip) => {
  if (vip.level === 0) {
    alert('普通用户等级不能删除')
    return
  }

  if (confirm(`确定要删除 ${vip.displayName} 吗？`)) {
    const index = localVipLevels.value.findIndex(v => v.id === vip.id)
    if (index !== -1) {
      localVipLevels.value.splice(index, 1)
    }
  }
}

// 切换状态
const toggleStatus = (vip) => {
  if (vip.level === 0) {
    alert('普通用户等级不能禁用')
    return
  }

  const index = localVipLevels.value.findIndex(v => v.id === vip.id)
  if (index !== -1) {
    localVipLevels.value[index].status = 
      vip.status === VIP_LEVEL_STATUS.ENABLED 
        ? VIP_LEVEL_STATUS.DISABLED 
        : VIP_LEVEL_STATUS.ENABLED
  }
}

// 按等级排序
const sortedVipLevels = computed(() => {
  return [...localVipLevels.value].sort((a, b) => a.level - b.level)
})
</script>

<template>
  <section class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">VIP等级配置</h1>
        <p class="text-sm text-slate-500 mt-1">配置平台VIP等级、图标等信息</p>
      </div>
    </div>

    <!-- VIP等级列表 -->
    <div class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div class="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <h3 class="text-base font-semibold text-slate-900">等级列表</h3>
        <button 
          @click="openAddModal"
          class="ant-btn ant-btn-primary"
        >
          + 添加VIP等级
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">等级</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">名称</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">显示名称</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">图标</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr 
              v-for="vip in sortedVipLevels" 
              :key="vip.id"
              class="hover:bg-slate-50 transition-colors"
            >
              <!-- 等级 -->
              <td class="px-4 py-3">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  {{ vip.level }}
                </span>
              </td>

              <!-- 名称 -->
              <td class="px-4 py-3">
                <span class="text-sm font-medium text-slate-900">{{ vip.name }}</span>
              </td>

              <!-- 显示名称 -->
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ vip.displayName }}</span>
              </td>

              <!-- 图标 -->
              <td class="px-4 py-3 text-center">
                <div v-if="vip.iconUrl" class="inline-flex items-center justify-center">
                  <img 
                    :src="vip.iconUrl"
                    alt="VIP图标"
                    class="h-8 w-8 object-contain" 
                  />
                </div>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>

              <!-- 状态 -->
              <td class="px-4 py-3">
                <button
                  @click="toggleStatus(vip)"
                  :class="statusConfig[vip.status].class"
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {{ statusConfig[vip.status].text }}
                </button>
              </td>

              <!-- 操作 -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    @click="openEditModal(vip)"
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    编辑
                  </button>
                  <button
                    v-if="vip.level !== 0"
                    @click="deleteVip(vip)"
                    class="text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑/新增模态框 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vip-config-dialog-title"
              class="relative max-w-2xl w-full max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
            >
              <!-- 标题栏 -->
              <div class="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 id="vip-config-dialog-title" class="text-lg font-bold text-slate-900">
                    {{ isEditing ? '编辑VIP等级' : '创建VIP等级' }}
                  </h2>
                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ isEditing ? '修改VIP等级的配置信息' : '添加新的VIP等级配置' }}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  @click="closeModal"
                  class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <!-- 表单内容 - 滚动区域（单列：上基础字段，下等级说明） -->
              <div class="overflow-y-auto" style="max-height: calc(90vh - 180px);">
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
                        <input
                          v-model.number="formData.level"
                          type="number"
                          min="0"
                          :disabled="isEditing"
                          class="ant-input w-full !py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                      </div>

                      <!-- 系统名称 -->
                      <div class="sm:col-span-1">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">系统名称</label>
                        <input
                          v-model="formData.name"
                          type="text"
                          placeholder="例如：VIP1"
                          class="ant-input w-full !py-2"
                        />
                      </div>

                      <!-- 显示名称 整行 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">
                          显示名称 <span class="text-rose-500">*</span>
                        </label>
                        <input
                          v-model="formData.displayName"
                          type="text"
                          placeholder="例如：黄金会员"
                          required
                          class="ant-input w-full !py-2"
                        />
                      </div>

                      <!-- 前台徽章 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">前台徽章图标</label>
                        <input
                          ref="fileInput"
                          type="file"
                          accept="image/*"
                          class="hidden"
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
                              <button type="button" class="ant-btn ant-btn-primary !h-8 !px-3 !text-xs" @click="triggerFileSelect">
                                {{ iconPreview ? '更换' : '上传' }}
                              </button>
                              <button
                                v-if="iconPreview"
                                type="button"
                                class="ant-btn !h-8 !px-3 !text-xs"
                                @click="clearIcon"
                              >
                                清除
                              </button>
                            </div>
                            <p class="text-xs text-slate-500">小徽章图，建议 48×48～64×64，≤1MB，PNG。</p>
                          </div>
                        </div>
                      </div>

                      <!-- 状态 -->
                      <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
                        <select v-model="formData.status" class="ant-select w-full !py-2">
                          <option value="enabled">启用</option>
                          <option value="disabled">禁用</option>
                        </select>
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
                    <textarea
                      v-model="formData.description"
                      rows="5"
                      placeholder="简要说明该等级的权益亮点、适用人群或升级提示等…"
                      class="ant-input w-full min-h-[7.5rem] resize-y py-3 leading-relaxed"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  @click="saveVip"
                  class="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
                >
                  {{ isEditing ? '💾 保存修改' : '✨ 创建等级' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
