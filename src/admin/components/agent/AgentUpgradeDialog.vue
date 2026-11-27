<script setup>
import AdminDialog from '../antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { AdminButton, AdminInput, nativeControl } from '../antd/controls.js'

import { computed, nextTick, ref, watch } from 'vue'
import { agentApi } from '../../mock/agent.js'
import AgentDeliveryCard from './AgentDeliveryCard.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialUserId: { type: [String, Number], default: '' },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])

const firstFieldRef = ref(null)
const errorRef = ref(null)
const form = ref({
  userKeyword: '',
  selectedUser: null,
  loginAccount: '',
  password: '',
  confirmPassword: '',
  passwordMode: 'auto'
})
const candidates = ref([])
const searching = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const delivery = ref(null)
let searchRun = 0
// Frame: AdminDialog (Ant Modal + useDialogLifecycle), dialog migration 2026-11-27.
const dialogFrame = ref(null)
const phase = computed(() => dialogFrame.value?.phase ?? 'closed')
const initialFocus = computed(() => firstFieldRef.value)

const resetForm = () => {
  form.value = {
    userKeyword: props.initialUserId ? String(props.initialUserId) : '',
    selectedUser: null,
    loginAccount: '',
    password: '',
    confirmPassword: '',
    passwordMode: 'auto'
  }
  candidates.value = []
  errorMessage.value = ''
  delivery.value = null
  searching.value = false
  submitting.value = false
}

const close = () => dialogFrame.value?.close()

const handleClosed = () => {
  resetForm()
  emit('closed')
}

const focusError = async () => {
  await nextTick()
  errorRef.value?.focus?.()
}

const selectCandidate = (candidate) => {
  if (candidate.disabled) return
  form.value.selectedUser = candidate
  form.value.loginAccount = candidate.email || candidate.username || ''
  if (form.value.passwordMode === 'auto') {
    const password = agentApi.generateAgentPassword()
    form.value.password = password
    form.value.confirmPassword = password
  }
  errorMessage.value = ''
}

const searchCandidates = async () => {
  const keyword = form.value.userKeyword.trim()
  const runId = ++searchRun
  errorMessage.value = ''
  form.value.selectedUser = null
  if (!keyword) {
    candidates.value = []
    errorMessage.value = '请输入用户 ID 后搜索'
    return
  }
  searching.value = true
  try {
    const res = await agentApi.searchAgentUserCandidates(keyword)
    if (runId !== searchRun || !props.visible) return
    candidates.value = res.data || []
    const candidate = candidates.value[0]
    if (!candidate) {
      errorMessage.value = '未找到该用户'
      return
    }
    if (candidate.disabled) {
      errorMessage.value = candidate.disabledReason || '该用户不可开通代理'
      return
    }
    selectCandidate(candidate)
  } catch (error) {
    if (runId === searchRun) errorMessage.value = error.message || '搜索失败'
  } finally {
    if (runId === searchRun) searching.value = false
  }
}

const setPasswordMode = (mode) => {
  form.value.passwordMode = mode
  if (mode === 'auto') {
    const password = agentApi.generateAgentPassword()
    form.value.password = password
    form.value.confirmPassword = password
  } else {
    form.value.password = ''
    form.value.confirmPassword = ''
  }
}

const validateFields = () => {
  if (form.value.selectedUser === null) return '请选择要开通的用户'
  if (!String(form.value.loginAccount || '').trim()) return '登录账号必填'
  if (!String(form.value.password || '').trim()) return '登录密码必填'
  if (String(form.value.password).length < 6) return '登录密码至少 6 位'
  if (form.value.password !== form.value.confirmPassword) return '两次输入的密码不一致'
  return ''
}

const submit = async () => {
  if (phase.value !== 'open' || submitting.value) return
  const error = validateFields()
  if (error) {
    errorMessage.value = error
    await focusError()
    return
  }
  submitting.value = true
  try {
    const result = await agentApi.upgradeToAgent({
      userId: form.value.selectedUser.id,
      loginAccount: form.value.loginAccount,
      password: form.value.password,
      passwordMode: form.value.passwordMode
    })
    if (result.success) {
      delivery.value = result.data.delivery
      emit('saved', result.data)
    }
  } catch (error) {
    errorMessage.value = '添加失败：' + error.message
    await focusError()
  } finally {
    submitting.value = false
  }
}

watch(() => props.visible, async (visible) => {
  if (!visible) return
  resetForm()
  if (props.initialUserId) {
    await nextTick()
    searchCandidates()
  }
}, { immediate: true })
</script>

<template>
  <AdminDialog :open="visible" title="添加代理" title-id="agent-upgrade-title" :busy="submitting" :return-focus="returnFocus" :width="672" plain ref="dialogFrame" :initial-focus="initialFocus" @close="emit('close')" @closed="handleClosed">
      <template #subtitle>选择已有用户，并设置代理系统登录账号、初始密码。</template>
      <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <FeedbackToast v-if="errorMessage" ref="errorRef" type="error" :source="() => (errorMessage) ? (errorMessage) : ''"></FeedbackToast>

            <AgentDeliveryCard v-if="delivery" :delivery="delivery" />

            <template v-else>
              <section class="space-y-3">
                <h4 class="text-sm font-semibold text-slate-900">选择用户</h4>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <AdminInput
                    :ref="element => { firstFieldRef = nativeControl(element) }"
                    v-model="form.userKeyword"
                    type="text"
                    placeholder="输入用户 ID，例如 user_1004 或 1004"
                    class="ant-input"
                    @keyup.enter="searchCandidates"
                  />
                  <AdminButton type="button" class="shrink-0" variant="primary" :disabled="searching" @click="searchCandidates">
                    {{ searching ? '搜索中…' : '搜索用户' }}
                  </AdminButton>
                </div>
                <div v-if="form.selectedUser" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
                  <div class="text-sm font-medium text-slate-900">
                    已选中：{{ form.selectedUser.username }} · UID {{ form.selectedUser.uid }}
                  </div>
                  <div class="mt-1 break-words text-xs text-slate-500">
                    {{ form.selectedUser.email }} · {{ form.selectedUser.phone }}
                  </div>
                </div>
              </section>

              <section class="grid gap-4 sm:grid-cols-2">
                <label class="block sm:col-span-2">
                  <span class="text-sm font-medium text-slate-700"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>登录账号</span>
                  <AdminInput v-model="form.loginAccount" type="text" autocomplete="off" class="mt-1.5" placeholder="建议使用邮箱或唯一账号名" />
                </label>

                <div class="sm:col-span-2">
                  <span class="text-sm font-medium text-slate-700"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>初始登录密码</span>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <AdminButton type="button" :class="form.passwordMode === 'auto' ? 'ant-btn-primary' : ''" @click="setPasswordMode('auto')">自动生成</AdminButton>
                    <AdminButton type="button" :class="form.passwordMode === 'manual' ? 'ant-btn-primary' : ''" @click="setPasswordMode('manual')">手动输入</AdminButton>
                  </div>
                </div>

                <label class="block">
                  <span class="text-sm font-medium text-slate-700">密码</span>
                  <AdminInput v-model="form.password" type="password" autocomplete="new-password" class="mt-1.5" />
                </label>
                <label class="block">
                  <span class="text-sm font-medium text-slate-700">确认密码</span>
                  <AdminInput v-model="form.confirmPassword" type="password" autocomplete="new-password" class="mt-1.5" />
                </label>
                <p class="sm:col-span-2 text-xs leading-relaxed text-slate-500">
                  创建成功后可复制账号和初始密码，发送给代理。
                </p>
              </section>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <AdminButton type="button" @click="close">{{ delivery ? '关闭' : '取消' }}</AdminButton>
            <AdminButton v-if="!delivery" type="button" variant="primary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中…' : '确认添加' }}
            </AdminButton>
          </footer>
    </AdminDialog>
</template>

