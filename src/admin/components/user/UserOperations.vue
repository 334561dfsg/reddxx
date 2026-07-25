<script setup>
import { ref } from 'vue'
import UserFreezeAction from './UserFreezeAction.vue'
import UserDepositAction from './UserDepositAction.vue'
import UserTransferAction from './UserTransferAction.vue'
import UserAdjustAction from './UserAdjustAction.vue'

const props = defineProps({
  user: { type: Object, required: true },
  assets: { type: Object, default: null },
  showTriggers: { type: Boolean, default: true }
})

const emit = defineEmits(['submit'])
const freezeAction = ref(null)
const adjustAction = ref(null)
const depositAction = ref(null)
const transferAction = ref(null)

const open = (action, returnFocus = null) => ({
  freeze: freezeAction,
  adjust: adjustAction,
  deposit: depositAction,
  transfer: transferAction
})[action]?.value?.open(returnFocus)

defineExpose({ open })
</script>

<template>
  <div class="pt-1 grid grid-cols-2 gap-2 flex-shrink-0" :class="showTriggers ? '' : 'hidden'">
    <UserFreezeAction ref="freezeAction" :user="user" :show-trigger="showTriggers" @submit="emit('submit', $event)" />
    <UserAdjustAction ref="adjustAction" :user="user" :show-trigger="showTriggers" @submit="emit('submit', $event)" />
    <UserDepositAction ref="depositAction" :user="user" :assets="assets" :show-trigger="showTriggers" @submit="emit('submit', $event)" />
    <UserTransferAction ref="transferAction" :user="user" :assets="assets" :show-trigger="showTriggers" @submit="emit('submit', $event)" />
  </div>
</template>
