<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue'
import {onBeforeRouteLeave,onBeforeRouteUpdate,useRoute,useRouter} from 'vue-router'
import {message,Alert,Button,Card,Col,Empty,Form,FormItem,Input,InputNumber,Row,Select,Space,Spin,Switch,Table,TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {verificationOptions,vipOptions} from '../../../shared/lending/eligibility.js'
import {normalizeLoanTerms,annualLoanRate} from '../../../shared/lending/terms.js'
import {lendingState,lendingError,lendingBusy,refreshLending,lendingCommand,errorLabels} from '../../../shared/lending/client.js'
const route=useRoute(),router=useRouter(),form=ref(null),expected=ref(null),original=ref(''),loading=ref(true),error=ref(''),errorRef=ref(null),found=ref(true)
const termDraft=ref(null),rateDraft=ref(null),termError=ref('')
const formatDailyRate=(value,{userTyping,input})=>userTyping?input:value==null||value===''?'':Number(Number(value).toFixed(8)).toString()
const termColumns=[{title:'期限（天）',key:'days',width:160},{title:'日利率（%）',key:'dailyRate',width:240},{title:'参考年化利率（%）',key:'annual',width:200},{title:'操作',key:'actions',width:100}]
function addTerm(){
 if(form.value.loanTerms.some(t=>t.days===termDraft.value)){termError.value='该期限已存在，请直接修改对应利率';message.error(termError.value);return}
 try{form.value.loanTerms=normalizeLoanTerms([...form.value.loanTerms,{days:termDraft.value,dailyRate:rateDraft.value}]);termDraft.value=null;rateDraft.value=null;termError.value=''}catch(e){termError.value=errorLabels[e.message]||e.message;message.error(termError.value)}
}
function removeTerm(day){form.value.loanTerms=form.value.loanTerms.filter(t=>t.days!==day);termError.value=''}
const collateralPercent=computed({get:()=>form.value?.collateralMultiplier==null?null:Number((form.value.collateralMultiplier*100).toFixed(8)),set:value=>{form.value.collateralMultiplier=value==null?null:value/100}})
const dirty=computed(()=>!!form.value&&(JSON.stringify(form.value)!==original.value||termDraft.value!=null||rateDraft.value!=null))
const busy=computed(()=>loading.value||lendingBusy.value)
const groups=[
 {title:'额度与期限',fields:[['minLoanAmount','最小借款额'],['maxLoanAmount','最大借款额']]},
 {title:'逾期规则',fields:[['overduePenaltyRate','逾期日费率（%）']]},
]
let loadVersion=0
async function load(){
 const version=++loadVersion;loading.value=true;error.value='';termDraft.value=null;rateDraft.value=null;termError.value='';form.value=null
 await refreshLending()
 if(version!==loadVersion)return
 if(lendingError.value){error.value=errorLabels[lendingError.value]||lendingError.value;loading.value=false;return}
 const p=route.params.id?lendingState.value.products.find(p=>p.productId===route.params.id):null
 found.value=!route.params.id||!!p
 expected.value=p?JSON.parse(JSON.stringify(p)):null
 form.value=JSON.parse(JSON.stringify(p||{minVerificationLevel:'none',minVipLevel:0,productName:'',loanCurrency:'USDT',status:'inactive',minLoanAmount:100,maxLoanAmount:100000,loanTerms:[7,14,30,60,90,180].map(days=>({days,dailyRate:0.1})),overduePenaltyRate:0.08,collateralEnabled:true,collateralMultiplier:1.5,collateralCurrencies:['USDT'],sortOrder:0}))
 original.value=JSON.stringify(form.value);loading.value=false
}
watch(()=>route.params.id,load,{immediate:true})
const returnQuery=()=>Object.fromEntries(['q','page','size','productId','currency','status'].filter(k=>route.query[k]!=null).map(k=>[k,route.query[k]]))
function back(){router.push({path:'/admin/lending/products',query:returnQuery()})}
const leaveOpen=ref(false);let resolveLeave=null,allowLeave=false
function guard(){if(busy.value)return false;if(allowLeave||!dirty.value)return true;if(resolveLeave)return false;leaveOpen.value=true;return new Promise(resolve=>{resolveLeave=resolve})}
onBeforeRouteLeave(guard);onBeforeRouteUpdate(guard)
function confirmLeave(){allowLeave=true;leaveOpen.value=false}
function cancelLeave(){allowLeave=false;leaveOpen.value=false}
function finishLeave(){const resolve=resolveLeave;resolveLeave=null;resolve?.(allowLeave);allowLeave=false}
function beforeUnload(event){if(dirty.value){event.preventDefault();event.returnValue=''}}
window.addEventListener('beforeunload',beforeUnload)
onBeforeUnmount(()=>{++loadVersion;window.removeEventListener('beforeunload',beforeUnload);resolveLeave?.(false)})
async function save(){
 if(busy.value||!form.value)return
 error.value=''
 try{
  if(termDraft.value!=null||rateDraft.value!=null)throw new Error('请先添加输入的期限与利率，或清空两项输入后再保存')
  form.value.loanTerms=normalizeLoanTerms(form.value.loanTerms)
  if(!form.value.productName.trim())throw new Error('请填写产品名称')
  for(const {fields} of groups)for(const [key,label] of fields)if(form.value[key]==null||!Number.isFinite(form.value[key]))throw new Error(`请填写${label}`)
  await lendingCommand('saveProduct',{product:form.value,expectedProduct:expected.value})
  original.value=JSON.stringify(form.value)
  message.success('产品保存成功')
  await router.push({path:'/admin/lending/products',query:returnQuery()})
 }catch(e){error.value=errorLabels[e.message]||e.message;await nextTick();errorRef.value?.focus()}
}
</script>
<template>
 <PageShell class="lending-editor" :style="{paddingBottom:0}" :title="route.params.id?'编辑借贷产品':'新增借贷产品'">
  <template #extra><Button :disabled="lendingBusy" aria-label="返回产品列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{route.params.id}}</TypographyText></template>
  <div v-if="error" ref="errorRef" tabindex="-1"><FeedbackToast  type="error" :source="() => (error)"><Button v-if="!form" @click="load">重试</Button></FeedbackToast></div>
  <Spin v-if="loading" tip="加载产品…"/>
  <Card v-else-if="!found"><Empty description="产品不存在或已失效"><Button @click="back">返回产品列表</Button></Empty></Card>
  <template v-else-if="form">
   <Form name="lending-product-editor" class="lending-editor-form" layout="vertical" :model="form" :disabled="lendingBusy" @finish="save">
    <Card title="基本信息" :bordered="false"><Row :gutter="24" class="lending-editor-fields">
     <Col :xs="24"><FormItem name="productName" label="产品名称" required><Input v-model:value="form.productName" :maxlength="80" placeholder="请输入产品名称"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem name="loanCurrency" label="借出币种" required><Select v-model:value="form.loanCurrency" show-search option-filter-prop="label" :options="['USDT','USDC'].map(value=>({value,label:value}))"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem name="sortOrder" label="排序权重" help="数值越大越靠前"><InputNumber style="width:100%" v-model:value="form.sortOrder" :min="0" :precision="0"/></FormItem></Col>
    </Row></Card>
    <Card v-for="group in groups" :key="group.title" :title="group.title" :bordered="false"><Row :gutter="24" class="lending-editor-fields"><Col v-for="[key,label] in group.fields" :key="key" :xs="24" :lg="12"><FormItem :name="key" :label="label" required><InputNumber style="width:100%" v-model:value="form[key]" :min="0" :precision="key.includes('Duration')?0:undefined"/></FormItem></Col>
     <Col v-if="group.title==='额度与期限'" :xs="24"><FormItem label="期限与利率" required :validate-status="termError?'error':undefined" help="每个期限独立配置日利率，参考年化利率按日利率 × 365 自动换算，只读展示。已有订单不受影响。">
      <Table :columns="termColumns" :data-source="form.loanTerms" row-key="days" :pagination="false" size="middle"><template #bodyCell="{column,record}"><template v-if="column.key==='days'">{{record.days}} 天</template><InputNumber v-else-if="column.key==='dailyRate'" v-model:value="record.dailyRate" :aria-label="record.days+' 天日利率'" :min="0" :max="100" :step="0.01" :precision="8" :formatter="formatDailyRate" style="width:180px"/><template v-else-if="column.key==='annual'">{{record.dailyRate==null?'—':Number(annualLoanRate(record.dailyRate).toFixed(2))}}%</template><Button v-else type="link" danger :disabled="lendingBusy" @click="removeTerm(record.days)">删除</Button></template></Table>
      <Space :size="8" style="margin-top:16px"><InputNumber v-model:value="termDraft" aria-label="新增期限天数" :min="1" placeholder="期限天数" style="width:160px" @press-enter.prevent="addTerm"/><InputNumber v-model:value="rateDraft" aria-label="新增期限日利率" :min="0" :max="100" :step="0.01" :precision="8" :formatter="formatDailyRate" placeholder="日利率（%）" style="width:180px" @press-enter.prevent="addTerm"/><Button :disabled="lendingBusy" @click="addTerm">添加期限</Button></Space>
     </FormItem></Col>
    </Row></Card>
    <Card title="申请条件" :bordered="false"><Row :gutter="24" class="lending-editor-fields">
     <Col :span="12"><FormItem name="minVerificationLevel" label="最低认证等级" help="达到所选等级及以上可申请。"><Select v-model:value="form.minVerificationLevel" :options="verificationOptions"/></FormItem></Col>
     <Col :span="12"><FormItem name="minVipLevel" label="最低 VIP 等级" help="两项条件同时设置时，需要同时满足。"><Select v-model:value="form.minVipLevel" show-search option-filter-prop="label" :options="vipOptions"/></FormItem></Col>
    </Row></Card>
    <Card title="质押设置" :bordered="false"><Row :gutter="24" class="lending-editor-fields">
     <Col :xs="24"><FormItem name="collateralEnabled" label="需要质押"><Switch v-model:checked="form.collateralEnabled" aria-label="需要质押" checked-children="需要" un-checked-children="不需要"/></FormItem></Col>
     <Col v-if="form.collateralEnabled" :xs="24" :lg="12"><FormItem name="collateralCurrencies" label="允许质押币种" required><Select v-model:value="form.collateralCurrencies" mode="multiple" show-search option-filter-prop="label" placeholder="输入币种搜索" not-found-content="无匹配币种" :options="Object.keys(lendingState.prices).map(value=>({value,label:value}))"/></FormItem></Col>
     <Col v-if="form.collateralEnabled" :xs="24" :lg="12"><FormItem name="collateralMultiplier" label="初始质押比例（%）" required :help="collateralPercent==null?'质押价值 ÷ 借款本金 × 100%':`借款 1,000 ${form.loanCurrency}，需质押价值 ${Number((collateralPercent*10).toFixed(8)).toLocaleString()} ${form.loanCurrency} 的资产`"><InputNumber style="width:100%" v-model:value="collateralPercent" :min="100" :precision="4"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="lending-editor-footer" :body-style="{padding:'12px 24px'}" :bordered="false"><div class="lending-editor-actions"><Space :size="8" wrap><Button :disabled="lendingBusy" @click="back">取消</Button><Button type="primary" :loading="lendingBusy" @click="save">保存产品</Button></Space></div></Card>
  </template>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="cancelLeave" @confirm="confirmLeave" @closed="finishLeave"><TypographyText>当前修改尚未保存。离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>
<style scoped>
.lending-editor-form{display:grid;gap:24px}.lending-editor-fields{max-width:1100px}.lending-editor :deep(.ant-input-number){width:100%}.lending-editor-actions{position:sticky;bottom:0;background:var(--ant-color-bg-container,#fff);z-index:10}.lending-editor-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding-bottom:env(safe-area-inset-bottom)}
</style>
