import { computed, ref, watch } from 'vue'
import { useAgentAuthStore } from '../stores/agentAuth.js'
import { getUserStaffRepository } from '../admin/repositories/userStaffRepository.js'

/** Both report pages share one role/owner/filter snapshot. */
export function useAgentReportScope() {
  const auth = useAgentAuthStore()
  const employeeFilter = ref('')
  const revision = ref(0)
  const isAgent = computed(() => auth.role === 'agent')
  watch(() => [auth.role, auth.userId, auth.agentId], () => { employeeFilter.value = '' }, { flush:'sync' })
  const report = computed(() => {
    revision.value
    try {
      if (!auth.agentId || !['agent','salesperson'].includes(auth.role)) return { options:[], rows:[], error:'' }
      const repo = getUserStaffRepository()
      const options = isAgent.value ? repo.employees(auth.agentId).map(u => ({ value:u.id, label:`${u.username || u.email} · ${u.id.replace(/^user_/, '')}` })) : []
      const employeeId = isAgent.value ? employeeFilter.value : auth.userId
      if (!isAgent.value && !employeeId) return { options:[], rows:[], error:'账号关联异常，请重新登录' }
      return { options, rows:repo.dailyReport({ agentId:auth.agentId, employeeId }), error:'' }
    } catch (error) {
      return { options:[], rows:[], error:error.message || '数据加载失败，请重试' }
    }
  })
  return {
    isAgent, employeeFilter,
    employeeOptions:computed(() => report.value.options),
    dailyRows:computed(() => report.value.rows),
    reportError:computed(() => report.value.error),
    retryReport:() => { revision.value++ }
  }
}
