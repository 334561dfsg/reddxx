<script setup>
import { ref, computed, onMounted } from 'vue'
import { vipLevels } from '../../../admin/mock/vip'
import { verificationConfig } from '../../../admin/mock/verification'
import {
  WITHDRAW_POLICY_DIMENSION_LABEL
} from '../../../admin/constants/withdrawPolicy'
import {
  getWithdrawPolicy,
  saveWithdrawPolicy,
  createEmptyCreditScoreRule,
  computeEffectiveWithdrawPolicy
} from '../../../admin/mock/withdrawPolicy'
import { VERIFICATION_LEVEL } from '../../../constants/verification'

const policy = ref(null)
const saving = ref(false)
const toast = ref({ show: false, text: '' })

const vipLevelOptions = computed(() =>
  [...vipLevels].sort((a, b) => a.level - b.level).map((v) => ({
    value: v.level,
    label: `${v.level} · ${v.displayName}`
  }))
)

function vipRowLabel(level) {
  const v = vipLevels.find((x) => x.level === level)
  return v ? `${v.level} · ${v.displayName}` : `等级 ${level}`
}

function verificationRowLabel(level) {
  return verificationConfig[level]?.levelName ?? level
}

function formatDailyCap(v) {
  if (v === null || v === undefined) return '无限制'
  return `${v} USDT`
}

function setVerificationDailyUnlimited(row, ev) {
  if (ev.target.checked) {
    row.dailyCapUsdt = null
  } else if (row.dailyCapUsdt === null) {
    const fallback = policy.value?.defaultPolicy?.dailyCapUsdt
    row.dailyCapUsdt = Number.isFinite(Number(fallback)) ? Number(fallback) : 10000
  }
}

const sim = ref({
  vipLevel: 2,
  isAgent: true,
  verificationLevel: VERIFICATION_LEVEL.BASIC,
  creditScore: 65
})

/** 序列化当前表单配置，确保任意表格/开关修改都会触发试算重算（避免 computed 对外部函数内深层依赖收集不完整） */
const policyFormSignature = computed(() => {
  const p = policy.value
  if (!p) return ''
  return JSON.stringify({
    noRestrictionEnabled: p.noRestrictionEnabled,
    defaultPolicy: p.defaultPolicy,
    dimensionPriority: p.dimensionPriority,
    dimensionEnabled: p.dimensionEnabled,
    vipRules: p.vipRules,
    agentRule: p.agentRule,
    verificationRules: p.verificationRules,
    creditScoreRules: p.creditScoreRules
  })
})

const simSignature = computed(() => JSON.stringify(sim.value))

const preview = computed(() => {
  void policyFormSignature.value
  void simSignature.value
  const p = policy.value
  if (!p) return null
  return computeEffectiveWithdrawPolicy(
    {
      vipLevel: sim.value.vipLevel,
      isAgent: sim.value.isAgent,
      verificationLevel: sim.value.verificationLevel,
      creditScore: sim.value.creditScore
    },
    p
  )
})

function showToast(text) {
  toast.value = { show: true, text }
  setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

function load() {
  policy.value = getWithdrawPolicy()
}

onMounted(load)

function persist() {
  saving.value = true
  try {
    policy.value = saveWithdrawPolicy(policy.value)
    showToast('已保存出金策略配置')
  } finally {
    saving.value = false
  }
}

function resetToSample() {
  load()
  showToast('已重新加载当前配置')
}

function moveDimension(index, delta) {
  const arr = [...policy.value.dimensionPriority]
  const j = index + delta
  if (j < 0 || j >= arr.length) return
  ;[arr[index], arr[j]] = [arr[j], arr[index]]
  policy.value.dimensionPriority = arr
}

function removeCreditRule(id) {
  policy.value.creditScoreRules = policy.value.creditScoreRules.filter((r) => r.id !== id)
}

function addCreditRule() {
  policy.value.creditScoreRules.push(createEmptyCreditScoreRule())
}

function isDimensionOn(dim) {
  return policy.value?.dimensionEnabled?.[dim] !== false
}

function toggleDimensionEnabled(dim) {
  if (!policy.value?.dimensionEnabled) return
  policy.value.dimensionEnabled[dim] = !isDimensionOn(dim)
}
</script>

<template>
  <section v-if="policy" class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">出金策略</h1>
        <p class="mt-1 text-sm text-slate-500">
          配置 U 本位单笔最低出金与每日出金上限。开启「不做任何限制」时，所有细分规则仅保留配置，不参与实际限制。VIP 等级与
          <span class="text-slate-700">VIP 等级配置</span>
          mock 同步；按认证等级的出金规则与
          <span class="text-slate-700">认证等级配置</span>
          中的等级名称一致（未认证 / 初级 / 高级），具体限额仅在此页维护。多维度同时启用且均命中规则时，按<strong class="font-semibold text-slate-700">最严格模式</strong>合并：单笔最低取各维度要求中的<strong class="font-semibold text-slate-700">最大值</strong>，每日上限取各维度中的<strong class="font-semibold text-slate-700">最小值</strong>（无限制视为较宽松，不参与与数值比较时的收紧）。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="ant-btn" :disabled="saving" @click="resetToSample">重新加载</button>
        <button type="button" class="ant-btn ant-btn-primary" :disabled="saving" @click="persist">
          保存配置
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <!-- 左侧：配置 -->
      <div class="min-w-0 flex-1 space-y-6">
    <!-- 全局总开关 -->
    <div class="rounded-xl border border-blue-200 bg-blue-50/70 shadow-sm overflow-hidden">
      <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-900">全局总开关</h2>
          <p class="mt-0.5 text-xs leading-relaxed text-slate-600">
            默认开启「不做任何限制」。开启后不校验单笔最低出金与每日出金上限；关闭后按下方全局默认和各维度规则试算、保存。
          </p>
        </div>
        <div class="flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-slate-800 sm:min-w-[12rem]">
          <span>不做任何限制</span>
          <button
            type="button"
            role="switch"
            :aria-checked="policy.noRestrictionEnabled !== false"
            :aria-label="`不做任何限制：${policy.noRestrictionEnabled !== false ? '已开启' : '已关闭'}`"
            class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            :class="policy.noRestrictionEnabled !== false ? 'border-blue-600 bg-blue-600' : 'border-slate-300/90 bg-slate-200'"
            @click="policy.noRestrictionEnabled = policy.noRestrictionEnabled === false"
          >
            <span
              class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-slate-900/10 transition-transform duration-200 ease-out"
              :class="policy.noRestrictionEnabled !== false ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- 全局默认 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">全局默认（兜底）</h2>
        <p class="text-xs text-slate-500 mt-0.5">当各细分规则均未命中时使用。</p>
      </div>
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">单笔最低出金（USDT）</label>
          <input
            v-model.number="policy.defaultPolicy.minWithdrawUsdt"
            type="number"
            min="0"
            step="0.01"
            class="ant-input w-full !py-2"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">每日出金上限（USDT）</label>
          <input
            v-model.number="policy.defaultPolicy.dailyCapUsdt"
            type="number"
            min="0"
            step="1"
            class="ant-input w-full !py-2"
          />
        </div>
      </div>
    </div>

    <!-- 维度优先级 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">参与维度</h2>
        <p class="text-xs text-slate-500 mt-0.5">
          仅「启用」的维度参与试算。多维度命中时合并为最严格结果（单笔最低取 max、每日上限取 min）；下列顺序仅影响展示，不影响合并计算。
        </p>
      </div>
      <div class="p-4">
        <ul class="rounded-lg border border-slate-200 divide-y divide-slate-100">
          <li
            v-for="(dim, idx) in policy.dimensionPriority"
            :key="dim"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 sm:gap-x-3 px-3 py-2 min-h-[2.25rem] bg-white"
            :class="policy.dimensionEnabled[dim] === false ? 'opacity-50' : ''"
          >
            <span class="text-xs font-mono tabular-nums text-slate-400 w-4 shrink-0 text-center">{{ idx + 1 }}</span>
            <span class="text-sm font-medium text-slate-900 truncate min-w-0">{{ WITHDRAW_POLICY_DIMENSION_LABEL[dim] }}</span>
            <button
              type="button"
              role="switch"
              :aria-checked="isDimensionOn(dim)"
              :aria-label="`${WITHDRAW_POLICY_DIMENSION_LABEL[dim]}：${isDimensionOn(dim) ? '已启用' : '已关闭'}`"
              class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              :class="isDimensionOn(dim) ? 'border-blue-600 bg-blue-600' : 'border-slate-300/90 bg-slate-200'"
              @click="toggleDimensionEnabled(dim)"
            >
              <span
                class="pointer-events-none absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-slate-900/10 transition-transform duration-200 ease-out"
                :class="isDimensionOn(dim) ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
            <div class="flex items-center justify-end gap-0.5 shrink-0">
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                :disabled="idx === 0"
                @click="moveDimension(idx, -1)"
              >
                上移
              </button>
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                :disabled="idx === policy.dimensionPriority.length - 1"
                @click="moveDimension(idx, 1)"
              >
                下移
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- VIP：与 VIP mock 一一对应 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">按 VIP 等级</h2>
        <p class="text-xs text-slate-500 mt-0.5">等级列表与「VIP 等级配置」页面使用的 mock（vipLevels）一致，每等级一行，不可增删等级行。</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th class="px-4 py-2">VIP（mock）</th>
              <th class="px-4 py-2">单笔最低 (U)</th>
              <th class="px-4 py-2">每日上限 (U)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in policy.vipRules" :key="row.id" class="hover:bg-slate-50/50">
              <td class="px-4 py-2 text-slate-900 font-medium">{{ vipRowLabel(row.vipLevel) }}</td>
              <td class="px-4 py-2">
                <input v-model.number="row.minWithdrawUsdt" type="number" min="0" step="0.01" class="ant-input !py-1.5 w-32" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="row.dailyCapUsdt" type="number" min="0" step="1" class="ant-input !py-1.5 w-36" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 代理：后台当前仅一种代理身份 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">按代理身份</h2>
        <p class="text-xs text-slate-500 mt-0.5">当前代理体系仅区分是否代理；开启「代理身份」维度后，代理用户会命中本规则。</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th class="px-4 py-2">用户身份</th>
              <th class="px-4 py-2">单笔最低 (U)</th>
              <th class="px-4 py-2">每日上限 (U)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr class="hover:bg-slate-50/50">
              <td class="px-4 py-2 text-slate-900 font-medium">代理</td>
              <td class="px-4 py-2">
                <input v-model.number="policy.agentRule.minWithdrawUsdt" type="number" min="0" step="0.01" class="ant-input !py-1.5 w-32" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="policy.agentRule.dailyCapUsdt" type="number" min="0" step="1" class="ant-input !py-1.5 w-36" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 认证：与 verificationConfig 等级一致 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">按账户认证等级</h2>
        <p class="text-xs text-slate-500 mt-0.5">等级与「认证等级配置」中的三档一致；单笔与每日上限仅在此配置，不在认证页维护。</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th class="px-4 py-2">认证等级</th>
              <th class="px-4 py-2">单笔最低 (U)</th>
              <th class="px-4 py-2">每日上限</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in policy.verificationRules" :key="row.id" class="hover:bg-slate-50/50">
              <td class="px-4 py-2 text-slate-900 font-medium">{{ verificationRowLabel(row.verificationLevel) }}</td>
              <td class="px-4 py-2">
                <input v-model.number="row.minWithdrawUsdt" type="number" min="0" step="0.01" class="ant-input !py-1.5 w-32" />
              </td>
              <td class="px-4 py-2">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label class="inline-flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      :checked="row.dailyCapUsdt === null"
                      @change="setVerificationDailyUnlimited(row, $event)"
                    />
                    无限制
                  </label>
                  <input
                    v-if="row.dailyCapUsdt !== null"
                    v-model.number="row.dailyCapUsdt"
                    type="number"
                    min="0"
                    step="1"
                    class="ant-input !py-1.5 w-36"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 信用分 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">按信用分区间</h2>
          <p class="text-xs text-slate-500">按信用分落入的区间匹配规则；区间请勿互相重叠。</p>
        </div>
        <button type="button" class="ant-btn ant-btn-primary !py-1.5 text-sm" @click="addCreditRule">+ 添加区间</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th class="px-4 py-2">分数下限</th>
              <th class="px-4 py-2">分数上限</th>
              <th class="px-4 py-2">单笔最低 (U)</th>
              <th class="px-4 py-2">每日上限 (U)</th>
              <th class="px-4 py-2 w-24">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in policy.creditScoreRules" :key="row.id" class="hover:bg-slate-50/50">
              <td class="px-4 py-2">
                <input v-model.number="row.minScore" type="number" min="0" max="100" class="ant-input !py-1.5 w-24" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="row.maxScore" type="number" min="0" max="100" class="ant-input !py-1.5 w-24" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="row.minWithdrawUsdt" type="number" min="0" step="0.01" class="ant-input !py-1.5 w-32" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="row.dailyCapUsdt" type="number" min="0" step="1" class="ant-input !py-1.5 w-36" />
              </td>
              <td class="px-4 py-2">
                <button type="button" class="text-rose-600 text-xs font-medium hover:underline" @click="removeCreditRule(row.id)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
      </div>

      <!-- 右侧：策略试算 -->
      <aside class="w-full shrink-0 lg:sticky lg:top-4 lg:w-[20rem] xl:w-[22rem]">
        <div class="rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/40 shadow-sm overflow-hidden">
          <div class="border-b border-blue-100/80 px-4 py-3">
            <h2 class="text-base font-semibold text-slate-900">策略试算</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              按左侧当前表单实时试算（无需先保存）；开启「不做任何限制」时直接显示无限制结果。
            </p>
          </div>
          <div class="p-4 flex flex-col gap-5">
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">VIP 等级（mock）</label>
                <select v-model.number="sim.vipLevel" class="ant-select !py-2 w-full">
                  <option v-for="o in vipLevelOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">代理身份</label>
                <label class="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <span>{{ sim.isAgent ? '是代理' : '非代理' }}</span>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="sim.isAgent"
                    class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                    :class="sim.isAgent ? 'border-blue-600 bg-blue-600' : 'border-slate-300/90 bg-slate-200'"
                    @click="sim.isAgent = !sim.isAgent"
                  >
                    <span
                      class="pointer-events-none absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-slate-900/10 transition-transform duration-200 ease-out"
                      :class="sim.isAgent ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>
                </label>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">认证等级</label>
                <select v-model="sim.verificationLevel" class="ant-select !py-2 w-full">
                  <option
                    v-for="lvl in [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC, VERIFICATION_LEVEL.ADVANCED]"
                    :key="lvl"
                    :value="lvl"
                  >
                    {{ verificationRowLabel(lvl) }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">信用分</label>
                <input v-model.number="sim.creditScore" type="number" min="0" max="100" class="ant-input !py-2 w-full" />
              </div>
            </div>
            <div v-if="preview" class="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <div class="text-xs font-semibold uppercase text-slate-500 mb-2">试算结果</div>
              <div class="space-y-2">
                <div class="flex justify-between gap-4">
                  <span class="text-slate-600">单笔最低出金</span>
                  <span class="font-semibold text-slate-900 tabular-nums">{{ preview.minWithdrawUsdt }} USDT</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-slate-600">每日出金上限</span>
                  <span class="font-semibold text-slate-900 tabular-nums">{{ formatDailyCap(preview.dailyCapUsdt) }}</span>
                </div>
              </div>
              <p class="mt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">{{ preview.explain }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="toast.show"
        class="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-5 py-3 text-sm text-white shadow-lg"
      >
        {{ toast.text }}
      </div>
    </Transition>
  </section>
</template>
