<script setup>
defineProps({
  orders: {
    type: Array,
    default: () => []
  }
})

const statusStyle = {
  Paid: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  Pending: 'text-amber-500 bg-amber-50 border-amber-100',
  Shipped: 'text-sky-500 bg-sky-50 border-sky-100',
  Refunded: 'text-rose-500 bg-rose-50 border-rose-100'
}
</script>

<template>
  <div class="overflow-hidden">
    <table class="ant-table border-collapse">
      <thead class="ant-table-thead">
        <tr>
          <th>订单号</th>
          <th>客户</th>
          <th>状态</th>
          <th>金额</th>
          <th>日期</th>
        </tr>
      </thead>
      <tbody class="ant-table-tbody">
        <tr v-for="order in orders" :key="order.id" class="hover:bg-black/[0.01] transition-colors">
          <td class="font-medium text-antd-primary">{{ order.id }}</td>
          <td>{{ order.customer }}</td>
          <td>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded" :class="statusStyle[order.status]">
              <span class="h-1 w-1 rounded-full bg-current"></span>
              {{ order.status }}
            </span>
          </td>
          <td class="font-mono">{{ order.amount }}</td>
          <td class="text-black/45">{{ order.date }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
