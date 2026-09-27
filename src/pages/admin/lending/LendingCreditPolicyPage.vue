<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">额度与打分</h1>
        <p class="mt-1 text-sm text-slate-500">配置授信额度模板与评分规则，按用户维度折算可借上限</p>
      </div>
    </header>

    <div
      v-if="visibleTabs.length === 0"
      class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
    >
      <p class="font-medium text-slate-800">暂无授信中心权限</p>
      <p class="mt-2">请联系管理员在 RBAC 中分配「借贷 · 授信」相关权限。</p>
    </div>

    <article v-else class="rounded-xl border border-slate-200 bg-white">
      <div v-if="visibleTabs.length > 1" class="border-b border-slate-200 px-4 lg:px-6">
        <div
          class="-mb-px flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="授信中心分区"
        >
          <a-button type="text"
            v-for="t in visibleTabs"
            :key="t.id"
            html-type="button"
            role="tab"
            :aria-selected="mainTab === t.id"
            class="whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors"
            :class="
              mainTab === t.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-slate-600 hover:text-slate-900'
            "
            @click="mainTab = t.id"
          >
            {{ t.label }}
          </a-button>
        </div>
      </div>

      <div class="space-y-4 p-4">
      <!-- 额度模板 -->
      <div v-show="mainTab === 'limits'" class="space-y-4">
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p class="leading-relaxed">
            与「每项得几分」无关：这里只决定<strong class="text-slate-800">满分时</strong>账户总授信上限，以及<strong class="text-slate-800">低分保底</strong>（再差也保留模板的几成）。修改后请点下方<strong class="text-slate-800">保存</strong>生效。
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <h2 class="text-sm font-semibold text-slate-800">低分保底比例（minScale）</h2>
          <p class="mt-1 text-xs text-slate-500">
            得分率 0 时，scale 不低于该值；得分率 1 时，scale 为 1。建议 0.2～0.5。
          </p>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a-slider
              v-model:value.number="lendingCreditScorecard.minScale"
              :min="0.05"
              :max="0.95"
              :step="0.05"
              :disabled="!canEditLimits"
              class="flex-1 disabled:opacity-50"
            />
            <a-input
              v-model:value.number="lendingCreditScorecard.minScale"
              type="number"
              min="0.05"
              max="0.95"
              step="0.05"
              :disabled="!canEditLimits"
              class="w-28 rounded-lg border px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              :class="minScaleValid ? 'border-slate-200' : 'border-amber-400 bg-amber-50'"
            />
          </div>
          <p v-if="!minScaleValid" class="mt-2 text-xs text-amber-700">超出 0.05～0.95 时，计算会按边界值夹取。</p>
        </div>

        <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <a-table size="small" :pagination="false" :data-source="[{ key: 0 }]" row-key="key" :scroll="{ x: 'max-content' }"><a-table-column key="static-0"><template #title>项目</template><template #default="{ record }"><div v-if="record.key === 0" class="px-4 py-3 font-medium text-slate-800">账户总授信</div></template></a-table-column><a-table-column key="static-1" align="right"><template #title>模板（满分时）</template><template #default="{ record }"><div v-if="record.key === 0" class="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                  {{ Number(lendingCreditScorecard.baseAccountCapMax || 0).toLocaleString() }}
                </div></template></a-table-column><a-table-column key="static-2" align="right"><template #title>按当前得分折算</template><template #default="{ record }"><div v-if="record.key === 0" class="px-4 py-3 text-right font-mono tabular-nums text-blue-700">
                  {{ scaledAccountPreview.toLocaleString() }}
                </div></template></a-table-column></a-table>
        </div>

        <div class="max-w-md space-y-2">
          <label class="text-sm font-medium text-slate-700">账户总授信上限（满分时）</label>
          <a-input
            v-model:value.number="lendingCreditScorecard.baseAccountCapMax"
            type="number"
            min="0"
            step="10000"
            :disabled="!canEditLimits"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div
          v-if="canEditLimits"
          class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4"
        >
          <a-button type="text"
            html-type="button"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="saveLimitsTemplate"
          >
            保存
          </a-button>
          <span v-if="limitsSaveHint" class="text-sm font-medium text-emerald-600">{{ limitsSaveHint }}</span>
        </div>
      </div>

      <!-- 评分与规则 -->
      <div v-show="mainTab === 'scorecard'" class="space-y-4">
        <div
          v-if="!canEditScorecard"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          只读浏览；编辑规则需
          <code class="mx-0.5 rounded bg-amber-100/90 px-1 font-mono text-[10px]">{{ LENDING_CREDIT_PERM.EDIT_SCORECARD }}</code>
          。
        </div>
        <p v-else class="text-xs leading-relaxed text-slate-500">
          每项默认<strong class="text-slate-700">预览</strong>当前配置；点<strong class="text-slate-700">编辑</strong>修改，<strong class="text-slate-700">保存</strong>后回到预览，<strong class="text-slate-700">取消</strong>放弃本次修改。
        </p>

        <div v-if="canEditLimits" class="flex flex-wrap items-center gap-2">
          <a-button type="text"
            html-type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            @click="mainTab = 'limits'"
          >
            ← {{ LIMITS_TAB_LABEL }}
          </a-button>
        </div>

        <div class="space-y-4">
          <article
            v-for="dim in orderedDimensions"
            :key="dim.key"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 sm:items-center">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/80"
                  >
                    {{ groupShortLabel(dim.group) }}
                  </span>
                  <h3 class="text-lg font-semibold text-slate-900" :title="dim.key">{{ dim.label }}</h3>
                  <span
                    v-if="dim.deferredLabel"
                    class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
                  >
                    {{ dim.deferredLabel }}
                  </span>
                  <span
                    v-if="dim.scoreRule"
                    class="rounded-full px-2 py-0.5 text-[10px] font-medium ring-1"
                    :class="
                      isScorecardEditing(dim)
                        ? 'bg-amber-50 text-amber-900 ring-amber-200'
                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                    "
                  >
                    {{ isScorecardEditing(dim) ? '编辑中' : '预览' }}
                  </span>
                </div>
                <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ dim.description }}</p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-2 sm:items-end">
                <div
                  v-if="canEditScorecard && dim.scoreRule"
                  class="flex flex-wrap justify-end gap-2"
                >
                  <template v-if="!isScorecardEditing(dim)">
                    <a-button type="text"
                      html-type="button"
                      class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
                      @click="enterScorecardEdit(dim)"
                    >
                      编辑
                    </a-button>
                  </template>
                  <template v-else>
                    <a-button type="text"
                      html-type="button"
                      class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      @click="saveScorecardEdit(dim)"
                    >
                      保存
                    </a-button>
                    <a-button type="text"
                      html-type="button"
                      class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                      @click="cancelScorecardEdit(dim)"
                    >
                      取消
                    </a-button>
                  </template>
                </div>
                <p
                  v-if="dim.scoreRule && dim.scoreRule.enabled === false"
                  class="text-right text-[11px] text-amber-700"
                >
                  规则未启用
                </p>
              </div>
            </div>

            <div class="space-y-3 p-4">
              <!-- 预览模式：只读汇总 + 分档表 -->
              <div
                v-if="dim.scoreRule && !isScorecardEditing(dim)"
                class="rounded-lg border border-slate-200 bg-white p-4"
                :class="{ 'opacity-70': dim.scoreRule.enabled === false }"
              >
                <p class="text-xs font-semibold text-slate-800">配置预览</p>
                <dl class="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div class="flex justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 sm:block sm:px-3">
                    <dt class="text-slate-500">启用本项</dt>
                    <dd class="font-medium text-slate-800">{{ dim.scoreRule.enabled !== false ? '是' : '否' }}</dd>
                  </div>
                  <div
                    v-if="dim.deferredNote"
                    class="flex justify-between gap-2 rounded-md bg-amber-50 px-2 py-1.5 sm:block sm:px-3"
                  >
                    <dt class="text-amber-700">状态</dt>
                    <dd class="font-medium text-amber-900">{{ dim.deferredNote }}</dd>
                  </div>
                </dl>

                <div v-if="dim.scoreRule.evaluator === SCORE_RULE_EVALUATOR.RANGE" class="mt-4 overflow-x-auto">
                  <p class="mb-2 text-[11px] font-medium text-slate-500">数值分档</p>
                  <a-table  size="small" :pagination="false" :data-source="dim.scoreRule.ranges || []" :row-key="(row) => dim.key + '-pv-rg-' + row.min" :scroll="{ x: 'max-content' }">
<a-table-column key="column-0" :custom-cell="(row, ri) => ({ class: [&quot;py-1.5 pr-2 font-mono tabular-nums&quot;] })">
<template #title>下限 ≥</template>
<template #default="{ record: row, index: ri }">{{ row.min }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, ri) => ({ class: [&quot;py-1.5 pr-2 font-mono tabular-nums&quot;] })">
<template #title>上限 &lt;</template>
<template #default="{ record: row, index: ri }">{{ row.max == null ? '∞' : row.max }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(row, ri) => ({ class: [&quot;py-1.5 pr-2 font-mono tabular-nums&quot;] })">
<template #title>得分</template>
<template #default="{ record: row, index: ri }">{{ row.points }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(row, ri) => ({ class: [&quot;py-1.5 text-slate-600&quot;] })">
<template #title>备注</template>
<template #default="{ record: row, index: ri }">{{ row.caption || '—' }}</template>
</a-table-column>
</a-table>
                </div>
                <div v-else class="mt-4 overflow-x-auto">
                  <p class="mb-2 text-[11px] font-medium text-slate-500">枚举映射</p>
                  <a-table  size="small" :pagination="false" :data-source="dim.scoreRule.enumCases || []" :row-key="(row) => dim.key + '-pv-en-' + row.value" :scroll="{ x: 'max-content' }">
<a-table-column key="column-0" :custom-cell="(row, ei) => ({ class: [&quot;py-1.5 pr-2 font-mono&quot;] })">
<template #title>取值</template>
<template #default="{ record: row, index: ei }">{{ row.value }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(row, ei) => ({ class: [&quot;py-1.5 pr-2 font-mono tabular-nums&quot;] })">
<template #title>得分</template>
<template #default="{ record: row, index: ei }">{{ row.points }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(row, ei) => ({ class: [&quot;py-1.5 text-slate-600&quot;] })">
<template #title>说明</template>
<template #default="{ record: row, index: ei }">{{ row.caption || '—' }}</template>
</a-table-column>
</a-table>
                </div>
                <p v-if="canEditScorecard" class="mt-3 text-[11px] text-slate-500">
                  点右上角「编辑」可修改规则与分档表，完成后点「保存」回到预览。
                </p>
              </div>

              <div
                v-if="dim.scoreRule && isScorecardEditing(dim)"
                class="rounded-lg border border-slate-200 bg-slate-50/30 p-3 sm:p-4"
                :class="{ 'opacity-60': dim.scoreRule.enabled === false }"
              >
                <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="text-sm font-semibold text-slate-800">评分规则</h4>
                    <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {{ dim.scoreRule.evaluator === SCORE_RULE_EVALUATOR.RANGE ? '数值区间' : '枚举匹配' }}
                    </span>
                  </div>
                  <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <a-checkbox
                      class="disabled:opacity-50"
                      :checked="dim.scoreRule.enabled !== false"
                      :disabled="!canEditScorecard"
                      @change="onScoreRuleEnabledChange(dim, $event)"
                    />
                    启用本项
                  </label>
                </div>

                <template v-if="dim.scoreRule.evaluator === SCORE_RULE_EVALUATOR.RANGE">
                  <div class="hidden text-[11px] font-medium text-slate-400 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,2fr)_auto] sm:gap-2 sm:px-1 sm:pb-1">
                    <span>下限 ≥</span>
                    <span>上限 &lt;（空=无上限）</span>
                    <span>得分</span>
                    <span>备注</span>
                    <span></span>
                  </div>
                  <div class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    <div
                      v-for="(row, ri) in dim.scoreRule.ranges || []"
                      :key="dim.key + '-rg-' + ri"
                      class="flex flex-col gap-2 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,2fr)_auto] sm:items-center sm:gap-2 sm:py-2 sm:pl-2 sm:pr-1"
                    >
                      <label class="text-[11px] text-slate-400 sm:hidden">下限 ≥</label>
                      <a-input
                        v-model:value.number="row.min"
                        type="number"
                        step="any"
                        :disabled="ruleFieldsLocked(dim)"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm disabled:bg-slate-50"
                      />
                      <label class="text-[11px] text-slate-400 sm:hidden">上限 &lt;</label>
                      <a-input
                        :value="row.max == null || row.max === '' ? '' : row.max"
                        type="number"
                        step="any"
                        :disabled="ruleFieldsLocked(dim)"
                        placeholder="无上限"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm disabled:bg-slate-50"
                        @input="onScoreRangeMaxInput(row, $event)"
                      />
                      <label class="text-[11px] text-slate-400 sm:hidden">得分</label>
                      <a-input
                        v-model:value.number="row.points"
                        type="number"
                        min="0"
                        step="1"
                        :disabled="ruleFieldsLocked(dim)"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm disabled:bg-slate-50 sm:max-w-[5rem]"
                      />
                      <label class="text-[11px] text-slate-400 sm:hidden">备注</label>
                      <a-input
                        v-model:value="row.caption"
                        type="text"
                        :disabled="ruleFieldsLocked(dim)"
                        placeholder="档位说明"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
                      />
                      <div class="flex justify-end sm:justify-center">
                        <a-button type="text"
                          html-type="button"
                          :disabled="ruleFieldsLocked(dim)"
                          class="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                          @click="removeScoreRangeRow(dim, ri)"
                        >
                          删除
                        </a-button>
                      </div>
                    </div>
                  </div>
                  <a-button type="text"
                    v-if="canEditScorecard && dim.scoreRule.enabled !== false"
                    html-type="button"
                    class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                    @click="addScoreRangeRow(dim)"
                  >
                    + 添加分档
                  </a-button>
                </template>

                <template v-else>
                  <div class="hidden text-[11px] font-medium text-slate-400 sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,2fr)_auto] sm:gap-2 sm:px-1 sm:pb-1">
                    <span>取值</span>
                    <span>得分</span>
                    <span>说明</span>
                    <span></span>
                  </div>
                  <div class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    <div
                      v-for="(row, ei) in dim.scoreRule.enumCases || []"
                      :key="dim.key + '-en-' + ei"
                      class="flex flex-col gap-2 p-3 sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,2fr)_auto] sm:items-center sm:gap-2 sm:py-2 sm:pl-2 sm:pr-1"
                    >
                      <label class="text-[11px] text-slate-400 sm:hidden">取值</label>
                      <a-input
                        v-model:value="row.value"
                        type="text"
                        :disabled="ruleFieldsLocked(dim)"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm disabled:bg-slate-50"
                      />
                      <label class="text-[11px] text-slate-400 sm:hidden">得分</label>
                      <a-input
                        v-model:value.number="row.points"
                        type="number"
                        min="0"
                        step="1"
                        :disabled="ruleFieldsLocked(dim)"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 font-mono text-sm disabled:bg-slate-50 sm:max-w-[5rem]"
                      />
                      <label class="text-[11px] text-slate-400 sm:hidden">说明</label>
                      <a-input
                        v-model:value="row.caption"
                        type="text"
                        :disabled="ruleFieldsLocked(dim)"
                        placeholder="可选"
                        class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm disabled:bg-slate-50"
                      />
                      <div class="flex justify-end sm:justify-center">
                        <a-button type="text"
                          html-type="button"
                          :disabled="ruleFieldsLocked(dim)"
                          class="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                          @click="removeEnumCaseRow(dim, ei)"
                        >
                          删除
                        </a-button>
                      </div>
                    </div>
                  </div>
                  <a-button type="text"
                    v-if="canEditScorecard && dim.scoreRule.enabled !== false"
                    html-type="button"
                    class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                    @click="addEnumCaseRow(dim)"
                  >
                    + 添加枚举项
                  </a-button>
                </template>
              </div>

              <div class="border-t border-slate-100 pt-4">
                <div
                  v-if="dim.scoreRule && !isScorecardEditing(dim)"
                  class="max-w-lg rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-700"
                >
                  <span class="font-medium text-slate-800">本项满分（权重）</span>
                  <span class="ml-2 font-mono font-semibold tabular-nums">{{ dim.maxPoints }}</span>
                  <span class="ml-2 text-xs text-slate-500">占整卡约 {{ weightPercent(dim).toFixed(1) }}% · 点「编辑」后可改</span>
                </div>
                <div v-else class="max-w-md space-y-2">
                  <label class="text-xs font-medium text-slate-600">本项满分（卡内权重）</label>
                  <a-input
                    v-model:value.number="dim.maxPoints"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    :disabled="!canEditScorecard"
                    class="w-full max-w-[8rem] rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    @blur="onDimMaxBlur(dim)"
                  />
                  <p class="text-[11px] text-slate-400">占整卡约 {{ weightPercent(dim).toFixed(1) }}%；单项得分在取到指标值后按规则表匹配。</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
    </article>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  applyScorecardToPolicy,
  lendingCreditDemoMetricSnapshot,
  lendingCreditScorecard,
  LENDING_SCORECARD_GROUP,
  LENDING_SCORECARD_GROUP_LABEL,
  LENDING_SCORECARD_GROUP_ORDER
} from '../../../admin/mock/lendingCreditConfig'
import { computeScorecardRatio } from '../../../admin/constants/lendingCredit'
import { LENDING_CREDIT_PERM } from '../../../admin/constants/lendingCreditPermissions'
import {
  LENDING_OP_ACTION,
  LENDING_OP_MODULE
} from '../../../admin/constants/lendingOperationLog'
import { SCORE_RULE_EVALUATOR } from '../../../admin/constants/lendingCreditScoreRule'
import { appendLendingOperationLog } from '../../../admin/state/lendingOperationLogs'
import { useAdminPermissionsStore } from '../../../admin/stores/adminPermissions'

const route = useRoute()
const permStore = useAdminPermissionsStore()

/** 评分项 key → 是否处于编辑态（有 scoreRule 时默认预览，点「编辑」进入） */
const scorecardEditingByKey = reactive({})
/** 进入编辑时的快照，供「取消」恢复 */
const scorecardEditSnapshotByKey = reactive({})

const canEditLimits = computed(() => permStore.can(LENDING_CREDIT_PERM.EDIT_LIMITS))
const canEditScorecard = computed(() => permStore.can(LENDING_CREDIT_PERM.EDIT_SCORECARD))
/** 有额度或评分任一权限即可打开「评分与规则」（仅额度权时为只读） */
const canViewScorecardTab = computed(() => canEditScorecard.value || canEditLimits.value)

/** 额度模板 Tab 展示名（与页内说明区分：名称只在 Tab 上重复） */
const LIMITS_TAB_LABEL = '额度模板'

const limitsSaveHint = ref('')
let limitsSaveHintTimer = null

function saveLimitsTemplate() {
  if (!canEditLimits.value) return
  const sc = lendingCreditScorecard
  let ms = Number(sc.minScale)
  if (!Number.isFinite(ms)) ms = 0.35
  sc.minScale = Math.min(0.95, Math.max(0.05, ms))
  const cap = Number(sc.baseAccountCapMax)
  if (Number.isFinite(cap) && cap >= 0) sc.baseAccountCapMax = Math.round(cap)
  applyScorecardToPolicy()
  appendLendingOperationLog({
    module: LENDING_OP_MODULE.CREDIT_LIMITS,
    action: LENDING_OP_ACTION.SAVE_LIMITS,
    targetLabel: LIMITS_TAB_LABEL,
    summary: `保存额度模板：minScale=${sc.minScale}，账户总授信（满分时）=${Number(sc.baseAccountCapMax || 0).toLocaleString('zh-CN')}`,
    operator: 'admin'
  })
  limitsSaveHint.value = '已保存'
  if (limitsSaveHintTimer) clearTimeout(limitsSaveHintTimer)
  limitsSaveHintTimer = setTimeout(() => {
    limitsSaveHint.value = ''
    limitsSaveHintTimer = null
  }, 2500)
}

onBeforeUnmount(() => {
  if (limitsSaveHintTimer) clearTimeout(limitsSaveHintTimer)
})

const visibleTabs = computed(() => {
  const tabs = []
  if (canEditLimits.value) tabs.push({ id: 'limits', label: LIMITS_TAB_LABEL })
  if (canViewScorecardTab.value) tabs.push({ id: 'scorecard', label: '评分与规则' })
  return tabs
})

const mainTab = ref('limits')

function pickDefaultTab() {
  const ids = visibleTabs.value.map((t) => t.id)
  if (ids.includes(mainTab.value)) return
  mainTab.value = ids[0] || 'limits'
}

watch(visibleTabs, () => pickDefaultTab(), { immediate: true })

watch(
  () => route.query.tab,
  (q) => {
    if (typeof q !== 'string') return
    const allowed = visibleTabs.value.some((t) => t.id === q)
    if (allowed) mainTab.value = q
  },
  { immediate: true }
)

watch(canEditScorecard, (ok) => {
  if (!ok) {
    for (const k of Object.keys(scorecardEditingByKey)) {
      delete scorecardEditingByKey[k]
    }
    for (const k of Object.keys(scorecardEditSnapshotByKey)) {
      delete scorecardEditSnapshotByKey[k]
    }
  }
})

const groupOrderIndex = computed(() =>
  Object.fromEntries(LENDING_SCORECARD_GROUP_ORDER.map((g, i) => [g, i]))
)

const orderedDimensions = computed(() => {
  const dims = [...lendingCreditScorecard.dimensions]
  const rank = groupOrderIndex.value
  dims.sort((a, b) => {
    const ga = rank[a.group ?? LENDING_SCORECARD_GROUP.OTHER] ?? 99
    const gb = rank[b.group ?? LENDING_SCORECARD_GROUP.OTHER] ?? 99
    if (ga !== gb) return ga - gb
    return String(a.key).localeCompare(String(b.key))
  })
  return dims
})

const scoreStats = computed(() =>
  computeScorecardRatio(lendingCreditScorecard, lendingCreditDemoMetricSnapshot)
)

const totalWeight = computed(() =>
  orderedDimensions.value.reduce((s, d) => s + Math.max(0, Number(d.maxPoints) || 0), 0)
)

function weightPercent(dim) {
  const t = totalWeight.value
  const m = Math.max(0, Number(dim.maxPoints) || 0)
  if (!t || !m) return 0
  return (100 * m) / t
}

function groupShortLabel(group) {
  const g = group || LENDING_SCORECARD_GROUP.OTHER
  return LENDING_SCORECARD_GROUP_LABEL[g] || g
}

const minScale = computed(() => {
  const v = Number(lendingCreditScorecard.minScale)
  return Number.isFinite(v) ? Math.min(0.95, Math.max(0.05, v)) : 0.35
})

const minScaleValid = computed(() => {
  const v = Number(lendingCreditScorecard.minScale)
  return Number.isFinite(v) && v >= 0.05 && v <= 0.95
})

const scaleNumeric = computed(() => {
  const floor = minScale.value
  const r = scoreStats.value.ratio
  return floor + (1 - floor) * r
})

const scaledAccountPreview = computed(() =>
  Math.round(Number(lendingCreditScorecard.baseAccountCapMax || 0) * scaleNumeric.value)
)

/** 无 scoreRule 的维度仅改权重，始终视为可编辑区 */
function isScorecardEditing(dim) {
  if (!dim?.scoreRule) return true
  return !!scorecardEditingByKey[dim.key]
}

function enterScorecardEdit(dim) {
  if (!dim?.scoreRule || !canEditScorecard.value) return
  if (scorecardEditingByKey[dim.key]) return
  scorecardEditSnapshotByKey[dim.key] = {
    maxPoints: dim.maxPoints,
    scoreRule: JSON.parse(JSON.stringify(dim.scoreRule))
  }
  scorecardEditingByKey[dim.key] = true
}

function cancelScorecardEdit(dim) {
  if (!dim?.scoreRule) return
  const snap = scorecardEditSnapshotByKey[dim.key]
  if (snap) {
    dim.maxPoints = snap.maxPoints
    dim.scoreRule = JSON.parse(JSON.stringify(snap.scoreRule))
  }
  delete scorecardEditSnapshotByKey[dim.key]
  delete scorecardEditingByKey[dim.key]
}

function saveScorecardEdit(dim) {
  if (!dim?.scoreRule) return
  delete scorecardEditSnapshotByKey[dim.key]
  delete scorecardEditingByKey[dim.key]
  applyScorecardToPolicy()
  appendLendingOperationLog({
    module: LENDING_OP_MODULE.CREDIT_SCORECARD,
    action: LENDING_OP_ACTION.SAVE_SCORECARD,
    refId: dim.key,
    targetLabel: dim.label || dim.key,
    summary: `保存评分维度「${dim.label || dim.key}」规则与权重（卡内权重 ${Math.max(0, Number(dim.maxPoints) || 0)}）`,
    operator: 'admin'
  })
}

function ruleFieldsLocked(dim) {
  return !canEditScorecard.value || dim.scoreRule?.enabled === false
}

function onScoreRuleEnabledChange(dim, ev) {
  const r = dim.scoreRule
  if (!r) return
  r.enabled = ev?.target?.checked === true
}

function onDimMaxBlur(dim) {
  let m = Math.round(Number(dim.maxPoints) || 0)
  if (!Number.isFinite(m) || m < 1) m = 1
  if (m > 100) m = 100
  dim.maxPoints = m
}

function onScoreRangeMaxInput(row, ev) {
  const t = ev?.target?.value?.trim?.() ?? ''
  row.max = t === '' ? null : Number(t)
}

function addScoreRangeRow(dim) {
  const r = dim.scoreRule
  if (!r) return
  if (!Array.isArray(r.ranges)) r.ranges = []
  r.ranges.push({ min: 0, max: null, points: 0, caption: '' })
}

function removeScoreRangeRow(dim, idx) {
  dim.scoreRule?.ranges?.splice(idx, 1)
}

function addEnumCaseRow(dim) {
  const r = dim.scoreRule
  if (!r) return
  if (!Array.isArray(r.enumCases)) r.enumCases = []
  r.enumCases.push({ value: '', points: 0, caption: '' })
}

function removeEnumCaseRow(dim, idx) {
  dim.scoreRule?.enumCases?.splice(idx, 1)
}
</script>
