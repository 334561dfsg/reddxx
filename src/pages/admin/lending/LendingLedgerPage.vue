<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import {computed,ref,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {message,Alert,Button,Space,Tag,TypographyText} from 'ant-design-vue'
import {useLendingFeed,lendingCommand,statusLabels,actionLabels,errorLabels} from '../../../shared/lending/client.js'
import {loanRateRange} from '../../../shared/lending/terms.js'
import LendingOrderDetails from './LendingOrderDetails.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import {PlusOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import LedgerModal from '../earn/EarnAdminModal.vue'
const route=useRoute(),router=useRouter(),{state,error,busy,refresh}=useLendingFeed()
const mode=computed(()=>route.path.split('/').pop())
const applied=ref(String(route.query.q||'')),appliedStatus=ref(String(route.query.status||'')),selected=ref(null),action=ref(''),failure=ref(''),statusProduct=ref(null)
const page=ref(Math.max(1,Number(route.query.page)||1)),identifier=ref(String(route.query.productId||'')),currency=ref(String(route.query.currency||'all'))
const labels={products:'产品管理',orders:'订单管理',repayment:'还款记录','operation-log':'操作日志'}
const rows=computed(()=>{
 const source=mode.value==='products'?state.value.products:mode.value==='orders'?state.value.orders:mode.value==='repayment'?state.value.repayments:state.value.logs
 return source.filter(r=>(!identifier.value||String(r.productId||r.orderId||r.refId||'').toLowerCase().includes(identifier.value.toLowerCase()))&&(currency.value==='all'||r.loanCurrency===currency.value)&&(!appliedStatus.value||r.status===appliedStatus.value)&&(!applied.value||[r.orderId,r.productId,r.productName,r.userId,r.refId,r.operator].some(v=>String(v||'').toLowerCase().includes(applied.value.toLowerCase()))))
})
const columns=computed(()=>mode.value==='products'?[['productId','产品ID'],['productName','产品名称'],['loanCurrency','币种'],['dailyRateRange','日利率区间 (%)'],['loanTerms','可借期限'],['status','状态'],['actions','操作']]:mode.value==='orders'?[['orderId','订单 / 产品'],['userId','UID'],['loanAmount','申请金额'],['terms','期限 / 日利率'],['collateral','质押资产'],['status','状态'],['createTime','申请时间'],['reviewer','审核人'],['actions','操作']]:mode.value==='repayment'?[['repaymentId','还款ID'],['orderId','订单ID'],['userId','UID'],['loanCurrency','币种'],['amount','还款金额'],['principalPaid','本金'],['interestPaid','利息'],['overduePenaltyPaid','逾期利息'],['repaymentTime','还款时间']]:[['refId','关联记录'],['action','操作'],['operator','操作人'],['createdAt','时间']])
const amountKeys=['loanAmount','totalDebt','interestRate','amount','principalPaid','interestPaid','overduePenaltyPaid']
const tableColumns=computed(()=>columns.value.map(([key,title],i)=>({key,dataIndex:key,title,width:mode.value==='orders'?({orderId:260,userId:140,loanAmount:160,terms:130,collateral:170,status:100,createTime:180,reviewer:150,actions:160})[key]:mode.value==='products'?({productId:120,productName:200,loanCurrency:80,dailyRateRange:190,loanTerms:210,status:90,actions:140})[key]:key==='actions'?180:key==='orderId'||key==='repaymentId'?240:key==='productName'?210:160,align:amountKeys.includes(key)?'right':undefined,fixed:key==='actions'?'right':i===0?'left':undefined})))
const filterModel=computed(()=>({q:applied.value,id:identifier.value,currency:currency.value,status:appliedStatus.value||'all'}))
const filterFields=computed(()=>[
 {key:'q',label:mode.value==='products'?'产品名称':'搜索内容'},
 {key:'id',label:mode.value==='products'?'产品编号':'关联单号'},
 ...(mode.value!=='operation-log'?[{key:'currency',label:'币种',searchable:true,options:[{value:'all',label:'全部币种'},...['USDT','USDC'].map(value=>({value,label:value}))]}]:[]),
 ...(['products','orders'].includes(mode.value)?[{key:'status',label:'状态',options:[{value:'all',label:'全部状态'},...Object.entries(mode.value==='products'?{active:'上架',inactive:'下架',suspended:'暂停'}:statusLabels).map(([value,label])=>({value,label}))]}]:[])
])
watch(()=>rows.value.length,n=>page.value=Math.min(page.value,Math.max(1,Math.ceil(n/10))))
const statusColors={active:'green',inactive:'default',suspended:'orange',pending:'blue',repaying:'cyan',overdue:'red',completed:'green',rejected:'red',cancelled:'default',liquidated:'red'}

const userOpen=ref(false), user=ref(null)
function showUser(row){user.value={id:row.userId,username:'借贷用户（模拟）',name:'借贷用户（模拟）'};userOpen.value=true}
const display=(r,k)=>k==='status'?(mode.value==='products'?({active:'上架',suspended:'暂停',inactive:'下架'})[r[k]]:(statusLabels[r[k]]||r[k])):k==='action'?(actionLabels[r[k]]||r.summary):['repaymentTime','createdAt','createTime'].includes(k)?date(r[k]):r[k]??'—'
const date=n=>n?new Date(n).toLocaleString('zh-CN',{hour12:false}):'—'
const current=computed(()=>state.value.orders.find(o=>o.orderId===selected.value?.orderId)||selected.value)
const related=computed(()=>state.value.entries.filter(e=>e.orderId===current.value?.orderId))
const repayments=computed(()=>state.value.repayments.filter(e=>e.orderId===current.value?.orderId))
const collateralValue=o=>(o.collateralAmount||0)*(state.value.prices[o.collateralType]||0)
const riskStatus=o=>o.collateralStatus!=='locked'?'不适用':o.status==='pending'?'待放款':risk(o)>=o.collateralDisposalThreshold?'达到处置线':risk(o)>=o.collateralWarningThreshold?'风险预警':'正常'
const risk=o=>o?.collateralAmount?o.totalDebt/(o.collateralAmount*state.value.prices[o.collateralType])*100:0
function open(row,kind='detail'){failure.value='';selected.value=row;action.value=kind}
function showStatus(p){statusProduct.value=JSON.parse(JSON.stringify(p));failure.value='';action.value='productStatus'}
async function saveStatus(){
 if(busy.value)return
 failure.value=''
 try{await lendingCommand('setProductStatus',{productId:statusProduct.value.productId,expectedStatus:statusProduct.value.status});message.success('产品状态已更新');action.value=''}catch(e){failure.value=errorLabels[e.message]||e.message}
}
function edit(p){router.push({path:p?`/admin/lending/products/${encodeURIComponent(p.productId)}/edit`:'/admin/lending/products/new',query:{q:applied.value,page:page.value,productId:identifier.value,currency:currency.value,status:appliedStatus.value}})}
async function run(kind){if(busy.value)return;failure.value='';try{await lendingCommand(kind,{orderId:current.value?.orderId,actor:'管理员（模拟）'});message.success(`${actionLabels[kind]||'操作'}成功`);action.value=''}catch(e){failure.value=errorLabels[e.message]||e.message}}
function search(values){applied.value=values.q.trim();identifier.value=values.id.trim();currency.value=values.currency||'all';appliedStatus.value=values.status==='all'?'':values.status||'';page.value=1}
function reset(){applied.value='';identifier.value='';currency.value='all';appliedStatus.value='';page.value=1}
watch(mode,()=>{reset();action.value='';selected.value=null})

</script>
<template>
 <PageShell>
 <FeedbackToast v-if="error" type="error" :source="() => (error) ? ((errorLabels[error]||error)) : ''"><Button @click="refresh">重试</Button></FeedbackToast>
 <SearchForm :name="'lending-'+mode+'-filters'" :model="filterModel" :fields="filterFields" @search="search" @reset="reset"/>
 <AdminTable :title="labels[mode]" v-model:page="page" :rows="rows" :columns="tableColumns" :row-key="r=>r.repaymentId||r.orderId||r.productId||r.id" desktop-only>
  <template #toolbar><Space :size="8"><Button @click="refresh">刷新</Button><Button v-if="mode==='products'" type="primary" @click="edit()"><template #icon><PlusOutlined/></template>新增产品</Button></Space></template>
  <template #cell="{column,record}">
   <Space v-if="column.key==='actions'" :size="8">
    <template v-if="mode==='products'"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.status==='active'" @click="showStatus(record)">{{record.status==='active'?'下架':'上架'}}</Button></template>
    <template v-else><Button type="link" @click="open(record)">{{record.status==='pending'?'审核':'详情'}}</Button><Button v-if="['active','repaying','overdue'].includes(record.status)&&record.collateralStatus==='locked'&&record.overdueDeductEnabled&&risk(record)>=record.collateralDisposalThreshold" type="link" danger @click="open(record,'liquidate')">处置质押</Button></template>
   </Space>
   <Space v-else-if="mode==='orders'&&column.key==='orderId'" direction="vertical" :size="0"><TypographyText copyable>{{record.orderId}}</TypographyText><TypographyText type="secondary">{{record.productName}}</TypographyText></Space>
   <Space v-else-if="column.key==='terms'" direction="vertical" :size="0"><TypographyText>{{record.loanDuration}} 天</TypographyText><TypographyText type="secondary">{{Number(record.dailyRate??record.interestRate/365)}}% / 日</TypographyText></Space>
   <Space v-else-if="column.key==='collateral'" direction="vertical" :size="0"><TypographyText>{{record.collateralType?Number(record.collateralAmount).toLocaleString('zh-CN',{maximumFractionDigits:8})+' '+record.collateralType:'无需质押'}}</TypographyText><TypographyText type="secondary">{{({locked:record.status==='pending'?'已预留':'已锁定',released:'已释放',deducted:'已处置',none:'—'})[record.collateralStatus]}}</TypographyText></Space>
   <template v-else-if="column.key==='collateralValue'">{{record.collateralStatus==='locked'?collateralValue(record).toLocaleString():'—'}}</template>
   <template v-else-if="column.key==='riskRatio'">{{record.collateralStatus==='locked'&&record.status!=='pending'?risk(record).toFixed(2)+'%':'—'}}</template>
   <Tag v-else-if="column.key==='riskStatus'" :color="riskStatus(record)==='达到处置线'?'red':riskStatus(record)==='风险预警'?'orange':undefined">{{riskStatus(record)}}</Tag>
   <template v-else-if="column.key==='dailyRateRange'">{{loanRateRange(record.loanTerms)}}</template>
   <Space v-else-if="column.key==='loanTerms'" :size="4" wrap><Tag v-for="term in record.loanTerms" :key="term.days">{{term.days}} 天 · {{Number(term.dailyRate.toFixed(8))}}%</Tag></Space>
   <Tag v-else-if="column.key==='status'" :color="statusColors[record.status]">{{display(record,column.key)}}</Tag>
   <Button v-else-if="column.key==='userId'" type="link" @click="showUser(record)">{{record.userId}}</Button>
   <template v-else-if="amountKeys.includes(column.key)">{{Number(record[column.key]||0).toLocaleString('zh-CN',{maximumFractionDigits:8})}} {{mode==='orders'?record.loanCurrency:''}}</template>
   <TypographyText v-else :type="['productId','orderId','refId'].includes(column.key)?'secondary':undefined">{{display(record,column.key)}}</TypographyText>
  </template>
 </AdminTable>
 <LedgerModal :open="!!action&&action!=='productStatus'" :width="960" :title="action==='liquidate'?'确认处置质押':current?.status==='pending'?'审核借款':'借款详情'" :busy="busy" :confirm-text="action==='liquidate'?'确认处置':''" :danger="action==='liquidate'" @close="action=''" @confirm="run('liquidate')">
  <FeedbackToast v-if="failure" type="error" :source="() => (failure) ? ((failure)) : ''"></FeedbackToast>
  <template v-if="current">
   <Alert v-if="action==='liquidate'" type="warning" message="将按 Mock 行情估值处置已锁定质押，退回剩余质押；不足部分记录为结清损失。此操作不能撤销。"/>
   <Alert v-if="action==='reject'&&current.status==='pending'" type="warning" message="拒绝后将释放预留质押，订单保留记录。"/>
   <LendingOrderDetails :key="current.orderId" :order="current" :prices="state.prices" :repayments="repayments" :entries="related" @user="showUser"/>
  </template>
  <template #actions><template v-if="current?.status==='pending'"><template v-if="action==='reject'"><Button :disabled="busy" @click="action='detail'">返回审核</Button><Button danger type="primary" :loading="busy" @click="run('reject')">确认拒绝</Button></template><template v-else><Button danger :disabled="busy" @click="action='reject'">拒绝</Button><Button type="primary" :loading="busy" @click="run('approve')">批准并放款</Button></template></template></template>
 </LedgerModal>
 <LedgerModal :width="520" :open="action==='productStatus'" :title="statusProduct?.status==='active'?'下架借贷产品':'上架借贷产品'" :busy="busy" :confirm-text="statusProduct?.status==='active'?'确认下架':'确认上架'" :danger="statusProduct?.status==='active'" @close="action=''" @confirm="saveStatus">
  <FeedbackToast v-if="failure" type="error" :source="() => (failure) ? ((failure)) : ''"></FeedbackToast>
  <div v-if="statusProduct"><strong>{{statusProduct.productName}}</strong><p>{{statusProduct.status==='active'?'确认下架该产品？下架后停止新申请及待审核订单放款，已放款订单的计息与还款不受影响。':'确认上架该产品？上架后将开放新的借款申请。'}}</p></div>
 </LedgerModal>
 <UserDetailDrawer :visible="userOpen" :user="user" @close="userOpen=false"/>
 </PageShell>
</template>
<style scoped>
:deep(.ant-list-item){overflow-wrap:anywhere}
</style>
