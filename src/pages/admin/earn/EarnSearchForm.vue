<script setup>
import { reactive, watch } from 'vue'
import { Button, Card, Col, Form, FormItem, Input, Row, Select, Space } from 'ant-design-vue'

// Vue adapter for the ProTable query-card pattern; keeps draft input separate
// from applied list filters and uses the application's Ant Design theme.
const props = defineProps({
  model: { type: Object, required: true },
  fields: { type: Array, required: true },
  name: { type: String, required: true },
})
const emit = defineEmits(['search', 'reset'])
const draft = reactive({ ...props.model })
watch(() => props.model, value => Object.assign(draft, value))
function reset() {
  for (const field of props.fields) draft[field.key] = field.options ? 'all' : ''
  emit('reset')
}
</script>

<template>
  <Card :bordered="false" :body-style="{paddingBottom:0}">
    <Form :name="name" :model="draft" layout="horizontal" :label-col="{flex:'80px'}" :wrapper-col="{flex:1}" label-align="right" label-wrap :required-mark="false" @finish="emit('search', {...draft})">
      <Row :gutter="24">
        <Col v-for="field in fields" :key="field.key" :xs="24" :md="12" :xl="8">
          <FormItem :name="field.key" :label="field.label">
            <Select v-if="field.options" v-model:value="draft[field.key]" :options="field.options" :aria-label="field.label" />
            <Input v-else v-model:value="draft[field.key]" :placeholder="'请输入'+field.label" :aria-label="field.label" allow-clear />
          </FormItem>
        </Col>
        <Col :xs="24" :md="12" :xl="8" class="earn-query-actions">
          <FormItem>
            <Space :size="8" wrap>
              <Button @click="reset">重置</Button>
              <Button type="primary" html-type="submit">查询</Button>
            </Space>
          </FormItem>
        </Col>
      </Row>
    </Form>
  </Card>
</template>
<style scoped>
.earn-query-actions{margin-left:auto;text-align:right}
</style>
