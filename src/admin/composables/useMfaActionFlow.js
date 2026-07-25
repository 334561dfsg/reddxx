import { ref } from 'vue'

export const useMfaActionFlow = ({ execute, onSuccess } = {}) => {
  const open = ref(false)
  const loading = ref(false)
  const error = ref('')
  const errorAttempt = ref(0)
  const pendingAction = ref(null)

  const request = (action) => {
    if (loading.value) return false
    pendingAction.value = action
    error.value = ''
    errorAttempt.value = 0
    open.value = true
    return true
  }

  const openPending = () => {
    if (loading.value || !pendingAction.value) return false
    error.value = ''
    errorAttempt.value = 0
    open.value = true
    return true
  }

  const verify = async (code) => {
    if (loading.value || !pendingAction.value) return false
    loading.value = true
    try {
      await execute?.(pendingAction.value, code)
      open.value = false
      pendingAction.value = null
      error.value = ''
      onSuccess?.()
      return true
    } catch (failure) {
      error.value = `验证失败：${failure?.message || '操作未完成，请重试'}`
      errorAttempt.value += 1
      return false
    } finally {
      loading.value = false
    }
  }

  const cancel = () => {
    if (loading.value) return false
    pendingAction.value = null
    open.value = false
    return true
  }

  return {
    cancel,
    error,
    errorAttempt,
    loading,
    open,
    openPending,
    pendingAction,
    request,
    verify
  }
}
