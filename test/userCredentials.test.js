import test from 'node:test'
import assert from 'node:assert/strict'
import { generateUserPassword, userCredentialText } from '../src/features/user-staff/userCredentials.js'

test('generated initial passwords contain all four character groups and vary between calls', () => {
  const passwords = Array.from({ length: 32 }, generateUserPassword)
  for (const password of passwords) {
    assert.equal(password.length, 16)
    for (const group of [/[A-Z]/, /[a-z]/, /[0-9]/, /[!@#$%&*?]/]) assert.match(password, group)
  }
  assert.equal(new Set(passwords).size, passwords.length)
})

test('credential delivery contains only account and password', () => {
  assert.equal(userCredentialText('demo@example.com', 'Example123!'), '账号：demo@example.com\n密码：Example123!')
})
