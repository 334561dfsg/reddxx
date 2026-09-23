export function generateUserPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?']
  const pick = max => {
    const limit = 256 - (256 % max)
    const bytes = new Uint8Array(1)
    do { globalThis.crypto.getRandomValues(bytes) } while (bytes[0] >= limit)
    return bytes[0] % max
  }
  const alphabet = groups.join('')
  const chars = groups.map(group => group[pick(group.length)])
  while (chars.length < 16) chars.push(alphabet[pick(alphabet.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = pick(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export function userCredentialText(email, password) {
  return `账号：${email}\n密码：${password}`
}
