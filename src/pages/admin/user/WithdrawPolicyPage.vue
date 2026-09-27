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
  if (v === null || v === undefined || Number(v) === 0) return '无限制'
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
          配置 U 本位单笔最低出金与每日出金上限。VIP 等级与
          <span class="text-slate-700">VIP 等级配置</span>
          mock 同步；按认证等级的出金规则与
          <span class="text-slate-700">认证等级配置</span>
          中的等级名称一致（未认证 / 初级 / 高级），具体限额仅在此页维护。多维度同时启用且均命中规则时，按<strong class="font-semibold text-slate-700">最严格模式</strong>合并：单笔最低取各维度要求中的<strong class="font-semibold text-slate-700">最大值</strong>，每日上限取各维度中的<strong class="font-semibold text-slate-700">最小值</strong>（无限制视为较宽松，不参与与数值比较时的收紧）。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button html-type="button" class="" :disabled="saving" @click="resetToSample">重新加载</a-button>
        <a-button html-type="button" class="" :disabled="saving" @click="persist" type="primary">
          保存配置
        </a-button>
      </div>
    </div>

    <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
      <!-- 左侧：配置 -->
      <div class="min-w-0 flex-1 space-y-6">
    <!-- 全局默认 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">全局默认（兜底）</h2>
        <p class="text-xs text-slate-500 mt-0.5">当各细分规则均未命中时使用。</p>
      </div>
      <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">单笔最低出金（USDT）</label>
          <a-input type="number" min="0" step="0.01" class="w-full" :value="policy.defaultPolicy.minWithdrawUsdt" @update:value="policy.defaultPolicy.minWithdrawUsdt = $event === '' ? '' : Number($event)" />
          <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制单笔最低出金。</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">每日出金上限（USDT）</label>
          <a-input type="number" min="0" step="1" class="w-full" :value="policy.defaultPolicy.dailyCapUsdt" @update:value="policy.defaultPolicy.dailyCapUsdt = $event === '' ? '' : Number($event)" />
          <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制每日出金上限。</p>
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
            <a-switch :checked="isDimensionOn(dim)" :aria-label="`${WITHDRAW_POLICY_DIMENSION_LABEL[dim]}：${isDimensionOn(dim) ? '已启用' : '已关闭'}`" @click="toggleDimensionEnabled(dim)" />
            <div class="flex items-center justify-end gap-0.5 shrink-0">
              <a-button html-type="button" class="text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent" :disabled="idx === 0" @click="moveDimension(idx, -1)">
                上移
              </a-button>
              <a-button html-type="button" class="text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent" :disabled="idx === policy.dimensionPriority.length - 1" @click="moveDimension(idx, 1)">
                下移
              </a-button>
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
        <a-table  :data-source="policy.vipRules" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50/50&quot;] })">
<a-table-column key="column-0" ><template #title>VIP（mock）</template><template #default="{ record: row, index: index }"><div class="  text-slate-900 font-medium">{{ vipRowLabel(row.vipLevel) }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>单笔最低 (U)</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" step="0.01" class="w-32" :value="row.minWithdrawUsdt" @update:value="row.minWithdrawUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>每日上限 (U)</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" step="1" class="w-36" :value="row.dailyCapUsdt" @update:value="row.dailyCapUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
</a-table>
      </div>
    </div>

    <!-- 代理：后台当前仅一种代理身份 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">按代理身份</h2>
        <p class="text-xs text-slate-500 mt-0.5">当前代理体系仅区分是否代理；开启「代理身份」维度后，代理用户会命中本规则。</p>
      </div>
      <div class="overflow-x-auto">
        <a-table :data-source="[policy.agentRule]" :row-key="() => 'agent'" :pagination="false" size="small" :scroll="{ x: 'max-content' }"><a-table-column key="column-0"><template #title>用户身份</template><template #default="{ record: log }">代理</template></a-table-column><a-table-column key="column-1"><template #title>单笔最低 (U)</template><template #default="{ record: log }">
                <a-input type="number" min="0" step="0.01" class="w-32" :value="policy.agentRule.minWithdrawUsdt" @update:value="policy.agentRule.minWithdrawUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </template></a-table-column><a-table-column key="column-2"><template #title>每日上限 (U)</template><template #default="{ record: log }">
                <a-input type="number" min="0" step="1" class="w-36" :value="policy.agentRule.dailyCapUsdt" @update:value="policy.agentRule.dailyCapUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </template></a-table-column></a-table>
      </div>
    </div>

    <!-- 认证：与 verificationConfig 等级一致 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 class="text-base font-semibold text-slate-900">按账户认证等级</h2>
        <p class="text-xs text-slate-500 mt-0.5">等级与「认证等级配置」中的三档一致；单笔与每日上限仅在此配置，不在认证页维护。</p>
      </div>
      <div class="overflow-x-auto">
        <a-table  :data-source="policy.verificationRules" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50/50&quot;] })">
<a-table-column key="column-0" ><template #title>认证等级</template><template #default="{ record: row, index: index }"><div class="  text-slate-900 font-medium">{{ verificationRowLabel(row.verificationLevel) }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>单笔最低 (U)</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" step="0.01" class="w-32" :value="row.minWithdrawUsdt" @update:value="row.minWithdrawUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>每日上限</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label class="inline-flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
                    <a-checkbox :checked="row.dailyCapUsdt === null" @change="setVerificationDailyUnlimited(row, $event)" />
                    无限制
                  </label>
                  <a-input v-if="row.dailyCapUsdt !== null" type="number" min="0" step="1" class="w-36" :value="row.dailyCapUsdt" @update:value="row.dailyCapUsdt = $event === '' ? '' : Number($event)" />
                </div>
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
</a-table>
      </div>
    </div>

    <!-- 信用分 -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">按信用分区间</h2>
          <p class="text-xs text-slate-500">按信用分落入的区间匹配规则；区间请勿互相重叠。</p>
        </div>
        <a-button html-type="button" class="text-sm" @click="addCreditRule" type="primary">+ 添加区间</a-button>
      </div>
      <div class="overflow-x-auto">
        <a-table  :data-source="policy.creditScoreRules" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50/50&quot;] })">
<a-table-column key="column-0" ><template #title>分数下限</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" max="100" class="w-24" :value="row.minScore" @update:value="row.minScore = $event === '' ? '' : Number($event)" />
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>分数上限</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" max="100" class="w-24" :value="row.maxScore" @update:value="row.maxScore = $event === '' ? '' : Number($event)" />
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>单笔最低 (U)</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" step="0.01" class="w-32" :value="row.minWithdrawUsdt" @update:value="row.minWithdrawUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>每日上限 (U)</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-input type="number" min="0" step="1" class="w-36" :value="row.dailyCapUsdt" @update:value="row.dailyCapUsdt = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs leading-5 text-slate-500">输入 0 表示不限制</p>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>操作</template><template #default="{ record: row, index: index }"><div class=" ">
                <a-button html-type="button" class="text-rose-600 text-xs font-medium hover:underline" @click="removeCreditRule(row.id)">
                  删除
                </a-button>
              </div></template></a-table-column>
</a-table>
      </div>
    </div>
      </div>

      <!-- 右侧：策略试算 -->
      <aside class="w-full shrink-0 lg:sticky lg:top-4 lg:w-[20rem] xl:w-[22rem]">
        <div class="rounded-xl border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50/40 shadow-sm overflow-hidden">
          <div class="border-b border-blue-100/80 px-4 py-3">
            <h2 class="text-base font-semibold text-slate-900">策略试算</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              按左侧当前表单实时试算（无需先保存）。
            </p>
          </div>
          <div class="p-4 flex flex-col gap-5">
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">VIP 等级（mock）</label>
                <a-select v-model:value="sim.vipLevel" class="w-full">
                  <a-select-option v-for="o in vipLevelOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
                </a-select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">代理身份</label>
                <label class="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <span>{{ sim.isAgent ? '是代理' : '非代理' }}</span>
                  <a-switch :checked="sim.isAgent" @click="sim.isAgent = !sim.isAgent" />
                </label>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">认证等级</label>
                <a-select v-model:value="sim.verificationLevel" class="w-full">
                  <a-select-option v-for="lvl in [VERIFICATION_LEVEL.NONE, VERIFICATION_LEVEL.BASIC, VERIFICATION_LEVEL.ADVANCED]" :key="lvl" :value="lvl">
                    {{ verificationRowLabel(lvl) }}
                  </a-select-option>
                </a-select>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">信用分</label>
                <a-input type="number" min="0" max="100" class="w-full" :value="sim.creditScore" @update:value="sim.creditScore = $event === '' ? '' : Number($event)" />
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
