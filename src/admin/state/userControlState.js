import { ref } from 'vue'
import { createUserControlDemoSeed } from '../mock/userControl.js'
import {
  applyModuleControl,
  applyUnifiedControl,
  cancelModuleControl,
  cancelUnifiedControl,
  consumeModuleControl
} from '../../features/user-control/userControl.js'

export const userControlState = ref(createUserControlDemoSeed())

export const setUnifiedUserControl = (payload) => {
  userControlState.value = applyUnifiedControl(userControlState.value, payload)
}

export const setModuleUserControl = (payload) => {
  userControlState.value = applyModuleControl(userControlState.value, payload)
}

export const cancelUnifiedUserControl = (payload) => {
  userControlState.value = cancelUnifiedControl(userControlState.value, payload)
}

export const cancelSingleModuleControl = (payload) => {
  userControlState.value = cancelModuleControl(userControlState.value, payload)
}

export const simulateUserControlExecution = (payload) => {
  userControlState.value = consumeModuleControl(userControlState.value, payload)
}

export const setUserControlFailureModule = (moduleKey = '') => {
  userControlState.value = { ...userControlState.value, failureModule: moduleKey }
}

export const resetUserControlDemo = () => {
  userControlState.value = createUserControlDemoSeed()
}
