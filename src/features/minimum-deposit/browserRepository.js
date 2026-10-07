import { createMinimumDepositRepository } from './model.js'

export const MINIMUM_DEPOSIT_CHANGED = 'fex:minimum-deposit-changed'
const repository = createMinimumDepositRepository(() => window.localStorage)
export const browserMinimumDepositRepository = {
  read: repository.read,
  save(value, expected) {
    const result = repository.save(value, expected)
    window.dispatchEvent(new Event(MINIMUM_DEPOSIT_CHANGED))
    return result
  }
}
