import { computed, nextTick, ref, watch } from 'vue'
import { useDialogContentSnapshot, useDialogLifecycle } from './useDialogLifecycle.js'

export const useMfaVerification = (props, emit) => {
  const verificationCode = ref('')
  const localError = ref('')
  const verifyRequested = ref(false)
  const dialogRef = ref(null)
  const verificationInput = ref(null)
  const errorSummary = ref(null)
  const errorMessage = computed(() => localError.value || props.error)
  const closeDisabled = computed(() => props.loading || verifyRequested.value)

  const {
    rendered,
    phase,
    layerStyle,
    requestDialogClose,
    onAfterEnter,
    onAfterLeave
  } = useDialogLifecycle({
    open: computed(() => props.open),
    dialogRef,
    initialFocusRef: verificationInput,
    returnFocusRef: computed(() => props.returnFocus),
    closeDisabled,
    requestClose: () => {
      emit('cancel')
      emit('update:open', false)
    }
  })

  const dialogSource = computed(() => ({
    title: props.title,
    description: props.description,
    loading: props.loading,
    errorMessage: errorMessage.value,
    verifyRequested: verifyRequested.value
  }))
  const { content: displayedDialog } = useDialogContentSnapshot({
    open: computed(() => props.open),
    phase,
    source: dialogSource,
    clone: (content) => ({ ...content })
  })

  watch(() => props.open, (isOpen) => {
    if (!isOpen) return
    verificationCode.value = ''
    localError.value = ''
    verifyRequested.value = false
  })

  watch(() => props.loading, (loading, wasLoading) => {
    if (wasLoading && !loading) verifyRequested.value = false
  })

  watch([() => props.error, () => props.errorAttempt], async ([message]) => {
    if (!message || !props.open) return
    if (!props.loading) verifyRequested.value = false
    await nextTick()
    errorSummary.value?.focus()
  })

  const showValidationError = async (message) => {
    localError.value = message
    await nextTick()
    errorSummary.value?.focus()
  }

  const handleVerify = async () => {
    if (props.loading || verifyRequested.value) return false
    if (phase.value !== 'open') return false

    if (!verificationCode.value) {
      await showValidationError('请输入验证码')
      return false
    }

    if (verificationCode.value.length !== 6) {
      await showValidationError('验证码必须是 6 位数字')
      return false
    }

    localError.value = ''
    verifyRequested.value = true
    emit('verify', verificationCode.value)
    return true
  }

  const handleCancel = () => {
    if (props.loading || verifyRequested.value) return false
    return requestDialogClose()
  }

  const close = () => handleCancel()

  return {
    close,
    displayedDialog,
    dialogRef,
    errorMessage,
    errorSummary,
    handleCancel,
    handleVerify,
    layerStyle,
    localError,
    onAfterEnter,
    onAfterLeave,
    phase,
    rendered,
    requestDialogClose,
    verificationCode,
    verificationInput,
    verifyRequested
  }
}
