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
        <a-button @click="openAddModal" class="" html-type="button" type="primary">
          + 添加VIP等级
        </a-button>
      </div>
      <div class="overflow-x-auto">
        <a-table  :data-source="sortedVipLevels" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(vip) => vip.id" :custom-row="(vip, index) => ({ class: [&quot;hover:bg-slate-50 transition-colors&quot;] })">
<a-table-column key="column-0" ><template #title>等级</template><template #default="{ record: vip, index: index }"><div class=" ">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  {{ vip.level }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>名称</template><template #default="{ record: vip, index: index }"><div class=" ">
                <span class="text-sm font-medium text-slate-900">{{ vip.name }}</span>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>显示名称</template><template #default="{ record: vip, index: index }"><div class=" ">
                <span class="text-sm text-slate-700">{{ vip.displayName }}</span>
              </div></template></a-table-column>
<a-table-column key="column-3" align="center"><template #title>图标</template><template #default="{ record: vip, index: index }"><div class="  text-center">
                <div v-if="vip.iconUrl" class="inline-flex items-center justify-center">
                  <img
                    :src="vip.iconUrl"
                    alt="VIP图标"
                    class="h-8 w-8 object-contain"
                  />
                </div>
                <span v-else class="text-xs text-slate-400">-</span>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>状态</template><template #default="{ record: vip, index: index }"><div class=" ">
                <a-button @click="toggleStatus(vip)" :class="statusConfig[vip.status].class" class="inline-flex text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity" html-type="button">
                  {{ statusConfig[vip.status].text }}
                </a-button>
              </div></template></a-table-column>
<a-table-column key="column-5" ><template #title>操作</template><template #default="{ record: vip, index: index }"><div class=" ">
                <div class="flex items-center gap-2">
                  <a-button @click="openEditModal(vip)" class="text-sm text-blue-600 hover:text-blue-700 font-medium" html-type="button">
                    编辑
                  </a-button>
                  <a-button v-if="vip.level !== 0" @click="deleteVip(vip)" class="text-sm text-rose-600 hover:text-rose-700 font-medium" html-type="button">
                    删除
                  </a-button>
                </div>
              </div></template></a-table-column>
</a-table>
      </div>
    </div>

    <!-- 编辑/新增模态框 -->
    <Teleport to="body">

        <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
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
                        <a-input type="number" min="0" :disabled="isEditing" class="w-full disabled:cursor-not-allowed" :value="formData.level" @update:value="formData.level = $event === '' ? '' : Number($event)" />
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
                    <a-textarea v-model:value="formData.description" rows="5" placeholder="简要说明该等级的权益亮点、适用人群或升级提示等…" class="w-full resize-y leading-relaxed"></a-textarea>
                  </div>
                </div>
              </div></template><template #footer><template v-if="Boolean(showModal)"><div class="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <a-button html-type="button" @click="closeModal" class="text-sm font-medium text-slate-700 bg-white border-2 border-slate-300 hover:bg-slate-50 transition-colors">
                  取消
                </a-button>
                <a-button html-type="button" @click="saveVip" class="text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all">
                  {{ isEditing ? '💾 保存修改' : '✨ 创建等级' }}
                </a-button>
              </div></template></template></a-modal>

    </Teleport>
  </section>
</template>
