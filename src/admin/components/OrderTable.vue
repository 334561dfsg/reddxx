<script setup>
import { Table, Tag } from 'ant-design-vue'
defineProps({ orders: { type: Array, default: () => [] } })
const columns = [
  { title: '订单号', dataIndex: 'id', key: 'id' },
  { title: '客户', dataIndex: 'customer', key: 'customer' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '日期', dataIndex: 'date', key: 'date' }
]
const statusColor = { Paid: 'green', Pending: 'orange', Shipped: 'blue', Refunded: 'red' }
</script>
<template>
  <Table :columns="columns" :data-source="orders" row-key="id" size="small" :pagination="false" :scroll="{ x: 'max-content' }">
    <template #bodyCell="{ column, record }">
      <Tag v-if="column.key === 'status'" :color="statusColor[record.status]">{{ record.status }}</Tag>
      <span v-else-if="column.key === 'amount'" class="font-mono">{{ record.amount }}</span>
      <span v-else>{{ record[column.dataIndex] }}</span>
    </template>
  </Table>
</template>
