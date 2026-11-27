import {
  createDialogCloseAction,
  useDialogContentSnapshot,
  useDialogLifecycle as useRealDialogLifecycle
} from '../../src/admin/composables/useDialogLifecycle.js'

let latestLifecycle = null

export { createDialogCloseAction, useDialogContentSnapshot }

export const useDialogLifecycle = (options) => {
  latestLifecycle = useRealDialogLifecycle(options)
  return latestLifecycle
}

export const getLatestDialogLifecycle = () => latestLifecycle
