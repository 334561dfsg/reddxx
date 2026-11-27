<script setup>
// 规则触发历史 — Ant Design Pro list (2026-11-28): query card (one field per filter; the old 用户名/用户 ID keyword box is
// split), table card with text result Tags and right-aligned counts.
import { ref, computed } from 'vue'
import { Space, Tag, TypographyText } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { createRuleHitHistoryMock } from '../../../admin/mock/deliveryControl'

const hitHistory = ref(createRuleHitHistoryMock())
const page = ref(1)

// 获取唯一的规则列表
const uniqueRules = [...new Set(hitHistory.value.map(h => h.ruleName))]

const blankFilters = () => ({ userName: '', userId: '', rule: 'all', result: 'all', triggerDate: null })
const filters = ref(blankFilters())
const queryFields = [
  { key: 'userName', label: '用户名' },
  { key: 'userId', label: '用户 ID' },
  { key: 'rule', label: '规则', searchable: true, options: [{ value: 'all', label: '全部规则' }, ...uniqueRules.map((value) => ({ value, label: value }))] },
  { key: 'result', label: '结果', options: [{ value: 'all', label: '全部结果' }, { value: 'success', label: '成功' }, { value: 'failed', label: '失败' }] },
  { key: 'triggerDate', label: '触发日期', range: true }
]

const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const filteredHistory = computed(() => {
  const f = filters.value
  return hitHistory.value.filter(h => {
    const day = String(h.triggerTime || '').slice(0, 10)
    return has(h.userName, f.userName) && has(h.userId, f.userId) &&
      (f.rule === 'all' || h.ruleName === f.rule) &&
      (f.result === 'all' || h.result === f.result) &&
      (!f.triggerDate || (day >= f.triggerDate[0] && day <= f.triggerDate[1]))
  })
})

const columns = [
  { key: 'triggerTime', title: '触发时间', width: 170 },
  { key: 'ruleName', title: '规则', width: 180 },
  { key: 'user', title: '用户', width: 140 },
  { key: 'triggerValue', title: '触发值', width: 180 },
  { key: 'action', title: '执行动作', width: 260 },
  { key: 'operator', title: '操作人', width: 120 },
  { key: 'result', title: '结果', width: 80 },
  { key: 'affectedPositions', title: '影响持仓（笔）', width: 130, align: 'right' }
]

function search(values) { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
function reset() { filters.value = blankFilters(); page.value = 1 }
</script>

<template>
  <PageShell>
    <SearchForm name="delivery-rule-history-filters" :model="filters" :fields="queryFields" @search="search" @reset="reset" />
    <AdminTable title="规则触发历史" v-model:page="page" :rows="filteredHistory" :columns="columns" row-key="id" desktop-only>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'ruleName'" strong>{{ record.ruleName }}</TypographyText>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ record.userName }}</span>
          <TypographyText type="secondary" class="font-mono">{{ record.userId }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'result'" :color="record.result === 'success' ? 'green' : 'red'">{{ record.result === 'success' ? '成功' : '失败' }}</Tag>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>
</template>
