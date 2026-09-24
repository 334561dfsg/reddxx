import { createSalespersonMfa } from './userMfa.js'
const STORAGE_KEY = 'fex.user-staff.v1'
const clone = value => JSON.parse(JSON.stringify(value))
const text = value => String(value ?? '').trim()
const BUSINESS_KINDS = ['deposit', 'withdraw', 'spot', 'perpetual', 'delivery', 'wealth', 'ai', 'periodic', 'portfolio', 'borrowing']
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date

export const STAFF_METRIC_GROUPS = [
  { id:'overview', label:'核心指标', columns:[['currentClients','当前客户','count'],['deposit','充值金额'],['withdraw','提现金额'],['net','净入金'],['trading','交易额'],['commission','佣金贡献']] },
  { id:'funds', label:'入金与出金', columns:[['depositPeople','充值人数','count'],['depositOrders','充值笔数','count'],['deposit','充值金额'],['withdrawPeople','提现人数','count'],['withdrawOrders','提现笔数','count'],['withdraw','提现金额'],['net','净入金']] },
  { id:'trading', label:'交易业务', columns:[['tradePeople','交易人数','count'],['tradeOrders','交易笔数','count'],['spot','现货交易额'],['perpetual','永续交易额'],['delivery','交割交易额'],['fee','交易手续费']] },
  { id:'products', label:'产品业务', columns:[['productPeople','参与人数','count'],['productOrders','产品订单','count'],['wealth','理财投入'],['ai','AI量化投入'],['periodic','周期产品投入'],['portfolio','投资组合投入'],['borrowing','借贷金额']] },
  { id:'commission', label:'佣金统计', columns:[['commission','产生佣金'],['settled','已结算佣金'],['pending','待结算佣金'],['depositCommission','充值佣金'],['tradeCommission','交易佣金'],['productCommission','产品佣金']] },
  { id:'customers', label:'客户与转化', columns:[['currentClients','当前客户','count'],['verifiedClients','当前实名客户','count'],['newClients','新增客户','count'],['firstPeople','首充人数','count'],['firstAmount','首充金额'],['averageDeposit','人均充值'],['conversion','新客首充率','percent']] }
]

export function validateNewUser(input, users = []) {
  const email = text(input.email).toLowerCase(), phone = text(input.phone)
  const errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = '请输入有效邮箱，邮箱将作为登录名'
  else if (users.some(u => text(u.email).toLowerCase() === email || text(u.username).toLowerCase() === email)) errors.email = '该邮箱已存在，请使用其他邮箱'
  if (phone && !/^\d{1,4}-\d{6,15}$/.test(phone)) errors.phone = '手机号码格式为区号-号码，例如 86-13600006666'
  if (typeof input.password !== 'string' || input.password.length < 6 || input.password.length > 128) errors.password = '密码长度须为 6–128 位'
  return errors
}

async function passwordCredential(password) {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持安全保存账号，请使用 localhost 或 HTTPS')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const iterations = 600000
  const derived = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations, hash:'SHA-256' }, material, 256)
  const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return { algorithm:'PBKDF2-SHA-256', iterations, salt:hex(salt), hash:hex(new Uint8Array(derived)) }
}

export function createStaffRepository({ users, storage = null, now = () => new Date(), onAudit = () => {} }) {
  let records = [], audit = [], registrations = [], initialized = false
  const getUser = id => users.find(user => user.id === id)
  const requireUser = id => { const user = getUser(id); if (!user) throw new Error('用户不存在'); return user }
  const activeAgent = id => { const agent = requireUser(id); if (agent.role !== 'agent' || agent.status !== 'active') throw new Error('请选择有效且活跃的代理'); return agent }
  const employees = agentId => users.filter(u => u.role === 'user' && u.isSalesperson === true && !u.employeeId && (!agentId || u.agentParentId === agentId))
  const stamp = () => now().toISOString()
  const snapshot = (list = users, nextRecords = records, nextAudit = audit) => ({ version:2, initialized, employees:list.filter(u => u.role === 'user' && u.createdByAdmin === true), links:list.filter(u => u.role === 'user').map(u => ({ id:u.id, agentParentId:u.agentParentId || null, agentParentUsername:u.agentParentUsername || null, employeeId:u.employeeId || null, isSalesperson:u.isSalesperson === true, ...(u.mfaSetup ? {mfaSetup:u.mfaSetup} : {}) })), records:nextRecords, registrations, audit:nextAudit })
  const persist = value => { if (!storage) return; try { storage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { throw new Error('本机保存失败，请检查浏览器存储空间后重试；本次修改未生效') } }
  if (storage) {
    let data
    try { data = storage.getItem(STORAGE_KEY) } catch { throw new Error('无法读取本机员工数据，请检查浏览器存储权限') }
    if (data) {
      let saved
      try { saved = JSON.parse(data) } catch { throw new Error('本机员工数据无法解析，请恢复有效数据后重试') }
      if (![1, 2].includes(saved.version) || !Array.isArray(saved.employees) || !Array.isArray(saved.links) || !Array.isArray(saved.records) || !Array.isArray(saved.registrations) || !Array.isArray(saved.audit)) throw new Error('本机员工数据格式不兼容')
      if (saved.employees.some(e => !e.id || !['employee', 'user'].includes(e.role) || typeof e.username !== 'string') || new Set(saved.employees.map(e => e.id)).size !== saved.employees.length) throw new Error('本机新增用户记录无效')
      // Retire only the three prototype seed accounts, preserving manually added users.
      const demoNames = new Set(['演示员工_张明', '演示员工_李悦', '演示员工_王宁', '演示用户_张明', '演示用户_李悦', '演示用户_王宁'])
      const removedIds = new Set(saved.employees.filter(e => demoNames.has(e.username) && (/^staff_[123]$/.test(e.id) || /^demo\.user_100[13]\.user_100[247]@example\.com$/.test(e.email || ''))).map(e => e.id))
      if (removedIds.size) {
        saved.employees = saved.employees.filter(e => !removedIds.has(e.id))
        saved.links = saved.links.filter(link => !removedIds.has(link.id)).map(link => removedIds.has(link.employeeId) ? { ...link, employeeId:null } : link)
        saved.records = saved.records.filter(record => !removedIds.has(record.customerId) && !(record.id.startsWith('demo-') && removedIds.has(record.employeeId))).map(record => removedIds.has(record.employeeId) ? { ...record, employeeId:'' } : record)
        saved.registrations = saved.registrations.filter(row => !removedIds.has(row.customerId)).map(row => removedIds.has(row.employeeId) ? { ...row, employeeId:'' } : row)
        saved.audit = saved.audit.filter(entry => !removedIds.has(entry.userId))
        persist(saved)
        for (let i = users.length - 1; i >= 0; i--) if (removedIds.has(users[i].id)) users.splice(i, 1)
      }
      saved.employees.forEach(e => { if (!getUser(e.id)) users.unshift({ ...e, role:'user', createdByAdmin:true }) })
      saved.links.forEach(link => { const u = getUser(link.id); if (u && ['user','employee'].includes(u.role)) Object.assign(u, { agentParentId:link.agentParentId, agentParentUsername:link.agentParentUsername, employeeId:link.employeeId, ...(typeof link.isSalesperson === 'boolean' ? { isSalesperson:link.isSalesperson } : {}), ...(link.mfaSetup ? {mfaSetup:link.mfaSetup} : {}) }) })
      records = saved.records; registrations = saved.registrations; audit = saved.audit; initialized = saved.initialized === true
    }
  }
  if (!registrations.length) registrations = users.filter(u => u.role === 'user' && !u.isSalesperson).map(u => ({ customerId:u.id, agentId:u.agentParentId || '', employeeId:u.employeeId || '', date:text(u.registerTime).slice(0,10) }))
  const appendAudit = (kind, user, before, after, reason = '') => ({ id:`staff-log-${stamp()}-${audit.length}`, kind, userId:user.id, username:user.username, before, after, reason, createdAt:stamp() })
  const notifyAudit = entry => { try { onAudit(clone(entry)) } catch { /* Persisted local audit remains the authoritative prototype receipt. */ } }
  const insertUser = ({ email, phone = '', credential = null, username = email, isSalesperson = false, agent = null, mfaSetup = null }) => {
    let sequence = Math.max(1000, ...users.map(u => Number(/^user_(\d+)$/.exec(u.id)?.[1]) || 0)) + 1
    while (getUser(`user_${sequence}`)) sequence++
    const user = { id:`user_${sequence}`, username, role:'user', createdByAdmin:true, isSalesperson, status:'active', agentParentId:agent?.id || null, agentParentUsername:agent?.username || null, employeeId:null, email, phone:phone.replace('-', ''), parentId:null, parentUsername:null, balance:0, frozenBalance:0, totalProfit:0, tradingVolume:0, creditScore:0, kycStatus:'not_verified', isVip:false, vipLevel:0, registerTime:stamp(), lastLoginTime:null, remark:'', ...(credential ? { passwordCredential:credential } : {}), ...(mfaSetup ? { mfaSetup } : {}) }
    const entry = appendAudit('user.create', user, null, { email, phone:user.phone, isSalesperson, agentParentId:user.agentParentId })
    persist(snapshot([user, ...users], records, [...audit, entry]))
    users.unshift(user); audit.push(entry); notifyAudit(entry)
    return clone(user)
  }
  const createUser = async (input) => {
    const assertValid = () => { const fields = validateNewUser(input, users); if (Object.keys(fields).length) { const error = new Error(Object.values(fields)[0]); error.fields = fields; throw error } }
    assertValid()
    const isSalesperson = input.isSalesperson === true
    const agentId = isSalesperson ? text(input.agentParentId) : ''
    if (agentId) activeAgent(agentId)
    const email = text(input.email).toLowerCase(), phone = text(input.phone)
    const credential = await passwordCredential(input.password)
    const mfaSetup = isSalesperson ? await createSalespersonMfa(email) : null
    if (input.isCurrent && !input.isCurrent()) throw new Error('创建已取消，请重新提交')
    // Revalidate uniqueness after asynchronous derivation; two simultaneous saves cannot insert duplicates.
    assertValid()
    return insertUser({ email, phone, credential, isSalesperson, mfaSetup, agent:agentId ? activeAgent(agentId) : null })
  }
  const assignEmployee = ({ customerId, employeeId = '', reason = '' }) => {
    const customer = requireUser(customerId)
    if (customer.role !== 'user') throw new Error('仅可为普通用户设置所属业务员')
    const id = text(employeeId)
    if (id === customerId) throw new Error('不能将用户分配给本人')
    if (id && users.some(u => u.employeeId === customerId)) throw new Error('该用户名下已有客户，不能再分配到另一用户名下')
    if (text(reason).length > 200) throw new Error('变更原因不能超过 200 字')
    let agentParentId = customer.agentParentId || null
    let agentParentUsername = customer.agentParentUsername || null
    if (id) {
      const employee = requireUser(id)
      if (employee.role !== 'user' || !employee.isSalesperson || employee.employeeId || employee.status !== 'active') throw new Error('请选择有效且活跃的业务员')
      if (!employee.agentParentId) throw new Error('该业务员尚未设置所属代理，请先为业务员设置代理')
      const agent = activeAgent(employee.agentParentId)
      agentParentId = agent.id
      agentParentUsername = agent.username
    }
    if ((customer.employeeId || '') === id && (customer.agentParentId || null) === agentParentId) throw new Error('所属业务员未改变')
    const changes = { employeeId:id || null, agentParentId, agentParentUsername }
    const updated = { ...customer, ...changes }
    const entry = appendAudit('employee.assign', customer, { employeeId:customer.employeeId || null, agentParentId:customer.agentParentId || null, agentParentUsername:customer.agentParentUsername || null }, changes, text(reason))
    persist(snapshot(users.map(u => u.id === customerId ? updated : u), records, [...audit, entry]))
    Object.assign(customer, changes); audit.push(entry); notifyAudit(entry)
    return clone(customer)
  }
  const recordBusiness = input => {
    const customer = requireUser(input.customerId)
    if (customer.role !== 'user') throw new Error('业务记录必须来自普通用户')
    if (!input.id || records.some(r => r.id === input.id)) throw new Error('业务记录 ID 缺失或重复')
    if (!BUSINESS_KINDS.includes(input.kind) || !validDate(input.date)) throw new Error('业务类型或日期无效')
    for (const key of ['amountCents','feeCents','commissionCents','settledCents']) if (!Number.isSafeInteger(input[key] ?? 0) || (input[key] ?? 0) < 0) throw new Error('业务金额必须为非负整数分')
    if ((input.settledCents || 0) > (input.commissionCents || 0)) throw new Error('结算佣金不能大于产生佣金')
    const record = { ...clone(input), agentId:customer.agentParentId || '', employeeId:customer.employeeId || '', currency:'USDT' }
    persist(snapshot(users, [...records,record])); records.push(record)
  }
  const report = ({ startDate, endDate, agentId = '', employeeId = '' }) => {
    if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) throw new Error('请选择有效日期，开始日期不能晚于结束日期')
    if (agentId && getUser(agentId)?.role !== 'agent') throw new Error('所选代理不可用')
    if (employeeId && !agentId) throw new Error('请先选择代理')
    if (employeeId && employeeId !== 'unassigned' && !employees(agentId).some(e => e.id === employeeId)) throw new Error('所选员工不属于当前代理')
    const within = date => date >= startDate && date <= endDate
    const successful = records.filter(r => r.status === 'success')
    const firstDeposits = new Map()
    successful.filter(r => r.kind === 'deposit').sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).forEach(r => { if (!firstDeposits.has(r.customerId)) firstDeposits.set(r.customerId,r.id) })
    const matches = (r,a,e,c) => Boolean(r.agentId) && (!a || r.agentId === a) && (!e || (r.employeeId || '') === (e === 'unassigned' ? '' : e)) && (!c || r.customerId === c)
    const summarize = (a,e,c) => {
      const current = users.filter(u => u.role === 'user' && (!u.isSalesperson || u.employeeId) && matches({agentId:u.agentParentId,employeeId:u.employeeId,customerId:u.id},a,e,c))
      const scoped = successful.filter(r => matches(r,a,e,c) && within(r.date))
      const kinds = list => scoped.filter(r => list.includes(r.kind))
      const sum = (rows,key='amountCents') => rows.reduce((sum,r) => sum+(r[key] || 0),0)
      const people = rows => new Set(rows.map(r => r.customerId)).size
      const deposits=kinds(['deposit']),withdrawals=kinds(['withdraw']),trades=kinds(['spot','perpetual','delivery']),products=kinds(['wealth','ai','periodic','portfolio','borrowing'])
      const first = deposits.filter(r => firstDeposits.get(r.customerId) === r.id)
      const fresh = registrations.filter(r => matches(r,a,e,c) && within(r.date))
      const commission=sum(scoped,'commissionCents'),settled=sum(scoped,'settledCents')
      const result={currentClients:current.length,verifiedClients:current.filter(u=>u.kycStatus==='verified').length,newClients:new Set(fresh.map(r=>r.customerId)).size,depositPeople:people(deposits),depositOrders:deposits.length,withdrawPeople:people(withdrawals),withdrawOrders:withdrawals.length,tradePeople:people(trades),tradeOrders:trades.length,productPeople:people(products),productOrders:products.length,firstPeople:people(first),firstAmount:sum(first)/100,deposit:sum(deposits)/100,withdraw:sum(withdrawals)/100,net:(sum(deposits)-sum(withdrawals))/100,trading:sum(trades)/100,fee:sum(trades,'feeCents')/100,commission:commission/100,settled:settled/100,pending:(commission-settled)/100,depositCommission:sum(deposits,'commissionCents')/100,tradeCommission:sum(trades,'commissionCents')/100,productCommission:sum(products,'commissionCents')/100,averageDeposit:people(deposits)?sum(deposits)/100/people(deposits):null,conversion:fresh.length?100*people(first.filter(r=>fresh.some(f=>f.customerId===r.customerId)))/new Set(fresh.map(r=>r.customerId)).size:null}
      BUSINESS_KINDS.filter(k=>!['deposit','withdraw'].includes(k)).forEach(kind=>{result[kind]=sum(kinds([kind]))/100})
      return result
    }
    let rows,level
    if (!agentId) { level='agent'; rows=users.filter(u=>u.role==='agent').map(u=>({id:u.id,name:u.username,metrics:summarize(u.id,'','')})) }
    else if (!employeeId) { level='employee'; rows=[...employees(agentId).map(e=>({id:e.id,name:e.username,metrics:summarize(agentId,e.id,'')})),{id:'unassigned',name:'未分配员工',metrics:summarize(agentId,'unassigned','')}] }
    else { level='customer'; rows=users.filter(u=>u.role==='user' && (!u.isSalesperson || u.employeeId) && (matches({agentId:u.agentParentId,employeeId:u.employeeId,customerId:u.id},agentId,employeeId,'') || successful.some(r=>r.customerId===u.id&&matches(r,agentId,employeeId,'')&&within(r.date)))).map(u=>({id:u.id,name:u.username,metrics:summarize(agentId,employeeId,u.id)})) }
    return { level, summary:summarize(agentId,employeeId,''), rows, unassignedAgentCount:users.filter(u=>u.role==='user'&&!u.isSalesperson&&!u.agentParentId).length, startDate, endDate }
  }
  const dailyReport = ({ agentId, employeeId = '' }) => {
    activeAgent(agentId)
    if (employeeId && !employees(agentId).some(e => e.id === employeeId)) throw new Error('所选业务员不属于当前代理')
    const belongs = row => row.agentId === agentId && (!employeeId || row.employeeId === employeeId)
    const moduleKeys = ['deposit', 'perpetual', 'delivery', 'spot', 'aiQuant', 'lending', 'borrowing', 'portfolio']
    const kindToModule = { deposit:'deposit', perpetual:'perpetual', delivery:'delivery', spot:'spot', ai:'aiQuant', wealth:'lending', borrowing:'borrowing', portfolio:'portfolio' }
    const days = new Map()
    const dayFor = date => {
      if (!days.has(date)) days.set(date, { date, newInvites:0, volumeCents:Object.fromEntries(moduleKeys.map(k=>[k,0])), commissionCents:Object.fromEntries(moduleKeys.map(k=>[k,0])) })
      return days.get(date)
    }
    for (const row of records) {
      const key = kindToModule[row.kind]
      if (!key || row.status !== 'success' || !belongs(row)) continue
      const day = dayFor(row.date)
      day.volumeCents[key] += row.amountCents || 0
      day.commissionCents[key] += row.commissionCents || 0
    }
    const registered = new Set()
    for (const row of registrations) {
      if (!belongs(row) || !validDate(row.date) || registered.has(row.customerId)) continue
      registered.add(row.customerId)
      dayFor(row.date).newInvites++
    }
    return [...days.values()].map(day => ({
      date:day.date,
      newInvites:day.newInvites,
      tradeVolume:Object.values(day.volumeCents).reduce((s,v)=>s+v,0)/100,
      estCommission:Object.values(day.commissionCents).reduce((s,v)=>s+v,0)/100,
      volumeByModule:Object.fromEntries(moduleKeys.map(k=>[k,day.volumeCents[k]/100])),
      commissionByModule:Object.fromEntries(moduleKeys.map(k=>[k,day.commissionCents[k]/100]))
    })).sort((a,b)=>b.date.localeCompare(a.date))
  }
  const seedDemo = () => {
    if (initialized) return
    registrations=users.filter(u=>u.role==='user'&&!u.isSalesperson).map(u=>({customerId:u.id,agentId:u.agentParentId||'',employeeId:u.employeeId||'',date:text(u.registerTime).slice(0,10)}))
    const end=new Date(now());const localDay=new Date(end.getTime()+8*3600000).toISOString().slice(0,10)
    users.filter(u=>u.role==='user'&&!u.isSalesperson&&u.agentParentId).forEach((c,index)=>{
      for(let offset=0;offset<21;offset+=5){
        const day=new Date(`${localDay}T00:00:00Z`);day.setUTCDate(day.getUTCDate()-offset);const date=day.toISOString().slice(0,10)
        if(date<text(c.registerTime).slice(0,10))continue
        BUSINESS_KINDS.forEach((kind,i)=>{
          const id=`demo-${c.id}-${date}-${kind}`;if(records.some(r=>r.id===id))return
          const amountCents=(index+2)*(i+1)*(offset+1)*10000,commissionCents=kind==='withdraw'?0:Math.round(amountCents*.001)
          records.push({id,customerId:c.id,agentId:c.agentParentId,employeeId:c.employeeId||'',date,kind,amountCents,commissionCents,settledCents:Math.round(commissionCents*.6),feeCents:['spot','perpetual','delivery'].includes(kind)?Math.round(amountCents*.0006):0,status:'success',currency:'USDT'})
        })
      }
    })
    initialized=true;persist(snapshot())
  }
  const persistUserUpdate = (id, patch) => persist(snapshot(users.map(u => u.id === id ? {...u, ...patch} : u)))
  return {createUser,assignEmployee,recordBusiness,report,dailyReport,seedDemo,persistUserUpdate,employees:agentId=>clone(employees(agentId)),agents:()=>clone(users.filter(u=>u.role==='agent')),getAudit:()=>clone(audit),persist:()=>persist(snapshot()),nameOf:id=>getUser(id)?.username||'—'}
}
