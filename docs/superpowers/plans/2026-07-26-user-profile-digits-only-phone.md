# User Profile Digits-Only Phone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/admin/users/list` profile editor accept only an optional 7–30 digit phone value, with an optional country/region code written continuously without separators.

**Architecture:** Keep `validateProfile(input, userId)` as the single business-validation boundary and replace its permissive international-text pattern with a digits-only pattern. Align editable mock user values with the new contract, and add mobile numeric-keyboard hints to the existing telephone input without creating a second validation implementation in the component.

**Tech Stack:** Vue 3, JavaScript ES modules, Node.js built-in test runner, Vite.

## Global Constraints

- Phone remains optional.
- A non-empty phone must contain 7–30 ASCII digits only.
- Country or region code is optional and, when supplied, is contiguous with the local number.
- `+`, spaces, parentheses, and hyphens are invalid.
- Duplicate detection compares the complete trimmed digit string exactly and excludes the current user.
- Preserve the current Dialog submission, error, focus, close, and responsive behavior.
- Do not modify unrelated dirty-worktree files.

---

### Task 1: Enforce and expose the digits-only phone contract

**Files:**
- Modify: `test/userRelationshipRepository.test.js:41-70`
- Modify: `test/userRelationshipComponents.test.js`
- Modify: `src/admin/repositories/userRelationshipRepository.js:86-105`
- Modify: `src/admin/mock/user.js:1-10`
- Modify: `src/admin/components/user/UserProfileEditDialog.vue:119-122`

**Interfaces:**
- Consumes: `validateProfile(input, userId) -> Record<string, string>` and the existing `form.phone` string binding.
- Produces: a `phone` validation error of `手机号格式不正确` for any non-empty value outside `/^\d{7,30}$/`, unchanged exact-string duplicate behavior, digits-only editable mock values, and input hints `inputmode="numeric"`, `pattern="[0-9]*"`, and `maxlength="30"`.

- [ ] **Step 1: Write the failing repository tests**

Add focused coverage that accepts both local and country-code-prefixed continuous digits, rejects every separator style, and retains duplicate detection:

```js
test('profile phone accepts optional 7 to 30 continuous digits', () => {
  for (const phone of ['', '13800001001', '8613800001001', '1234567', '1'.repeat(30)]) {
    const errors = validateProfile({
      username: 'unique_phone_user',
      email: 'unique.phone@example.com',
      phone,
      remark: ''
    }, 'user_1004')
    assert.equal(errors.phone, undefined)
  }
})

test('profile phone rejects non-digits and out-of-range lengths', () => {
  for (const phone of ['+8613800001001', '86 13800001001', '(86)13800001001', '86-13800001001', '123456', '1'.repeat(31)]) {
    const errors = validateProfile({
      username: 'unique_phone_user',
      email: 'unique.phone@example.com',
      phone,
      remark: ''
    }, 'user_1004')
    assert.equal(errors.phone, '手机号格式不正确')
  }
})
```

Update the existing duplicate fixture to use the digits-only value stored by `src/admin/mock/user.js`, and change the successful update fixture to `8613900001004`.

- [ ] **Step 2: Write the failing component contract test**

In `test/userRelationshipComponents.test.js`, assert that the profile phone input retains `type="tel"` and declares numeric input hints and the maximum length:

```js
assert.match(source, /type="tel"[^>]*inputmode="numeric"[^>]*pattern="\[0-9\]\*"[^>]*maxlength="30"/)
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js
```

Expected: FAIL because the repository still accepts formatted phone text, mock values still contain `+86 `, and the telephone input lacks numeric hints.

- [ ] **Step 4: Implement the minimal production changes**

In `src/admin/repositories/userRelationshipRepository.js`, change only the phone format check:

```js
if (phone && !/^\d{7,30}$/.test(phone)) errors.phone = '手机号格式不正确'
```

In `src/admin/mock/user.js`, generate editable user phone values as continuous digits:

```js
phone: `86138${String(id).padStart(8, '0')}`,
```

In `src/admin/components/user/UserProfileEditDialog.vue`, retain `type="tel"` and add:

```html
inputmode="numeric" pattern="[0-9]*" maxlength="30"
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js
```

Expected: all focused tests PASS with no warnings.

- [ ] **Step 6: Run regression verification**

Run:

```bash
npm test
npm run build
```

Expected: the full test suite passes and Vite completes a production build.

- [ ] **Step 7: Perform and report applicable UI checks**

At `/admin/users/list`, open “编辑用户资料” and verify that `13800001001` and `8613800001001` save, while `+8613800001001` and `86 13800001001` show `手机号格式不正确` without closing the Dialog. Verify keyboard submission, error-summary focus, value retention after failure, close controls, and the mobile numeric keyboard where a real touch device is available. Report 200% zoom, low-height viewport, virtual keyboard, safe area, reduced motion, high contrast, and assistive-technology checks as unverified unless actually performed.

- [ ] **Step 8: Commit the implementation**

```bash
git add test/userRelationshipRepository.test.js test/userRelationshipComponents.test.js src/admin/repositories/userRelationshipRepository.js src/admin/mock/user.js src/admin/components/user/UserProfileEditDialog.vue
git commit -m "fix: require digits-only profile phones"
```
