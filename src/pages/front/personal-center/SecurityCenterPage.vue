<script setup>
import { computed, ref } from 'vue'
import FrontStrokeIcon from '../../../components/front/FrontStrokeIcon.vue'
import ChangePasswordDialog from '../../../components/front/ChangePasswordDialog.vue'
import DeviceManagementDialog from '../../../components/front/DeviceManagementDialog.vue'
import MfaBindDialog from '../../../components/front/MfaBindDialog.vue'
import { useFrontAuthStore } from '../../../stores/frontAuth'
import { useFrontSecurityStore } from '../../../stores/frontSecurity'

const auth = useFrontAuthStore()
const security = useFrontSecurityStore()
security.ensureHydrated()
auth.ensureHydrated()

const mfaBound = computed({
  get: () => security.currentBindings.mfaBound,
  set: (v) => security.updateBindings({ mfaBound: v })
})
const mfaDialogOpen = ref(false)
const changePasswordOpen = ref(false)
const deviceManagementOpen = ref(false)

const items = computed(() => [
  {
    key: 'mfa',
    title: 'Google 验证器',
    desc: mfaBound.value ? '提币等操作将校验动态码' : '强烈建议开启两步验证',
    ok: mfaBound.value,
    labelOk: '已开启',
    labelBad: '未开启',
    actionLabel: mfaBound.value ? '管理' : '去绑定'
  }
])

function openDedicatedDialog(key) {
  if (key === 'mfa') {
    mfaDialogOpen.value = true
  }
}

function onMfaCompleted() {
  security.updateBindings({ mfaBound: true })
}
</script>

<template>
  <div>
    <header class="mb-5 hidden md:mb-6 md:block">
      <h1 class="text-2xl font-bold tracking-tight text-white md:text-3xl">安全中心</h1>
      <p class="mt-1 text-sm text-white/55">
        管理登录方式与二次验证，保护账户与资金安全。
      </p>
    </header>

    <div class="flex flex-col gap-5 md:gap-6">
    <section class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-lime-300/90"
            aria-hidden="true"
          >
            <FrontStrokeIcon name="key" size-class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-white/95">登录密码</h2>
            <p class="mt-1 text-xs text-white/50">建议定期更换，勿与其他网站共用密码。</p>
          </div>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2.5 border-t border-white/10 pt-4">
        <button
          type="button"
          class="inline-flex min-h-9 items-center justify-center rounded-lg bg-lime-400 px-4 py-2 text-xs font-semibold text-black shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] transition [-webkit-tap-highlight-color:transparent] hover:bg-lime-300 active:bg-lime-500/90"
          @click="changePasswordOpen = true"
        >
          修改密码
        </button>
        <button
          type="button"
          class="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#eaecef] transition [-webkit-tap-highlight-color:transparent] hover:border-lime-400/35 hover:bg-lime-400/[0.06] hover:text-white"
          @click="deviceManagementOpen = true"
        >
          设备管理
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-5 md:gap-6">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-white/45">验证方式</h2>
      <div
        v-for="row in items"
        :key="row.key"
        class="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-lime-300/90"
            aria-hidden="true"
          >
            <FrontStrokeIcon name="lock" size-class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-white/92">{{ row.title }}</h3>
            <p class="mt-1 text-xs leading-relaxed text-white/50">{{ row.desc }}</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end md:flex-row md:items-center">
          <span
            class="rounded-full border px-2.5 py-1 text-xs font-medium"
            :class="
              row.ok
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                : 'border-amber-400/35 bg-amber-400/10 text-amber-100'
            "
          >
            {{ row.ok ? row.labelOk : row.labelBad }}
          </span>
          <button
            type="button"
            class="rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-medium text-white/88 transition hover:bg-white/[0.12]"
            @click="openDedicatedDialog(row.key)"
          >
            {{ row.actionLabel }}
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-white/[0.08] bg-black/30 px-3 py-3 text-xs leading-relaxed text-white/50 md:px-5 md:py-4">
      <p class="font-medium text-white/65">提示</p>
      <p class="mt-2">
        开启 Google 验证器后，可用于提币等敏感操作的动态码校验。
      </p>
    </section>
    </div>

    <MfaBindDialog v-model="mfaDialogOpen" @completed="onMfaCompleted" />

    <ChangePasswordDialog v-model="changePasswordOpen" />

    <DeviceManagementDialog v-model="deviceManagementOpen" />
  </div>
</template>
