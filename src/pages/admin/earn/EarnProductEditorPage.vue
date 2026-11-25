<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { Alert, Button, Card, Col, Descriptions, DescriptionsItem, Empty, Form, FormItem, Input, InputNumber, Radio, RadioGroup, Row, Select, Space, Switch, Tag, TypographyText } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import EarnPageShell from './EarnPageShell.vue'
import EarnAdminModal from './EarnAdminModal.vue'
import { earnAdmin } from '../../../admin/state/earn.js'
import { clone, currencies, earnFundingProgress, money, saveEarnProduct, statusMeta } from '../../../admin/domain/earn.js'
const route=useRoute(),router=useRouter(),form=reactive({}),original=ref(''),error=ref(''),errorRef=ref(null),busy=ref(false),found=ref(true)
const currencyQuery=ref(''),productType=ref('flexible'),fixedDays=ref(30),fixedRule=ref('disabled')
function changeProductType(event){
 if(form.id)return
 if(event.target.value==='flexible'){fixedDays.value=form.days;fixedRule.value=form.earlyRule;form.days=0;form.earlyRule='flexible'}
 else{form.days=fixedDays.value;form.earlyRule=fixedRule.value}
}
const supportsEarlyRedemption=computed({
 get:()=>productType.value==='fixed'&&form.earlyRule==='fee',
 set:value=>{form.earlyRule=value?'fee':'disabled'},
})
const filterCurrency=(query,option)=>option.label.toLowerCase().includes(query.trim().toLowerCase())
function currencyDropdown(open){if(!open)currencyQuery.value=''}
const initialFundingPercent=computed({
 get:()=>form.initialSubscribed==null?null:form.quota>0?Number((form.initialSubscribed/form.quota*100).toFixed(4)):0,
 set:value=>{form.initialSubscribed=value==null?null:Math.round(value*Number(form.quota)/100*1e8)/1e8},
})
function changeQuota(value){
 const ratio=form.quota>0?form.initialSubscribed/form.quota:0
 form.quota=value
 if(form.initialSubscribed!=null&&value!=null)form.initialSubscribed=Math.round(value*ratio*1e8)/1e8
}
const funding=computed(()=>earnFundingProgress(form))
const dirty=computed(()=>JSON.stringify(form)!==original.value)
function load(id){
 const product=id?earnAdmin.products.find(row=>row.id===id):null
 found.value=!id||Boolean(product)
 Object.keys(form).forEach(key=>delete form[key])
 Object.assign(form,clone(product||{name:'',symbol:'USDT',days:0,rate:.01,dailyRateMin:.01,dailyRateMax:.01,apy:3.65,min:10,max:100000,quota:1000000,perUser:100000,initialSubscribed:0,subscribed:0,sort:0,hot:false,earlyRule:'flexible',redemptionReviewRequired:true,earlyFeeBase:'principal',earlyFeeRate:0,settlement:'daily',risk:'',status:'draft'}))
 productType.value=form.days>0?'fixed':'flexible';fixedDays.value=form.days>0?form.days:30;fixedRule.value=form.days>0?form.earlyRule:'disabled'
 original.value=JSON.stringify(form);error.value=''
}
watch(()=>route.params.id,load,{immediate:true})
const returnQuery=()=>Object.fromEntries(['q','productId','type','status','page'].filter(key=>route.query[key]!=null).map(key=>[key,route.query[key]]))
function back(){router.push({path:'/admin/earn/products',query:returnQuery()})}
const leaveOpen=ref(false)
let resolveLeave=null,allowLeave=false
function guard(){
 if(busy.value)return false
 if(allowLeave||!dirty.value)return true
 if(resolveLeave)return false
 leaveOpen.value=true
 return new Promise(resolve=>{resolveLeave=resolve})
}
onBeforeRouteLeave(guard)
onBeforeRouteUpdate(guard)
function confirmLeave(){allowLeave=true;leaveOpen.value=false}
function cancelLeave(){allowLeave=false;leaveOpen.value=false}
function finishLeave(){const resolve=resolveLeave;resolveLeave=null;resolve?.(allowLeave);allowLeave=false}
function beforeUnload(event){if(dirty.value){event.preventDefault();event.returnValue=''}}
window.addEventListener('beforeunload',beforeUnload)
onBeforeUnmount(()=>{window.removeEventListener('beforeunload',beforeUnload);resolveLeave?.(false)})
async function save(){
 if(busy.value)return
 busy.value=true;error.value=''
 try{
  if(productType.value==='fixed'&&(!Number.isInteger(form.days)||form.days<1))throw new Error('定期期限须为 1–3650 天的整数。')
  await nextTick();saveEarnProduct(earnAdmin,form)
  original.value=JSON.stringify(form);busy.value=false
  await router.push({path:'/admin/earn/products',query:{...returnQuery(),saved:'1'}})
 }catch(cause){
  error.value=cause.message
  await nextTick();errorRef.value?.focus()
 }finally{busy.value=false}
}
</script>
<template>
 <EarnPageShell class="earn-editor" :style="{paddingBottom:0}" :title="form.id?'编辑理财产品':'新增理财产品'">
  <template #extra><Button aria-label="返回产品列表" :disabled="busy" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="form.id" #description><Space wrap><TypographyText type="secondary">{{ form.id }}</TypographyText><Tag :color="statusMeta[form.status]?.[1]">{{ statusMeta[form.status]?.[0] }}</Tag></Space></template>
  <Card v-if="!found"><Empty description="产品不存在或已失效"><Button @click="back">返回产品列表</Button></Empty></Card>
  <template v-else>
   <div v-if="error" ref="errorRef" tabindex="-1"><Alert role="alert" show-icon type="error" :message="error"/></div>
   <Form class="earn-editor-form" name="earn-product-editor" layout="vertical" :model="form" @finish="save">
      <Card title="基本信息" :bordered="false">
       <Row :gutter="24" class="earn-editor-fields">
        <Col :xs="24"><FormItem name="name" label="产品名称" required><Input v-model:value="form.name" :maxlength="80" placeholder="请输入产品名称"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="symbol" label="申购币种" required><Select v-model:value="form.symbol"  :search-value="currencyQuery" @search="currencyQuery=$event" show-search :disabled="!!form.id" :options="currencies.map(value=>({value,label:value}))" :filter-option="filterCurrency" aria-required="true" placeholder="请选择申购币种" not-found-content="无匹配币种" @dropdown-visible-change="currencyDropdown" @change="currencyQuery=''"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem label="产品类型" required><RadioGroup v-model:value="productType" aria-label="产品类型" :disabled="!!form.id" @change="changeProductType"><Radio value="flexible">活期</Radio><Radio value="fixed">定期</Radio></RadioGroup></FormItem></Col>
        <Col v-if="productType==='fixed'" :xs="24" :lg="12"><FormItem name="days" label="定期期限（天）" required><InputNumber style="width:100%" v-model:value="form.days" :min="1" :max="3650" :precision="0" :disabled="!!form.id"/></FormItem></Col>
       </Row>
      </Card>
      <Card title="收益与赎回" :bordered="false">
       <Row :gutter="24" class="earn-editor-fields">
        <Col :xs="24" :lg="12"><FormItem name="dailyRateMin" label="日利率下限（%）" required><InputNumber style="width:100%" v-model:value="form.dailyRateMin" :min="0" :max="100" :precision="4"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="dailyRateMax" label="日利率上限（%）" required><InputNumber style="width:100%" v-model:value="form.dailyRateMax" :min="0" :max="100" :precision="4"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="apy" label="预计年化收益率（%）" required><InputNumber style="width:100%" v-model:value="form.apy" :min="0" :max="1000" :precision="2"/></FormItem></Col>
        <Col :xs="24"><FormItem name="redemptionReviewRequired" label="赎回需人工审核"><Switch v-model:checked="form.redemptionReviewRequired" aria-label="赎回需人工审核" checked-children="需要" un-checked-children="不需要"/></FormItem></Col>
        <Col v-if="productType==='fixed'" :xs="24"><FormItem label="支持提前赎回"><Switch v-model:checked="supportsEarlyRedemption" aria-label="支持提前赎回" checked-children="支持" un-checked-children="不支持"/></FormItem></Col>
        <Col v-if="supportsEarlyRedemption" :xs="24" :lg="12"><FormItem name="earlyFeeBase" label="手续费计算基数" required><RadioGroup v-model:value="form.earlyFeeBase"><Space wrap><Radio value="principal">本金</Radio><Radio value="principal_and_yield">本金＋收益</Radio></Space></RadioGroup></FormItem></Col>
        <Col v-if="supportsEarlyRedemption" :xs="24" :lg="12"><FormItem name="earlyFeeRate" label="手续费率（%）" :extra="form.earlyFeeBase==='principal'?'手续费按赎回本金计算，从到账金额中扣除。':'手续费按本金与待结算收益合计计算，已发放收益不计入。'" required><InputNumber style="width:100%" v-model:value="form.earlyFeeRate" :min="0" :max="100" :precision="4"/></FormItem></Col>
       </Row>
      </Card>
      <Card title="申购额度" :bordered="false">
       <Row :gutter="24" class="earn-editor-fields">
        <Col :xs="24" :lg="12"><FormItem name="min" :label="'起购金额（'+form.symbol+'）'" required><InputNumber style="width:100%" v-model:value="form.min" :min="0" :precision="8"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="max" :label="'单笔上限（'+form.symbol+'）'" required><InputNumber style="width:100%" v-model:value="form.max" :min="0" :precision="8"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="quota" :label="'总额度（'+form.symbol+'）'" required><InputNumber style="width:100%" :value="form.quota" @update:value="changeQuota" :min="0" :precision="8"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="initialSubscribed" label="初始募集比例（%）" required><InputNumber style="width:100%" v-model:value="initialFundingPercent" :min="0" :max="100" :precision="4"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="perUser" :label="'个人持仓上限（'+form.symbol+'）'" help="留空表示不限"><InputNumber style="width:100%" v-model:value="form.perUser" :min="0" :precision="8"/></FormItem></Col>
       </Row>
       <Descriptions size="small" :column="{xs:1,sm:2,lg:4}">
        <DescriptionsItem label="初始已募集金额">{{ money(funding.initial) }} {{ form.symbol }}</DescriptionsItem>
        <DescriptionsItem label="已审核申购">{{ money(funding.actual) }} {{ form.symbol }}</DescriptionsItem>
        <DescriptionsItem label="已申购总量">{{ money(funding.total) }} {{ form.symbol }}</DescriptionsItem>
        <DescriptionsItem label="剩余额度">{{ money(funding.remaining) }} {{ form.symbol }}</DescriptionsItem>
        <DescriptionsItem label="募集进度">{{ money(funding.percent) }}%</DescriptionsItem>
       </Descriptions>
      </Card>
      <Card title="展示与说明" :bordered="false">
       <Row :gutter="24" class="earn-editor-fields">
        <Col :xs="24" :lg="12"><FormItem name="sort" label="排序权重" help="数值越大越靠前"><InputNumber style="width:100%" v-model:value="form.sort" :precision="0"/></FormItem></Col>
        <Col :xs="24" :lg="12"><FormItem name="hot" label="热门推荐"><Switch v-model:checked="form.hot" checked-children="是" un-checked-children="否"/></FormItem></Col>
        <Col :xs="24"><FormItem name="risk" label="风险说明" required><Input.TextArea v-model:value="form.risk" :rows="6" :maxlength="2000" show-count/></FormItem></Col>
       </Row>
      </Card>
   </Form>
   <Card class="earn-editor-footer" :body-style="{padding:'12px 24px'}" :bordered="false"><div class="earn-editor-actions"><Space :size="8" wrap><Button :disabled="busy" @click="back">取消</Button><Button type="primary" :loading="busy" @click="save">保存产品</Button></Space></div></Card>
  </template>
  <EarnAdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="cancelLeave" @confirm="confirmLeave" @closed="finishLeave"><TypographyText>当前修改尚未保存。离开后将丢失这些修改。</TypographyText></EarnAdminModal>
 </EarnPageShell>
</template>
<style scoped>
.earn-editor-footer{position:sticky;bottom:0;z-index:10}
.earn-editor-form{display:grid;gap:24px}
.earn-editor-form :deep(input),.earn-editor-form :deep(textarea),.earn-editor-form :deep(button){scroll-margin-block:96px}
.earn-editor-fields{max-width:1100px}
.earn-editor :deep(.ant-input-number){width:100%}
.earn-editor-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding-bottom:env(safe-area-inset-bottom)}
</style>
