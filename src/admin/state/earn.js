import { reactive } from 'vue'
import { createEarnAdminState } from '../domain/earn.js'
// Independent admin prototype. No API writes or mutations to the public-site mock store.
export const earnAdmin = reactive(createEarnAdminState())
