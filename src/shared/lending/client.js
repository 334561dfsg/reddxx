import {ref,onMounted,onUnmounted} from 'vue'
import {createLedger} from './domain.js'
import {createLendingService} from './service.js'
// Static data (user decision, 2026-11-27): the lending Mock runs in this page's memory, so a static deploy needs no
// server. Each page load starts from the seed; nothing is persisted and admin/public no longer share live state.
export const lendingState=ref(createLedger())
export const lendingError=ref(''), lendingBusy=ref(false)
let revision=0
let service=null
async function request(options) {
 service||=createLendingService()
 if(!options)return service.read()
 const {action,args}=JSON.parse(options.body)
 return service.command(action,args)
}
export async function refreshLending() {
 const version=++revision
 try {const data=await request();if(version===revision){lendingState.value=data;lendingError.value=''}}catch(e){lendingError.value=e.message}
}
export async function lendingCommand(action,args={}) {
 if(lendingBusy.value)throw new Error('busy')
 lendingBusy.value=true;++revision
 try {
  const result=await request({method:'POST',body:JSON.stringify({action,args:{...args,requestId:args.requestId||crypto.randomUUID()}})})
  ++revision;lendingState.value=result
  lendingError.value=''
 }finally{lendingBusy.value=false}
}
export function useLendingFeed(){let timer;onMounted(()=>{refreshLending();timer=setInterval(()=>{if(!lendingBusy.value)refreshLending()},3000)});onUnmounted(()=>clearInterval(timer));return {state:lendingState,error:lendingError,busy:lendingBusy,refresh:refreshLending}}
export const statusLabels={pending:'待审核',active:'借贷中',repaying:'还款中',overdue:'逾期',completed:'已结清',rejected:'已拒绝',cancelled:'已取消',liquidated:'违约结清'}
export const actionLabels={saveRiskPolicy:'保存风控设置',publishProduct:'上架产品',unpublishProduct:'下架产品',apply:'提交申请',approve:'批准放款',reject:'拒绝申请',cancel:'取消申请',repay:'还款',liquidate:'处置质押',saveProduct:'保存产品'}
export const errorLabels={eligibilityConfig:'请选择有效的认证等级和 VIP 等级',verificationRequired:'认证等级未达到产品申请要求',vipRequired:'VIP 等级未达到产品申请要求',riskPolicy:'请设置 0 < 预警质押率 < 处置质押率 ≤ 100，并选择是否允许人工处置',termRate:'每个期限的日利率须为 0–100% 的有效数值',duplicateTerm:'同一期限不能配置不同利率',rateChanged:'期限利率已调整，请重新核对后提交',terms:'请至少配置一个正整数天数的可借期限',stale:'产品已发生变化，请关闭并重新打开编辑后再保存',amount:'金额不在允许范围内',term:'借款期限不合法',balance:'可用余额不足',product:'产品不可用或配置不合法',currency:'已有订单的产品不能更换币种',collateral:'质押币种不可用',duplicate:'请勿重复处理',status:'订单状态已改变，请刷新后重试',order:'订单不存在',threshold:'尚未达到质押处置阈值',owner:'不能操作其他用户的订单',busy:'操作处理中',unavailable:'Mock 服务不可用，请通过根开发或预览服务打开页面'}
