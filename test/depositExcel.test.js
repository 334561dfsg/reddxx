import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { userDepositExcel } from '../src/features/user-staff/depositExcel.js'

test('generates a readable xlsx workbook with numeric amounts and literal user text', async () => {
  const base64 = await userDepositExcel({ rows: [{ orderId: 'dp_1', userId: 'user_1', nickname: '=1+1', userType: 'salesperson', coin: 'BTC', amount: 0.00012345, usdtValue: 12.1, status: 'credited' }] })
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(Buffer.from(base64, 'base64'))
  const sheet = book.getWorksheet('用户充值报表')
  assert.equal(sheet.rowCount, 2)
  assert.equal(sheet.getCell('D2').value, '业务员')
  assert.equal(sheet.getCell('K2').numFmt, '0.00######')
  assert.equal(sheet.getCell('L2').numFmt, '0.00')
  assert.equal(sheet.autoFilter, 'A1:N1')
  assert.equal(sheet.getCell('E2').value, '=1+1')
  assert.equal(sheet.getCell('K2').value, 0.00012345)
  assert.equal(sheet.getCell('M2').value, '审核成功')
})
