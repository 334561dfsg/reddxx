import { userDepositExcel } from './depositExcel.js'

// Prototype task service. Replace with the backend task API when available.
export function createDepositExportTasks({ storage, schedule = callback => setTimeout(callback, 800), generate = userDepositExcel } = {}) {
  const key = 'admin-deposit-export-tasks-v1'
  let tasks = []
  const listeners = new Set()
  try { tasks = JSON.parse(storage?.getItem(key) || '[]') } catch { tasks = [] }
  if (!Array.isArray(tasks)) tasks = []
  const list = () => tasks.map(({ snapshot, csv, ...task }) => ({ ...task }))
  function publish() {
    storage?.setItem(key, JSON.stringify(tasks))
    listeners.forEach(listener => listener(list()))
  }
  function run(task) {
    schedule(async () => {
      try {
        task.csv = await generate(task.snapshot)
        task.status = 'succeeded'
        task.error = ''
        task.completedAt = new Date().toISOString()
        publish()
      } catch (error) {
        task.status = 'failed'
        task.csv = ''
        task.error = error.message || '文件生成失败'
        try { publish() } catch { listeners.forEach(listener => listener(list())) }
      }
    })
  }
  for (const task of tasks) if (task.status === 'running') run(task)
  return {
    list,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    create(report) {
      if (!report?.rows.length) throw new Error('当前没有可导出的充值记录')
      const snapshot = JSON.parse(JSON.stringify(report))
      const identity = JSON.stringify({ filters: snapshot.filters, rows: snapshot.rows })
      const existing = tasks.find(task => task.status === 'running' && task.identity === identity)
      if (existing) return existing.id
      const task = {
        id: `DP-${globalThis.crypto.randomUUID()}`, identity, snapshot,
        createdAt: new Date().toISOString(), completedAt: '', status: 'running', error: '', csv: '', format: 'xlsx',
        filename: `用户充值报表-${snapshot.filters.startDate}-${snapshot.filters.endDate}.xlsx`,
        count: snapshot.rows.length,
        range: `${snapshot.filters.startDate} 至 ${snapshot.filters.endDate}`,
        scope: `${snapshot.userTypeLabel || '全部类型'} · ${snapshot.agentLabel} · ${snapshot.employeeLabel}${snapshot.filters.keyword ? ` · ${snapshot.filters.keyword}` : ''}`
      }
      tasks.unshift(task)
      try { publish() } catch { tasks.shift(); throw new Error('任务保存失败，请检查浏览器存储空间后重试') }
      run(task)
      return task.id
    },
    retry(id) {
      const task = tasks.find(item => item.id === id)
      if (!task || task.status !== 'failed') return
      task.status = 'running'
      task.error = ''
      try { publish() } catch { task.status = 'failed'; throw new Error('任务保存失败，请重试') }
      run(task)
    },
    download(id) {
      const task = tasks.find(item => item.id === id)
      if (!task || task.status !== 'succeeded' || !task.csv) throw new Error('文件尚未生成成功')
      return { filename: task.filename, csv: task.csv, format: task.format || 'csv' }
    }
  }
}
let service
export function getDepositExportTasks() {
  if (!service) service = createDepositExportTasks({ storage: window.sessionStorage })
  return service
}
