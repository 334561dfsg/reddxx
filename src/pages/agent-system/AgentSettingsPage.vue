<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AGENT_DEFAULT_LOGIN_PASSWORD, useAgentAuthStore } from '../../stores/agentAuth'

const auth = useAgentAuthStore()
const router = useRouter()

const pwdOld = ref('')
const pwdNew = ref('')
const pwdConfirm = ref('')
const pwdMsg = ref('')
const pwdErr = ref('')
const pwdSubmitting = ref(false)

const TABS = [
  { id: 'profile', label: '基本资料' },
  { id: 'password', label: '登录密码' }
]
const activeTab = ref('profile')

onMounted(() => {
  auth.ensureHydrated()
})

function logout() {
  auth.logout()
  router.push('/agent-system/login')
}

async function submitPassword() {
  pwdErr.value = ''
  pwdMsg.value = ''
  pwdSubmitting.value = true
  try {
    const r = auth.changePassword({
      oldPassword: pwdOld.value,
      newPassword: pwdNew.value,
      confirmPassword: pwdConfirm.value
    })
    if (!r.ok) {
      pwdErr.value = r.message || '修改失败'
      return
    }
    pwdMsg.value = r.message || '已更新'
    pwdOld.value = ''
    pwdNew.value = ''
    pwdConfirm.value = ''
  } finally {
    pwdSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-xl space-y-4">
    <div
      class="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="安全设置分区"
    >
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === t.id"
        class="shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm"
        :class="
          activeTab === t.id
            ? 'bg-emerald-600/35 text-white shadow-sm ring-1 ring-emerald-500/35'
            : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
        "
        @click="activeTab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- 基本资料 -->
    <div v-show="activeTab === 'profile'" class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h2 class="text-sm font-semibold text-white">基本资料</h2>
      <dl class="mt-4 space-y-3 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">用户 UID</dt>
          <dd class="font-mono text-emerald-200/95">{{ auth.uid ?? '—' }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">登录邮箱</dt>
          <dd class="font-mono text-emerald-200/95">{{ auth.email }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-white/45">显示名</dt>
          <dd>{{ auth.nickname }}</dd>
        </div>
      </dl>
      <div class="mt-6 border-t border-white/[0.08] pt-5">
        <button
          type="button"
          class="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/85 hover:bg-white/[0.06]"
          @click="logout"
        >
          退出登录
        </button>
      </div>
    </div>

    <!-- 修改登录密码 -->
    <div v-show="activeTab === 'password'" class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h2 class="text-sm font-semibold text-white">修改登录密码</h2>
      <p class="mt-1 text-xs text-white/40">
        修改后将用于代理系统登录；初始默认密码为 <span class="font-mono text-white/55">{{ AGENT_DEFAULT_LOGIN_PASSWORD }}</span>（未改过前）。
      </p>
      <form class="mt-4 space-y-3" @submit.prevent="submitPassword">
        <div>
          <label class="block text-xs text-white/45">当前密码</label>
          <input
            v-model="pwdOld"
            type="password"
            autocomplete="current-password"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label class="block text-xs text-white/45">新密码</label>
          <input
            v-model="pwdNew"
            type="password"
            autocomplete="new-password"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label class="block text-xs text-white/45">确认新密码</label>
          <input
            v-model="pwdConfirm"
            type="password"
            autocomplete="new-password"
            class="mt-1 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white"
          />
        </div>
        <p v-if="pwdErr" class="text-sm text-rose-300">{{ pwdErr }}</p>
        <p v-if="pwdMsg" class="text-sm text-emerald-300/95">{{ pwdMsg }}</p>
        <button
          type="submit"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="pwdSubmitting"
        >
          {{ pwdSubmitting ? '保存中…' : '保存新密码' }}
        </button>
      </form>
    </div>

  </div>
</template>
