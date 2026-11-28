import {bootAt,DAY,HOUR} from './clock.js'

// 客服 chat history mock (user reference, 2026-11-28): a short earlier conversation so the chat opens with content.
// Texts are locale keys; dates are relative to page load. In-memory only, never sent or persisted.
export const seedSupportMessages = () => [
  {id: 'SC-SEED-1', from: 'agent', key: 'customerService.mock.greeting', createdAt: bootAt - 3 * DAY - 2 * HOUR},
  {id: 'SC-SEED-2', from: 'user', key: 'customerService.mock.question', createdAt: bootAt - 3 * DAY - 2 * HOUR + 60000},
  {id: 'SC-SEED-3', from: 'agent', key: 'customerService.mock.answer', createdAt: bootAt - 3 * DAY - 2 * HOUR + 180000},
  {id: 'SC-SEED-4', from: 'user', key: 'customerService.mock.thanks', createdAt: bootAt - 3 * DAY - 2 * HOUR + 240000},
]
