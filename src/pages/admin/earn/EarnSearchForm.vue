<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Button, Card, Col, Form, FormItem, Input, InputNumber, RangePicker, Row, Select, Space } from 'ant-design-vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'

// Vue adapter for the ProTable query-card pattern; keeps draft input separate
// from applied list filters and uses the application's Ant Design theme.
// Field kinds: text (default), `options` → Select (`searchable: true` filters options by typed label), `range: true` → date RangePicker with 'YYYY-MM-DD' strings (null when empty),
// `numberRange: true` → two InputNumbers stored as [min, max] (null ends are open; 2026-11-28).
// Optional per field: `placeholder` (text inputs) and `default` (the value 重置 restores, e.g. a select that hides deleted rows).
// Like ProTable, more than one row of fields (five at the widest breakpoint) collapses to the first row behind 展开/收起.
const props = defineProps({
  model: { type: Object, required: true },
  fields: { type: Array, required: true },
  name: { type: String, required: true },
})
const emit = defineEmits(['search', 'reset'])
const emptyValue = field => field.default !== undefined ? (Array.isArray(field.default) ? [...field.default] : field.default) : field.options ? 'all' : field.range ? null : field.numberRange ? [null, null] : ''
// Array values (date and number ranges) are copied in and out, so the draft never shares an array with the applied
// filters: editing a range bound must not filter the list before 查询.
const copy = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Array.isArray(item) ? [...item] : item]))
const draft = reactive(copy(props.model))
for (const field of props.fields) if (field.numberRange && !Array.isArray(draft[field.key])) draft[field.key] = [null, null]
watch(() => props.model, value => Object.assign(draft, copy(value)))
const collapsible = computed(() => props.fields.length > 5)
const expanded = ref(false)
const visibleFields = computed(() => (collapsible.value && !expanded.value ? props.fields.slice(0, 2) : props.fields))
function reset() {
  for (const field of props.fields) draft[field.key] = emptyValue(field)
  emit('reset')
}
</script>

<template>
  <Card :bordered="false" :body-style="{paddingBottom:0}">
    <Form :name="name" :model="draft" layout="horizontal" :label-col="{flex:'96px'}" :wrapper-col="{flex:'1 1 0'}" label-align="right" label-wrap :required-mark="false" @finish="emit('search', copy(draft))">
      <Row :gutter="24">
        <Col v-for="field in visibleFields" :key="field.key" :xs="24" :md="12" :xl="8">
          <FormItem :name="field.key" :label="field.label">
            <RangePicker v-if="field.range" v-model:value="draft[field.key]" value-format="YYYY-MM-DD" :placeholder="['开始日期', '结束日期']" :aria-label="field.label" allow-clear class="earn-query-range" />
            <Space.Compact v-else-if="field.numberRange" class="earn-query-range">
              <InputNumber v-model:value="draft[field.key][0]" :min="field.min" placeholder="最小值" :aria-label="field.label + '最小值'" class="earn-query-number" />
              <InputNumber v-model:value="draft[field.key][1]" :min="field.min" placeholder="最大值" :aria-label="field.label + '最大值'" class="earn-query-number" />
            </Space.Compact>
            <Select v-else-if="field.options" v-model:value="draft[field.key]" :options="field.options" :aria-label="field.label" :show-search="!!field.searchable" option-filter-prop="label" :not-found-content="field.searchable ? '无匹配项' : undefined" />
            <Input v-else v-model:value="draft[field.key]" :placeholder="field.placeholder || '请输入'+field.label" :aria-label="field.label" allow-clear />
          </FormItem>
        </Col>
        <Col :xs="24" :md="12" :xl="8" class="earn-query-actions">
          <FormItem>
            <Space :size="8" wrap>
              <Button @click="reset">重置</Button>
              <Button type="primary" html-type="submit">查询</Button>
              <Button v-if="collapsible" type="link" :aria-expanded="expanded" @click="expanded = !expanded">{{ expanded ? '收起' : '展开' }}<UpOutlined v-if="expanded" /><DownOutlined v-else /></Button>
            </Space>
          </FormItem>
        </Col>
      </Row>
    </Form>
  </Card>
</template>
<style scoped>
.earn-query-actions{margin-left:auto;text-align:right}
.earn-query-range{width:100%}
.earn-query-number{flex:1;width:50%}
/* Let range pickers and number pairs shrink inside the control column instead of wrapping under the label. */
:deep(.ant-form-item-control){min-width:0}
:deep(.ant-picker-range){width:100%;min-width:0}
</style>
