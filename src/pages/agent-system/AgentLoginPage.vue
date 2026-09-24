<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CrossPlatformFloatNav from '../../components/CrossPlatformFloatNav.vue'
import { mockAgentList } from '../../admin/mock/agent.js'
import { AGENT_DEFAULT_LOGIN_PASSWORD, AGENT_DEMO_LOGIN_ENABLED, useAgentAuthStore } from '../../stores/agentAuth.js'

const route = useRoute()
const router = useRouter()
const auth = useAgentAuthStore()

const loginAccount = ref(mockAgentList[0]?.loginAccount || mockAgentList[0]?.email || '')
const password = ref(AGENT_DEFAULT_LOGIN_PASSWORD)
const mfaCode = ref('')
const requiresMfa = ref(false)
const err = ref('')
const loading = ref(false)

const loginHintAccount = mockAgentList[0]?.loginAccount || mockAgentList[0]?.email || ''

async function enterDemo(role) {
  if (loading.value) return
  err.value = ''
  loading.value = true
  try {
    const result = auth.loginDemo(role)
    if (!result.ok) { err.value = result.message; return }
    requiresMfa.value = false
    mfaCode.value = ''
    await router.replace('/agent-system/dashboard')
  } catch { err.value = '演示登录失败，请重试' }
  finally { loading.value = false }
}

async function submit() {
  if (loading.value) return
  err.value = ''
  loading.value = true
  try {
    const r = await auth.login(loginAccount.value, password.value, { mfaCode: mfaCode.value })
    if (!r.ok) {
      err.value = r.message
      requiresMfa.value = r.requiresMfa === true
      return
    }
    requiresMfa.value = false
    const redir =
      typeof route.query.redirect === 'string' &&
      route.query.redirect.startsWith('/agent-system') &&
      !route.query.redirect.startsWith('/agent-system/login')
        ? route.query.redirect
        : '/agent-system/dashboard'
    router.replace(redir)
  } catch {
    err.value = '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-[#0a0f14] px-4 py-10 text-slate-100">
    <div class="mx-auto w-full max-w-md">
      <p class="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/85">
        Partner Portal
      </p>
      <h1 class="mt-2 text-center text-2xl font-semibold text-white">代理系统登录</h1>

      <section v-if="AGENT_DEMO_LOGIN_ENABLED" aria-labelledby="demo-login-title" class="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
        <h2 id="demo-login-title" class="text-sm font-semibold text-emerald-100">选择演示身份</h2>
        <p class="mt-1 text-xs leading-5 text-white/50">点击直接进入测试账号，无需填写密码和验证码。</p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button type="button" :disabled="loading" class="demo-role-button" @click="enterDemo('agent')"><span class="font-semibold">代理</span><span class="mt-1 block text-xs text-white/50">完整菜单 · 代理数据</span></button>
          <button type="button" :disabled="loading" class="demo-role-button" @click="enterDemo('salesperson')"><span class="font-semibold">业务员</span><span class="mt-1 block text-xs text-white/50">5 个菜单 · 本人数据</span></button>
        </div>
      </section>

      <form class="mt-8 space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl" @submit.prevent="submit">
        <div>
          <label class="block text-xs font-medium text-white/60">登录账号</label>
          <input
            v-model="loginAccount"
            type="text"
            autocomplete="username"
            class="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:border-emerald-500/50 focus:ring-2"
            :placeholder="loginHintAccount"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-white/60">密码</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:border-emerald-500/50 focus:ring-2"
            placeholder="至少 6 位"
          />
        </div>
        <div v-if="requiresMfa">
          <label class="block text-xs font-medium text-white/60">安全验证码</label>
          <input
            v-model="mfaCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            class="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2.5 text-sm text-white outline-none ring-emerald-500/30 focus:border-emerald-500/50 focus:ring-2"
            placeholder="请输入 6 位验证码"
          />
        </div>
        <p v-if="err" role="alert" class="text-sm text-rose-300">{{ err }}</p>
        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
    <CrossPlatformFloatNav />
  </div>
</template>

<style scoped>
.demo-role-button{border:1px solid rgb(255 255 255 / .12);border-radius:.75rem;padding:1rem;text-align:left;font-size:.875rem;background:rgb(255 255 255 / .03)}
.demo-role-button:hover{border-color:rgb(52 211 153 / .6);background:rgb(16 185 129 / .12)}
.demo-role-button:focus-visible{outline:2px solid #34d399;outline-offset:3px}
.demo-role-button:disabled{opacity:.5;cursor:wait}
</style>
