import { ref, watch } from 'vue'
import { createUserControlDemoSeed } from '../mock/userControl.js'
import {
  applyModuleControl,
  applyUnifiedControl,
  cancelModuleControl,
  cancelUnifiedControl,
  consumeModuleControl,
  getUserControlSimulationValues,
  isUserControlSimulationValue,
  USER_CONTROL_MODULES
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

export const watchUserControlSimulationRule = (simulation) => watch(
  [
    () => simulation.userId,
    () => simulation.moduleKey,
    () => userControlState.value.rules[simulation.userId]?.[simulation.moduleKey]?.value,
    () => userControlState.value.rules[simulation.userId]?.[simulation.moduleKey]?.status
  ],
  () => {
    const moduleExists = USER_CONTROL_MODULES.some((module) => module.key === simulation.moduleKey)
    if (!moduleExists) {
      simulation.beforeValue = ''
      simulation.afterValue = ''
      return
    }

    const rule = userControlState.value.rules[simulation.userId]?.[simulation.moduleKey]
    const activeRuleValue = rule?.status === 'active'
      && isUserControlSimulationValue(simulation.moduleKey, rule.value)
      ? rule.value
      : ''
    const values = getUserControlSimulationValues(simulation.moduleKey, activeRuleValue)
    simulation.beforeValue = values.beforeValue
    simulation.afterValue = activeRuleValue
  },
  { immediate: true }
)
