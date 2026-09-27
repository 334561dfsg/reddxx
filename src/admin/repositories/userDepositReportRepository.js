import { usersList } from '../mock/user.js'
import { fundOrderApi } from '../mock/fundOrders.js'
import { getUserStaffRepository } from './userStaffRepository.js'
import { buildUserDepositReport } from '../../features/user-staff/userDepositReport.js'

export async function getUserDepositReport(filters) {
  // Hydrate current agent/salesperson relationships before joining the orders.
  getUserStaffRepository()
  const orders = []
  let total = null
  for (let page = 1; ; page++) {
    const response = await fundOrderApi.listDepositOrders({ page, pageSize: 200 })
    if (!response.success) throw new Error(response.message || '充值订单加载失败，请重试')
    const { list, total: nextTotal } = response.data
    if (total !== null && total !== nextTotal) throw new Error('充值订单已更新，请重新查询')
    total = nextTotal
    orders.push(...list)
    if (orders.length >= total) break
    if (!list.length) throw new Error('充值订单数据不完整，请重新查询')
  }
  if (new Set(orders.map(order => order.id)).size !== orders.length) throw new Error('充值订单重复，请重新查询')
  return buildUserDepositReport(usersList, orders, filters)
}
