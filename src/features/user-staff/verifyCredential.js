/** Verify the PBKDF2 credential created by the staff account editor. */
export async function verifyStaffPassword(password, credential) {
  if (credential?.algorithm !== 'PBKDF2-SHA-256' || !Number.isSafeInteger(credential.iterations) || credential.iterations < 1 || credential.iterations > 1000000) return false
  if (!/^[0-9a-f]{32}$/i.test(credential.salt) || !/^[0-9a-f]{64}$/i.test(credential.hash)) return false
  const salt = Uint8Array.from(credential.salt.match(/../g), part => parseInt(part, 16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations:credential.iterations, hash:'SHA-256' }, key, 256)
  const actual = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('')
  return actual === credential.hash.toLowerCase()
}

/** Verify the authenticator issued when a salesperson account is created. */
export async function verifyStaffTotp(secret, code, now = Date.now()) {
  if (!/^[A-Z2-7]+$/.test(secret || '') || !/^\d{6}$/.test(code || '')) return false
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...secret].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('')
  const bytes = Uint8Array.from((bits.match(/.{8}/g) || []), part => parseInt(part, 2))
  const key = await crypto.subtle.importKey('raw', bytes, { name:'HMAC', hash:'SHA-1' }, false, ['sign'])
  for (const offset of [-1, 0, 1]) {
    const counter = new ArrayBuffer(8)
    new DataView(counter).setBigUint64(0, BigInt(Math.floor(now / 30000) + offset))
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
    const start = mac[mac.length - 1] & 15
    const value = ((mac[start] & 127) << 24) | (mac[start+1] << 16) | (mac[start+2] << 8) | mac[start+3]
    if (String(value % 1000000).padStart(6, '0') === code) return true
  }
  return false
}
