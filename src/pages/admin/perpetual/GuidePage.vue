<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  basicConceptTerms,
  contractHelpNotes,
  contractModeCards,
  contractRuleExamples,
  contractTriggerCards,
  contractTriggers,
  controlStateTerms,
  faqItems,
  feeTerms,
  guideTabs,
  lineParamTerms,
  operationScenarios,
  paramCards,
  positionControls,
  positionTerms,
  triggerTerms
} from '../../../admin/mock/guide'

const route = useRoute()
const router = useRouter()

const tabs = guideTabs

const activeTab = computed(() => {
  const key = String(route.query.tab || 'overview')
  return tabs.some((t) => t.key === key) ? key : 'overview'
})

const onTabChange = (key) => {
  router.replace({ query: { ...route.query, tab: key } })
}

const sectionTitle = computed(() => tabs.find((t) => t.key === activeTab.value)?.label || '功能概览')
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">永续线控使用帮助</h1>
      <p class="mt-1 text-sm text-slate-500">按模块整理永续线控能力、参数定义与实操建议</p>
    </header>

    <div class="border-b border-slate-200">
      <div class="flex flex-wrap gap-5 text-sm">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="relative py-2 text-slate-500 transition hover:text-slate-800"
          :class="{ 'font-medium text-blue-600': activeTab === tab.key }"
          @click="onTabChange(tab.key)"
        >
          {{ tab.label }}
          <span v-if="activeTab === tab.key" class="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600"></span>
        </button>
      </div>
    </div>

    <article class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-xl font-semibold text-slate-900">{{ sectionTitle }}</h2>

      <div v-if="activeTab === 'overview'" class="mt-4 space-y-5 text-sm leading-7 text-slate-700">
        <article class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">什么是永续线控</h3>
          <p class="mt-3">
            永续线控是针对永续合约用户的精细化控制系统。与交割合约的场控不同，永续合约没有固定结算时间，因此线控主要通过以下方式实现：
          </p>
          <ul class="mt-2 space-y-1">
            <li>- 价格偏移：给用户展示的价格与真实市场价存在偏差</li>
            <li>- 滑点注入：在成交时人为制造滑点</li>
            <li>- 延迟成交：延迟用户订单的成交时间</li>
            <li>- 资金费率调整：针对特定用户调整资金费率</li>
            <li>- 标记价格调整：影响用户的强平价格计算</li>
          </ul>
        </article>

        <div class="grid gap-4 lg:grid-cols-2">
          <article class="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 class="text-xl font-semibold text-slate-900">合约级线控</h3>
            <p class="mt-2 text-slate-600">针对整个合约进行全局控制，影响所有交易该合约的用户：</p>
            <ul class="mt-3 space-y-2">
              <li class="text-sm text-slate-700">- 手动模式：人工设置参数，立即生效</li>
              <li class="text-sm text-slate-700">- 自动模式：按规则触发并自动执行</li>
              <li class="text-sm text-slate-700">- 支持触发后持续时间与自动恢复</li>
              <li class="text-sm text-slate-700">- 所有变更和触发均可审计</li>
            </ul>
          </article>

          <article class="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 class="text-xl font-semibold text-slate-900">持仓级线控</h3>
            <p class="mt-2 text-slate-600">针对用户的单个持仓进行精准控制：</p>
            <ul class="mt-3 space-y-1.5">
              <li v-for="item in positionControls" :key="item" class="font-medium text-slate-800">- {{ item }}</li>
            </ul>
          </article>
        </div>

        <article class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">线控参数说明</h3>
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <article v-for="card in paramCards" :key="card.name" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <p class="text-lg font-semibold text-slate-900">{{ card.name }}</p>
                <span class="text-sm text-slate-400">{{ card.unit }}</span>
              </div>
              <p class="mt-1 text-blue-600">范围: {{ card.range }}</p>
              <p class="mt-1 text-slate-600">{{ card.desc }}</p>
            </article>
          </div>
        </article>
      </div>

      <div v-else-if="activeTab === 'terms'" class="mt-4 space-y-6">
        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">基础概念</h3>
          <div class="mt-4 space-y-3">
            <article v-for="term in basicConceptTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">线控参数</h3>
          <div class="mt-4 space-y-3">
            <article v-for="term in lineParamTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
                <span class="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm text-slate-600">{{ term.unit }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
              <p class="mt-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700">示例: {{ term.example }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">合约与持仓</h3>
          <div class="mt-4 space-y-3">
            <article v-for="term in positionTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">费率与结算</h3>
          <div class="mt-4 space-y-3">
            <article v-for="term in feeTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">自动线控触发条件</h3>
          <div class="mt-4 space-y-3">
            <article v-for="term in triggerTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 class="text-lg font-semibold text-slate-900">线控状态</h3>
          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <article v-for="term in controlStateTerms" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-md px-2 py-0.5 text-sm font-medium" :class="term.cls">{{ term.zh }}</span>
                <span class="text-sm text-slate-500">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'contract-control'" class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <section class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">合约级线控概述</h3>
          <p class="mt-2">
            合约级线控是针对整个合约（如 BTCUSDT、ETHUSDT）进行的全局控制，会影响所有交易该合约的用户。支持手动设置参数和自动触发规则两种模式。
          </p>
          <div class="mt-3 grid gap-3 lg:grid-cols-2">
            <article v-for="mode in contractModeCards" :key="mode.title" class="rounded-lg border p-4" :class="mode.className">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="mode.badgeClass">{{ mode.title }}</span>
              <ul class="mt-2 space-y-1">
                <li v-for="point in mode.points" :key="point">- {{ point }}</li>
              </ul>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">自动触发条件</h3>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <article v-for="item in contractTriggerCards" :key="item.title" class="rounded-lg border border-slate-200 bg-white p-4">
              <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="item.cls">{{ item.title }}</span>
              <p class="mt-2 text-slate-700">{{ item.desc }}</p>
              <p class="text-blue-600">例：{{ item.example }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">自动规则配置示例</h3>
          <div class="mt-3 space-y-3">
            <article v-for="example in contractRuleExamples" :key="example.name" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center gap-2">
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="example.labelCls">规则示例</span>
                <p class="text-lg font-semibold text-slate-900">{{ example.name }}</p>
              </div>
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p class="font-medium text-slate-700">触发条件：</p>
                  <ul class="mt-1 space-y-1">
                    <li v-for="line in example.trigger" :key="line">- {{ line }}</li>
                  </ul>
                </div>
                <div>
                  <p class="font-medium text-slate-700">执行动作：</p>
                  <ul class="mt-1 space-y-1">
                    <li v-for="line in example.action" :key="line">- {{ line }}</li>
                  </ul>
                </div>
              </div>
              <p class="mt-3 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700">效果说明: {{ example.effect }}</p>
            </article>
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">合约线控注意事项</h3>
          <ol class="mt-3 space-y-1 text-slate-700">
            <li v-for="(note, idx) in contractHelpNotes" :key="note">{{ idx + 1 }}. {{ note }}</li>
          </ol>
        </section>
      </div>

      <div v-else-if="activeTab === 'examples'" class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <article
          v-for="scene in operationScenarios"
          :key="scene.title"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <p class="font-medium text-slate-900">{{ scene.title }}</p>
          <p class="mt-2"><span class="font-medium">触发：</span>{{ scene.trigger }}</p>
          <p><span class="font-medium">动作：</span>{{ scene.action }}</p>
          <p><span class="font-medium">效果：</span>{{ scene.effect }}</p>
          <p class="text-blue-700">{{ scene.duration }}</p>
        </article>
      </div>

      <div v-else class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <article
          v-for="item in faqItems"
          :key="item.q"
          class="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <p class="font-medium text-slate-900">Q: {{ item.q }}</p>
          <p class="mt-1 text-slate-700">A: {{ item.a }}</p>
        </article>
      </div>
    </article>
  </section>
</template>
