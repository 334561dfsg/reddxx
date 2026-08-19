<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { agentApi } from '../../mock/agent.js'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
import AgentDeliveryCard from './AgentDeliveryCard.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialUserId: { type: [String, Number], default: '' },
  returnFocus: { type: [Object, Function], default: null }
})
const emit = defineEmits(['close', 'closed', 'saved'])

const dialogRef = ref(null)
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
const {
  rendered,
  phase,
  layerStyle,
  requestDialogClose,
  onAfterEnter,
  onAfterLeave
} = useDialogLifecycle({
  open: computed(() => props.visible),
  dialogRef,
  initialFocusRef: firstFieldRef,
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => emit('close'),
  closeDisabled: submitting
})

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

const close = createDialogCloseAction(requestDialogClose)

const handleAfterLeave = async () => {
  if (!await onAfterLeave()) return
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
  <Teleport to="body">
    <Transition name="agent-upgrade-dialog" appear @after-enter="onAfterEnter" @after-leave="handleAfterLeave">
      <div
        v-if="rendered"
        v-show="phase !== 'closing'"
        class="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
        role="presentation"
        :style="layerStyle"
      >
        <section
          ref="dialogRef"
          class="agent-upgrade-dialog-panel flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-upgrade-title"
          :aria-busy="submitting"
        >
          <header class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div class="min-w-0">
              <h3 id="agent-upgrade-title" class="text-lg font-semibold text-slate-900">添加代理</h3>
              <p class="mt-1 text-sm text-slate-500">选择已有用户，并设置代理系统登录账号、初始密码和 MFA 引导信息。</p>
            </div>
            <button type="button" :disabled="submitting" class="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="关闭" @click="close">×</button>
          </header>

          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <p v-if="errorMessage" ref="errorRef" tabindex="-1" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 outline-none" role="alert">{{ errorMessage }}</p>

            <AgentDeliveryCard v-if="delivery" :delivery="delivery" />

            <template v-else>
              <section class="space-y-3">
                <h4 class="text-sm font-semibold text-slate-900">选择用户</h4>
                <div class="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref="firstFieldRef"
                    v-model="form.userKeyword"
                    type="text"
                    placeholder="输入用户 ID，例如 user_1004 或 1004"
                    class="ant-input"
                    @keyup.enter="searchCandidates"
                  />
                  <button type="button" class="ant-btn ant-btn-primary shrink-0" :disabled="searching" @click="searchCandidates">
                    {{ searching ? '搜索中…' : '搜索用户' }}
                  </button>
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
                  <span class="text-sm font-medium text-slate-700">登录账号 <span class="text-rose-500">*</span></span>
                  <input v-model="form.loginAccount" type="text" autocomplete="off" class="ant-input mt-1.5" placeholder="建议使用邮箱或唯一账号名" />
                </label>

                <div class="sm:col-span-2">
                  <span class="text-sm font-medium text-slate-700">初始登录密码 <span class="text-rose-500">*</span></span>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" class="ant-btn" :class="form.passwordMode === 'auto' ? 'ant-btn-primary' : ''" @click="setPasswordMode('auto')">自动生成</button>
                    <button type="button" class="ant-btn" :class="form.passwordMode === 'manual' ? 'ant-btn-primary' : ''" @click="setPasswordMode('manual')">手动输入</button>
                  </div>
                </div>

                <label class="block">
                  <span class="text-sm font-medium text-slate-700">密码</span>
                  <input v-model="form.password" type="password" autocomplete="new-password" class="ant-input mt-1.5" />
                </label>
                <label class="block">
                  <span class="text-sm font-medium text-slate-700">确认密码</span>
                  <input v-model="form.confirmPassword" type="password" autocomplete="new-password" class="ant-input mt-1.5" />
                </label>
                <p class="sm:col-span-2 text-xs leading-relaxed text-slate-500">
                  创建成功后会生成可复制通知和 MFA 二维码，可截图发送给代理。
                </p>
              </section>
            </template>
          </div>

          <footer class="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
            <button type="button" class="ant-btn" @click="close">{{ delivery ? '关闭' : '取消' }}</button>
            <button v-if="!delivery" type="button" class="ant-btn ant-btn-primary" :disabled="submitting" @click="submit">
              {{ submitting ? '提交中…' : '确认添加' }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-upgrade-dialog-enter-active { transition: opacity 200ms ease-out; }
.agent-upgrade-dialog-leave-active { transition: opacity 150ms ease-in; }
.agent-upgrade-dialog-enter-active .agent-upgrade-dialog-panel { transition: opacity 200ms ease-out, transform 200ms ease-out; }
.agent-upgrade-dialog-leave-active .agent-upgrade-dialog-panel { transition: opacity 150ms ease-in, transform 150ms ease-in; }
.agent-upgrade-dialog-enter-from,
.agent-upgrade-dialog-leave-to { opacity: 0; }
.agent-upgrade-dialog-enter-from .agent-upgrade-dialog-panel,
.agent-upgrade-dialog-leave-to .agent-upgrade-dialog-panel { opacity: 0; transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .agent-upgrade-dialog-enter-active,
  .agent-upgrade-dialog-leave-active,
  .agent-upgrade-dialog-enter-active .agent-upgrade-dialog-panel,
  .agent-upgrade-dialog-leave-active .agent-upgrade-dialog-panel { transition-duration: 50ms; }
  .agent-upgrade-dialog-enter-from .agent-upgrade-dialog-panel,
  .agent-upgrade-dialog-leave-to .agent-upgrade-dialog-panel { transform: none; }
}
</style>
