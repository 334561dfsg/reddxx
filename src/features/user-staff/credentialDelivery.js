export function salespersonDelivery(email, password) {
  return { email, password, message: [`账号：${email}`, `密码：${password}`].join('\n') }
}
