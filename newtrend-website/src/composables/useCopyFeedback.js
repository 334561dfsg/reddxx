import {nextTick, shallowRef} from 'vue'

// Copy with a toast per attempt that shows in the current layer (review 2026-11-27): the caller renders
// <FeedbackToast v-if="feedback" :type="feedback.type" :source="() => feedback ? $t(feedback.key) : ''"/> where the
// copy button is, so inside a dialog (e.g. the mobile drawer) the toast follows the dialog's top layer.
export function useCopyFeedback() {
  const feedback = shallowRef(null)
  const announce = (type, key) => { feedback.value = null; nextTick(() => { feedback.value = {type, key} }) }
  async function copy(text) {
    try { await navigator.clipboard.writeText(String(text)); announce('success', 'common.copied') }
    catch { announce('error', 'common.copyFailed') }
  }
  return {feedback, copy}
}
