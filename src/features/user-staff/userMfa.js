import QRCode from 'qrcode'

export async function createSalespersonMfa(email) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const secret = Array.from(bytes, byte => alphabet[byte % 32]).join('')
  const issuer = 'FEX Sales'
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  const svg = await QRCode.toString(otpauthUrl, { type:'svg', errorCorrectionLevel:'M', margin:4, width:180 })
  return { issuer, accountName:email, secret, otpauthUrl, status:'pending', qrCodeUrl:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` }
}

export function salespersonDelivery(email, password, mfaSetup) {
  return {
    email, password, mfaSetup,
    message: [`账号：${email}`, `密码：${password}`, `MFA 密钥：${mfaSetup.secret}`, 'MFA 二维码：见下方截图区域', '请使用验证器扫描二维码或手动输入密钥添加账号。'].join('\n')
  }
}
