// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) for the mock authenticator binding, so a real authenticator app can be used
// against the prototype. Web Crypto only (browser and Node 18+).
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Random base32 secret (default 160 bits → 32 characters). */
export function randomSecret(bytes = 20) {
  const data = crypto.getRandomValues(new Uint8Array(bytes))
  let bits = '', out = ''
  for (const byte of data) bits += byte.toString(2).padStart(8, '0')
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  return out
}

function decode(secret) {
  let bits = ''
  for (const char of secret.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) throw new Error('invalid base32')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return bytes
}

/** The 6-digit code for `secret` at `time` (ms). */
export async function totp(secret, time = Date.now(), step = 30) {
  const counter = Math.floor(time / 1000 / step)
  const message = new Uint8Array(8)
  new DataView(message.buffer).setUint32(4, counter >>> 0)
  new DataView(message.buffer).setUint32(0, Math.floor(counter / 2 ** 32))
  const key = await crypto.subtle.importKey('raw', decode(secret), {name: 'HMAC', hash: 'SHA-1'}, false, ['sign'])
  const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, message))
  const offset = hash[hash.length - 1] & 15
  const value = ((hash[offset] & 127) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3]
  return String(value % 1e6).padStart(6, '0')
}

/** True when `code` matches the current, previous or next 30 s window. */
export async function verifyTotp(secret, code, time = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return false
  for (const drift of [0, -1, 1]) if (await totp(secret, time + drift * 30000) === String(code)) return true
  return false
}

/** otpauth:// URI that authenticator apps read from the QR code. */
export const otpauthUri = ({issuer, account, secret}) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
