import {
  useDialogContentSnapshot,
  useDialogLifecycle as useRealDialogLifecycle
} from '../../src/admin/composables/useDialogLifecycle.js'

let latestLifecycle = null

export { useDialogContentSnapshot }

export const useDialogLifecycle = (options) => {
  latestLifecycle = useRealDialogLifecycle(options)
  return latestLifecycle
}

export const getLatestDialogLifecycle = () => latestLifecycle
