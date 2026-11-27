<script setup>
import { ref } from 'vue'
import { verificationConfig } from '../../../admin/mock/verification'
import { VERIFICATION_LEVEL, VERIFICATION_DOC_TYPE_OPTIONS } from '../../../constants/verification'

/** 认证等级上的资金与交易品种权限（出金限额在「出金策略」配置） */
const PERMISSION_FIELDS = [
  { key: 'canDeposit', label: '允许入金' },
  { key: 'canWithdraw', label: '允许出金' },
  { key: 'canSpotTrade', label: '允许现货交易' },
  { key: 'canDeliveryContract', label: '允许交割合约' },
  { key: 'canPerpetualContract', label: '允许永续合约' }
]

// 配置数据
const configs = ref({
  [VERIFICATION_LEVEL.NONE]: { ...verificationConfig[VERIFICATION_LEVEL.NONE] },
  [VERIFICATION_LEVEL.BASIC]: { ...verificationConfig[VERIFICATION_LEVEL.BASIC] },
  [VERIFICATION_LEVEL.ADVANCED]: { ...verificationConfig[VERIFICATION_LEVEL.ADVANCED] }
})

// 编辑状态
const editingLevel = ref(null)
const tempConfig = ref(null)

// Toast提示
const toast = ref({
  visible: false,
  message: ''
})

// 开始编辑
const startEdit = (level) => {
  editingLevel.value = level
  const raw = JSON.parse(JSON.stringify(configs.value[level]))
  const base = verificationConfig[level]
  for (const { key } of PERMISSION_FIELDS) {
    if (typeof raw[key] !== 'boolean') {
      raw[key] = typeof base[key] === 'boolean' ? base[key] : false
    }
  }
  if ('canTrade' in raw) delete raw.canTrade
  tempConfig.value = raw
}

// 取消编辑
const cancelEdit = () => {
  editingLevel.value = null
  tempConfig.value = null
}

// 保存配置
const saveConfig = () => {
  if (editingLevel.value && tempConfig.value) {
    const next = { ...tempConfig.value }
    if ('canTrade' in next) delete next.canTrade
    configs.value[editingLevel.value] = next
    editingLevel.value = null
    tempConfig.value = null
    // 这里可以添加API调用保存到后端
    showToast('配置保存成功！')
  }
}

// 获取证件类型标签
const getDocTypeLabel = (docType) => {
  const option = VERIFICATION_DOC_TYPE_OPTIONS.find(opt => opt.value === docType)
  return option ? option.label : docType
}

// 切换证件要求
const toggleDocument = (docType) => {
  if (!tempConfig.value) return
  const index = tempConfig.value.requireDocuments.indexOf(docType)
  if (index > -1) {
    tempConfig.value.requireDocuments.splice(index, 1)
  } else {
    tempConfig.value.requireDocuments.push(docType)
  }
}

// 检查是否需要某个证件
const requiresDocument = (level, docType) => {
  const config = editingLevel.value === level ? tempConfig.value : configs.value[level]
  return config.requireDocuments.includes(docType)
}

// 显示Toast提示
const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">认证权限配置</h1>
      <p class="mt-1 text-sm text-gray-600">管理不同认证等级的权限和要求</p>
    </div>

    <!-- 配置卡片列表 -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- 未认证配置 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-4">
          <h3 class="text-lg font-semibold text-white">未认证用户</h3>
          <p class="text-sm text-gray-100 mt-1">{{ configs[VERIFICATION_LEVEL.NONE].description }}</p>
        </div>
        
        <div class="p-6 space-y-4">
          <template v-if="editingLevel === VERIFICATION_LEVEL.NONE">
            <!-- 编辑模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <label
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center space-x-2"
              >
                <a-checkbox v-model:checked="tempConfig[row.key]" class="text-blue-600" />
                <span class="text-sm text-gray-700">{{ row.label }}</span>
              </label>
            </div>

            <div class="flex space-x-2 pt-4 border-t">
              <a-button @click="saveConfig" class="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors" html-type="button" type="primary">
                保存
              </a-button>
              <a-button @click="cancelEdit" class="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" html-type="button">
                取消
              </a-button>
            </div>
          </template>

          <template v-else>
            <!-- 展示模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <div
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-600">{{ row.label }}</span>
                <span
                  :class="configs[VERIFICATION_LEVEL.NONE][row.key] ? 'text-emerald-600' : 'text-rose-600'"
                  class="text-sm font-medium"
                >
                  {{ configs[VERIFICATION_LEVEL.NONE][row.key] ? '✓ 允许' : '✗ 禁止' }}
                </span>
              </div>

              <div class="pt-3 border-t">
                <span class="text-sm text-gray-600">需要证件</span>
                <div class="mt-2 text-sm text-gray-500">
                  {{ configs[VERIFICATION_LEVEL.NONE].requireDocuments.length === 0 ? '无需上传证件' : configs[VERIFICATION_LEVEL.NONE].requireDocuments.map(getDocTypeLabel).join('、') }}
                </div>
              </div>
            </div>

            <a-button @click="startEdit(VERIFICATION_LEVEL.NONE)" class="w-full mt-4 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" html-type="button">
              编辑配置
            </a-button>
          </template>
        </div>
      </div>

      <!-- 初级认证配置 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h3 class="text-lg font-semibold text-white">初级认证用户</h3>
          <p class="text-sm text-blue-100 mt-1">{{ configs[VERIFICATION_LEVEL.BASIC].description }}</p>
        </div>
        
        <div class="p-6 space-y-4">
          <template v-if="editingLevel === VERIFICATION_LEVEL.BASIC">
            <!-- 编辑模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <label
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center space-x-2"
              >
                <a-checkbox v-model:checked="tempConfig[row.key]" class="text-blue-600" />
                <span class="text-sm text-gray-700">{{ row.label }}</span>
              </label>
            </div>

            <div class="flex space-x-2 pt-4 border-t">
              <a-button @click="saveConfig" class="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors" html-type="button" type="primary">
                保存
              </a-button>
              <a-button @click="cancelEdit" class="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" html-type="button">
                取消
              </a-button>
            </div>
          </template>

          <template v-else>
            <!-- 展示模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <div
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-600">{{ row.label }}</span>
                <span
                  :class="configs[VERIFICATION_LEVEL.BASIC][row.key] ? 'text-emerald-600' : 'text-rose-600'"
                  class="text-sm font-medium"
                >
                  {{ configs[VERIFICATION_LEVEL.BASIC][row.key] ? '✓ 允许' : '✗ 禁止' }}
                </span>
              </div>

              <div class="pt-3 border-t">
                <span class="text-sm text-gray-600">需要证件</span>
                <div class="mt-2 text-sm text-gray-500">
                  {{ configs[VERIFICATION_LEVEL.BASIC].requireDocuments.length === 0 ? '无需上传证件' : configs[VERIFICATION_LEVEL.BASIC].requireDocuments.map(getDocTypeLabel).join('、') }}
                </div>
              </div>
            </div>

            <a-button @click="startEdit(VERIFICATION_LEVEL.BASIC)" class="w-full mt-4 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" html-type="button">
              编辑配置
            </a-button>
          </template>
        </div>
      </div>

      <!-- 高级认证配置 -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
          <h3 class="text-lg font-semibold text-white">高级认证用户</h3>
          <p class="text-sm text-purple-100 mt-1">{{ configs[VERIFICATION_LEVEL.ADVANCED].description }}</p>
        </div>
        
        <div class="p-6 space-y-4">
          <template v-if="editingLevel === VERIFICATION_LEVEL.ADVANCED">
            <!-- 编辑模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <label
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center space-x-2"
              >
                <a-checkbox v-model:checked="tempConfig[row.key]" class="text-blue-600" />
                <span class="text-sm text-gray-700">{{ row.label }}</span>
              </label>

              <div class="pt-3 border-t">
                <label class="block text-sm text-gray-700 mb-2">需要上传的证件</label>
                <div class="space-y-2">
                  <label 
                    v-for="docType in VERIFICATION_DOC_TYPE_OPTIONS" 
                    :key="docType.value"
                    class="flex items-center space-x-2"
                  >
                    <a-checkbox :checked="requiresDocument(VERIFICATION_LEVEL.ADVANCED, docType.value)" @change="toggleDocument(docType.value)" class="text-blue-600" />
                    <span class="text-sm text-gray-700">{{ docType.label }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex space-x-2 pt-4 border-t">
              <a-button @click="saveConfig" class="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors" html-type="button" type="primary">
                保存
              </a-button>
              <a-button @click="cancelEdit" class="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" html-type="button">
                取消
              </a-button>
            </div>
          </template>

          <template v-else>
            <!-- 展示模式 -->
            <div class="space-y-3">
              <p class="text-xs font-medium text-gray-500">资金与交易权限</p>
              <div
                v-for="row in PERMISSION_FIELDS"
                :key="row.key"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-600">{{ row.label }}</span>
                <span
                  :class="configs[VERIFICATION_LEVEL.ADVANCED][row.key] ? 'text-emerald-600' : 'text-rose-600'"
                  class="text-sm font-medium"
                >
                  {{ configs[VERIFICATION_LEVEL.ADVANCED][row.key] ? '✓ 允许' : '✗ 禁止' }}
                </span>
              </div>

              <div class="pt-3 border-t">
                <span class="text-sm text-gray-600">需要证件</span>
                <div class="mt-2 text-sm text-gray-500">
                  {{ configs[VERIFICATION_LEVEL.ADVANCED].requireDocuments.length === 0 ? '无需上传证件' : configs[VERIFICATION_LEVEL.ADVANCED].requireDocuments.map(getDocTypeLabel).join('、') }}
                </div>
              </div>
            </div>

            <a-button @click="startEdit(VERIFICATION_LEVEL.ADVANCED)" class="w-full mt-4 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" html-type="button">
              编辑配置
            </a-button>
          </template>
        </div>
      </div>
    </div>

    <!-- 配置说明 -->
    <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <h3 class="text-sm font-semibold text-blue-900 mb-3">配置说明</h3>
      <ul class="space-y-2 text-sm text-blue-800">
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span><strong>资金与交易权限：</strong>可分别配置入金、出金，以及现货、交割合约、永续合约；单笔/每日出金限额在「出金策略」中维护</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span><strong>初级认证：</strong>完成基础身份信息认证的用户，可配置所需证件类型</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span><strong>高级认证：</strong>完成完整身份认证的用户，可勾选需要上传的证件清单</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span><strong>未认证用户：</strong>未完成任何身份认证的用户，可按业务需要收紧入金、出金与各交易品种</span>
        </li>
        <li class="flex items-start">
          <span class="mr-2">•</span>
          <span>修改配置后将立即对所有该等级用户生效，请谨慎操作</span>
        </li>
      </ul>
    </div>

    <!-- 成功提示 Toast -->
    <div 
      v-if="toast.visible"
      class="fixed top-4 right-4 z-50 bg-white border border-emerald-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-slide-in"
    >
      <div class="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式 */
</style>
