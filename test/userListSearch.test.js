import test from 'node:test'
import assert from 'node:assert/strict'
import { getUsers } from '../src/admin/mock/user.js'

test('filters users by onchain wallet address as an independent query field', async () => {
  const result = await getUsers({
    page: 1,
    pageSize: 10,
    walletAddressKeyword: '0x7A4e9C2D5f18B6a3'
  })

  assert.equal(result.total, 1)
  assert.deepEqual(result.list.map((user) => user.id), ['user_1004'])
})

test('filters users by id, phone, and email as independent query fields', async () => {
  const byId = await getUsers({
    page: 1,
    pageSize: 10,
    userIdKeyword: 'user_1004'
  })
  const byPhone = await getUsers({
    page: 1,
    pageSize: 10,
    phoneKeyword: '8613800001004'
  })
  const byEmail = await getUsers({
    page: 1,
    pageSize: 10,
    emailKeyword: 'chen@example.com'
  })

  assert.deepEqual(byId.list.map((user) => user.id), ['user_1004'])
  assert.deepEqual(byPhone.list.map((user) => user.id), ['user_1004'])
  assert.deepEqual(byEmail.list.map((user) => user.id), ['user_1004'])
})

test('combines independent user and wallet filters with AND semantics', async () => {
  const result = await getUsers({
    page: 1,
    pageSize: 10,
    emailKeyword: 'wang@agent.com',
    walletAddressKeyword: '0x7A4e9C2D5f18B6a3'
  })

  assert.equal(result.total, 0)
  assert.deepEqual(result.list, [])
})
