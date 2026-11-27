<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deliveryControlScopes,
  deliveryFaqs,
  deliveryGuideTabs,
  deliveryOperationGuide,
  deliveryOverview,
  deliveryScenarios,
  deliveryTermSections
} from '../../../admin/mock/deliveryGuide'

const route = useRoute()
const router = useRouter()

const tabs = deliveryGuideTabs

const activeTab = computed(() => {
  const key = String(route.query.tab || 'overview')
  return tabs.some((item) => item.key === key) ? key : 'overview'
})

const onTabChange = (key) => {
  router.replace({ query: { ...route.query, tab: key } })
}

const sectionTitle = computed(() => tabs.find((item) => item.key === activeTab.value)?.label || '功能概览')
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">场控使用指南</h1>
      <p class="mt-1 text-sm text-slate-500">覆盖用户级/持仓级场控、实操场景与高频问题</p>
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

      <div v-if="activeTab === 'overview'" class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <section class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-xl font-semibold text-slate-900">什么是场控</h3>
          <p class="mt-3">{{ deliveryOverview.intro }}</p>
          <p class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700">{{ deliveryOverview.warning }}</p>
        </section>

        <div class="grid gap-4 lg:grid-cols-2">
          <section v-for="scope in deliveryControlScopes" :key="scope.title" class="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 class="text-lg font-semibold text-slate-900">{{ scope.title }}</h3>
            <ul class="mt-3 space-y-1">
              <li v-for="point in scope.points" :key="point">- {{ point }}</li>
            </ul>
          </section>
        </div>
      </div>

      <div v-else-if="activeTab === 'terms'" class="mt-4 space-y-4">
        <section
          v-for="section in deliveryTermSections"
          :key="section.title"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <h3 class="text-lg font-semibold text-slate-900">{{ section.title }}</h3>
          <div class="mt-3 space-y-3">
            <article v-for="term in section.items" :key="term.zh" class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xl font-semibold text-slate-900">{{ term.zh }}</p>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-sm text-slate-600">{{ term.en }}</span>
              </div>
              <p class="mt-2 text-sm leading-7 text-slate-600">{{ term.desc }}</p>
            </article>
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'operations'" class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <section v-for="item in deliveryOperationGuide" :key="item.title" class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-lg font-semibold text-slate-900">{{ item.title }}</h3>
          <ol class="mt-3 space-y-1">
            <li v-for="(step, idx) in item.steps" :key="step">{{ idx + 1 }}. {{ step }}</li>
          </ol>
        </section>
      </div>

      <div v-else-if="activeTab === 'examples'" class="mt-4 space-y-4 text-sm leading-7 text-slate-700">
        <section v-for="scene in deliveryScenarios" :key="scene.title" class="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 class="text-lg font-semibold text-slate-900">{{ scene.title }}</h3>
          <p class="mt-2">场景描述：{{ scene.desc }}</p>

          <div v-if="scene.calc?.length" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700">
            <p class="font-medium">计算过程</p>
            <p v-for="line in scene.calc" :key="line">- {{ line }}</p>
          </div>

          <div class="mt-3">
            <p class="font-medium text-slate-800">操作步骤</p>
            <ol class="mt-1 space-y-1">
              <li v-for="(step, idx) in scene.steps" :key="step">{{ idx + 1 }}. {{ step }}</li>
            </ol>
          </div>

          <p class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            预期效果：{{ scene.expected }}
          </p>
        </section>
      </div>

      <div v-else class="mt-4 space-y-3 text-sm leading-7 text-slate-700">
        <section v-for="item in deliveryFaqs" :key="item.q" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p class="font-medium text-slate-900">Q: {{ item.q }}</p>
          <p class="mt-1">A: {{ item.a }}</p>
        </section>
      </div>
    </article>
  </section>
</template>
