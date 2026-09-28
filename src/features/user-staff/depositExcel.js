import { depositReportStatus, userReportTime } from './userDepositReport.js'

export async function userDepositExcel(report) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('用户充值报表', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = [
    ['充值单号', 22], ['充值时间（UTC+8）', 23], ['用户 ID', 18], ['用户昵称', 22],
    ['代理 ID', 18], ['代理邮箱', 28], ['业务员 ID', 18], ['业务员邮箱', 28],
    ['币种', 12], ['充值金额', 20], ['折合 USDT', 20], ['充值状态', 15], ['入账时间（UTC+8）', 23]
  ].map(([header, width]) => ({ header, width }))
  for (const row of report.rows) {
    sheet.addRow([row.orderId, userReportTime(row.submitTime), row.userId, row.nickname,
      row.agentId || '未分配', row.agentEmail || '—', row.employeeId || '未分配', row.employeeEmail || '—',
      row.coin, row.amount, row.usdtValue ?? '—', depositReportStatus(row.status), userReportTime(row.creditedTime)])
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1677FF' } }
  sheet.getRow(1).height = 26
  sheet.getColumn(10).numFmt = '0.00######'
  sheet.getColumn(11).numFmt = '0.00'
  sheet.autoFilter = 'A1:M1'
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(binary)
}
