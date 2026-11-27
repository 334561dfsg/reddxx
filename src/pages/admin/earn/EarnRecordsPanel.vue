<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue'
import { Alert, Button, Descriptions, DescriptionsItem, Form, FormItem, Radio, RadioGroup, Space, Tag, TypographyText } from 'ant-design-vue'
import UserDetailDrawer from '../../../admin/components/user/UserDetailDrawer.vue'
import { getUserById } from '../../../admin/mock/user.js'
import EarnHoldingRewardsDrawer from './EarnHoldingRewardsDrawer.vue'
import EarnSearchForm from './EarnSearchForm.vue'
import EarnAdminTable from './EarnAdminTable.vue'
import EarnAdminModal from './EarnAdminModal.vue'
import { earnAdmin } from '../../../admin/state/earn.js'
import { clone, dateText, money, quoteEarnRedemption, redemptionTypes, reviewEarnOrder, reviewEarnRedemption, statusMeta } from '../../../admin/domain/earn.js'
const props=defineProps({section:{type:String,required:true}})
const titles={orders:'申购订单',holdings:'持仓管理',redemptions:'赎回记录',rewards:'收益记录',logs:'操作日志'}
const detailTitles={orders:'申购订单详情',holdings:'持仓详情',redemptions:'赎回详情',rewards:'收益详情',logs:'操作日志详情'}
const fields={
 orders:[['id','订单号'],['userId','用户 UID'],['productName','产品名称'],['amount','申购金额'],['status','状态'],['createdAt','申购时间'],['reviewer','审核人'],['completedAt','审核时间']],
 holdings:[['id','持仓编号'],['userId','用户 UID'],['productName','产品名称'],['principal','持仓本金'],['accrued','应计收益'],['status','状态'],['startedAt','起息时间']],
 redemptions:[['id','赎回单号'],['userId','用户 UID'],['productName','产品名称'],['amount','赎回本金'],['reward','结算收益'],['type','赎回类型'],['status','状态'],['reviewer','审核人']],
 rewards:[['id','收益流水号'],['userId','用户 UID'],['productName','产品名称'],['amount','收益金额'],['status','状态'],['rewardAt','计息时间'],['paidAt','发放时间']],
 logs:[['at','操作时间'],['operator','操作人'],['action','操作类型'],['target','关联对象'],['reason','操作说明']],
}
const search=reactive({id:'',userId:'',productName:'',target:'',action:'',reason:''})
const searchFields=computed(()=>props.section==='logs'
 ? [['id','日志编号'],['target','关联对象'],['action','操作类型'],['reason','操作说明']]
 : [['id',fields[props.section][0][1]],['userId','用户 UID'],['productName','产品名称']])
const status=ref('all'),currency=ref('all'),page=ref(1),notice=ref('')
watch([search,status,currency],()=>page.value=1)
const allRows=computed(()=>earnAdmin[props.section])
const statuses=computed(()=>[...new Set(allRows.value.map(r=>r.status).filter(Boolean))])
const filterModel=computed(()=>({...search,status:status.value,currency:currency.value}))
const filterFields=computed(()=>[
 ...searchFields.value.map(([key,label])=>({key,label})),
 ...(props.section==='logs'?[]:[
  {key:'status',label:'状态',options:[{value:'all',label:'全部状态'},...statuses.value.map(value=>({value,label:props.section==='redemptions'&&value==='pending'?'待审核':statusMeta[value]?.[0]||value}))]},
  {key:'currency',label:'币种',searchable:true,options:[{value:'all',label:'全部币种'},...['USDT','USDC','BTC','ETH'].map(value=>({value,label:value}))]},
 ]),
])
function applyFilters(values){
 for(const key of Object.keys(search))search[key]=values[key]??''
 status.value=values.status??'all'
 currency.value=values.currency??'all'
 page.value=1
}
const rows=computed(()=>allRows.value.filter(row=>
 searchFields.value.every(([key])=>String(row[key]??'').toLowerCase().includes(search[key].trim().toLowerCase()))
 &&(status.value==='all'||row.status===status.value)
 &&(currency.value==='all'||row.symbol===currency.value)))
function resetFilters(){
 for(const key of Object.keys(search))search[key]=''
 status.value='all'
 currency.value='all'
 page.value=1
}
const columns=computed(()=>[...fields[props.section].map(([key,title])=>({key,title,width:key==='id'?190:key==='userId'?130:key==='productName'?190:key==='status'?100:key.endsWith('At')||key==='at'?170:160,align:['amount','principal','accrued','reward','fee','receive'].includes(key)?'right':'left'})),{key:'actions',title:'操作',fixed:'right',width:props.section==='holdings'?140:90}])
function label(row,key){
 if(key==='rateRange')return row.dailyRateMin!=null?`${row.dailyRateMin}% – ${row.dailyRateMax}%`:(row.rate!=null?`${row.rate}% – ${row.rate}%`:'—')
 if(['fee','receive'].includes(key)&&row[key]==null)return '—'
 if(key==='feeRate')return row.feeRate==null?'—':row.feeRate+'%'
 if(key==='feeBase')return ({principal:'本金',principal_and_yield:'本金＋收益'})[row.feeBase]||'—'
 if(['amount','principal','accrued','reward','fee','receive'].includes(key))return money(row[key])+' '+row.symbol
 if(key.endsWith('At')||key==='at')return dateText(row[key])
 if(key==='type')return redemptionTypes[row.type]||row.type
 return row[key]??'—'
}
const userOpen=ref(false),detailUser=shallowRef(null),userReturnFocus=shallowRef(null)
function showUser(row,event){
 if(userOpen.value)return
 detailUser.value=getUserById(row.userId)||{id:row.userId}
 userReturnFocus.value=event.currentTarget
 userOpen.value=true
}
function recordAction(row){
 const pendingReview=(props.section==='orders'&&row.status==='pending_review')||(props.section==='redemptions'&&row.status==='pending')
 return pendingReview?{text:'审核',type:'primary'}:{text:'详情',type:'link'}
}

const rewardsOpen=ref(false),rewardsHolding=shallowRef(null),rewardsReturnFocus=shallowRef(null)
function showRewards(row,event){if(rewardsOpen.value)return;rewardsHolding.value=row;rewardsReturnFocus.value=event.currentTarget;rewardsOpen.value=true}
const selected=ref(null),open=ref(false),decision=ref('approve'),error=ref(''),busy=ref(false),errorRef=ref(null)
const reviewable=computed(()=>props.section==='orders'&&selected.value?.status==='pending_review')
const settleable=computed(()=>props.section==='redemptions'&&selected.value?.status==='pending')
const confirmText=computed(()=>reviewable.value?'确认'+(decision.value==='approve'?'通过审核':'拒绝申购'):settleable.value?(decision.value==='approve'?'通过并结算':'拒绝赎回'):'')
const extraFields=computed(()=>props.section==='holdings'?[['orderId','来源申购订单'],['rate','最近计息日利率（%）'],['rateRange','申购时日利率区间（%）'],['maturityAt','到期时间'],['lastAccruedAt','上次计息时间'],['nextAccrualAt','下次计息时间']]:props.section==='redemptions'?[['holdingId','关联持仓'],['feeBase','手续费基数'],['feeRate','手续费率'],['fee','手续费'],['receive','到账金额'],['createdAt','申请时间'],['completedAt','完成时间']]:[])
function show(row){selected.value=clone(row);error.value='';decision.value='approve';if(props.section==='redemptions'&&row.status==='pending'){try{Object.assign(selected.value,quoteEarnRedemption(row,earnAdmin.holdings.find(h=>h.id===row.holdingId)))}catch(cause){error.value=cause.message}}open.value=true}
async function submit(){if(busy.value)return;busy.value=true;error.value='';try{await nextTick();if(reviewable.value)reviewEarnOrder(earnAdmin,selected.value.id,decision.value);else if(settleable.value)reviewEarnRedemption(earnAdmin,selected.value.id,decision.value);else return;notice.value=reviewable.value?(decision.value==='approve'?'审核通过，已创建持仓并从审核通过时间开始计息。':'已拒绝申购，不创建持仓、不产生收益。'):(decision.value==='approve'?'赎回审核通过，已完成结算。':'已拒绝赎回，持仓已恢复。');open.value=false}catch(cause){error.value=cause.message;await nextTick();errorRef.value?.focus()}finally{busy.value=false}}
</script>
<template>
 <FeedbackToast v-if="notice" type="success" :source="() => (notice) ? ((notice)) : ''"></FeedbackToast>
  <EarnSearchForm :name="'earn-'+section+'-filters'" :model="filterModel" :fields="filterFields" @search="applyFilters" @reset="resetFilters"/>
  <EarnAdminTable :title="titles[section]" v-model:page="page" :rows="rows" :columns="columns"><template #cell="{column,record}">
   <Tag v-if="column.key==='status'" :color="statusMeta[record.status]?.[1]">{{ section==='redemptions'&&record.status==='pending'?'待审核':statusMeta[record.status]?.[0] }}</Tag>
   <Button v-else-if="column.key==='userId'" type="link" :aria-label="'查看用户 '+record.userId" @click.stop="showUser(record,$event)">{{ record.userId }}</Button>
   <Space v-else-if="column.key==='actions'" :size="0"><Button :type="recordAction(record).type" :danger="recordAction(record).danger" @click="show(record)">{{ recordAction(record).text }}</Button><Button v-if="section==='holdings'" type="link" @click="showRewards(record,$event)">收益</Button></Space>
   <template v-else>{{ label(record,column.key) }}</template>
  </template></EarnAdminTable>
 <EarnAdminModal :open="open" :title="reviewable?'审核申购':settleable?'审核赎回':detailTitles[section]" :confirm-text="confirmText" :danger="(reviewable||settleable)&&decision==='reject'" :busy="busy" @close="open=false" @confirm="submit">
  <div v-if="error" ref="errorRef" tabindex="-1"><FeedbackToast  type="error" :source="() => (error)"></FeedbackToast></div>
  <Descriptions v-if="selected" bordered size="small" :column="2"><DescriptionsItem v-for="[key,title] in [...fields[section],...extraFields]" :key="key" :label="title"><Tag v-if="key==='status'" :color="statusMeta[selected.status]?.[1]">{{ section==='redemptions'&&selected.status==='pending'?'待审核':statusMeta[selected.status]?.[0] }}</Tag><Button v-else-if="key==='userId'" type="link" :aria-label="'查看用户 '+selected.userId" @click.stop="showUser(selected,$event)">{{ selected.userId }}</Button><template v-else>{{ label(selected,key) }}</template></DescriptionsItem></Descriptions>
  <template v-if="section==='logs'&&selected"><TypographyText strong>变更前</TypographyText><pre class="earn-log-snapshot">{{ selected.before }}</pre><TypographyText strong>变更后</TypographyText><pre class="earn-log-snapshot">{{ selected.after }}</pre></template>
  <Form v-if="reviewable||settleable" layout="vertical"><FormItem name="decision" label="审核结果" required><RadioGroup v-model:value="decision"><Space wrap><Radio value="approve">{{ reviewable?'通过，开始理财':'通过并结算' }}</Radio><Radio value="reject">{{ reviewable?'拒绝申购':'拒绝赎回' }}</Radio></Space></RadioGroup></FormItem></Form>
 </EarnAdminModal>
 <EarnHoldingRewardsDrawer :open="rewardsOpen" :holding="rewardsHolding" :return-focus="rewardsReturnFocus" @close="rewardsOpen=false" @closed="rewardsHolding=null;rewardsReturnFocus=null"/>
 <UserDetailDrawer :visible="userOpen" :user="detailUser" :return-focus="userReturnFocus" @close="userOpen=false" @closed="detailUser=null;userReturnFocus=null"/>
</template>
<style scoped>.earn-log-snapshot{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.ant-descriptions :deep(.ant-descriptions-item-content){overflow-wrap:anywhere}</style>
