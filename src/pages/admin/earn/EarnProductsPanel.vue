<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { Alert, Button, Space, Tag, TypographyText } from 'ant-design-vue'
import EarnSearchForm from './EarnSearchForm.vue'
import EarnAdminTable from './EarnAdminTable.vue'
import EarnAdminModal from './EarnAdminModal.vue'
import { earnAdmin } from '../../../admin/state/earn.js'
import { clone, dateText, earnFundingProgress, money, setEarnProductStatus, statusMeta } from '../../../admin/domain/earn.js'
const route=useRoute(),router=useRouter()
const productId=ref(String(route.query.productId||''))
const keyword=ref(String(route.query.q||'')),type=ref(String(route.query.type||'all')),status=ref(String(route.query.status||'all')),page=ref(Math.max(1,Number(route.query.page)||1)),notice=ref(route.query.saved?'产品已保存。':'')
function edit(row){router.push({path:row?'/admin/earn/products/'+row.id+'/edit':'/admin/earn/products/new',query:{q:keyword.value,productId:productId.value,type:type.value,status:status.value,page:page.value}})}
watch([keyword,productId,type,status],()=>page.value=1)
const rows=computed(()=>earnAdmin.products.filter(p=>(!keyword.value||p.name.toLowerCase().includes(keyword.value.toLowerCase()))&&p.id.toLowerCase().includes(productId.value.trim().toLowerCase())&&(type.value==='all'||Boolean(p.days)===(type.value==='fixed'))&&(status.value==='all'||p.status===status.value)).sort((a,b)=>b.sort-a.sort))
const filterModel=computed(()=>({name:keyword.value,productId:productId.value,type:type.value,status:status.value}))
const filterFields=[
 {key:'name',label:'产品名称'},
 {key:'productId',label:'产品编号'},
 {key:'type',label:'产品类型',options:[{value:'all',label:'全部类型'},{value:'flexible',label:'活期'},{value:'fixed',label:'定期'}]},
 {key:'status',label:'状态',options:[{value:'all',label:'全部状态'},...['enabled','disabled','draft'].map(value=>({value,label:statusMeta[value][0]}))]},
]
function applyFilters(values){keyword.value=values.name;productId.value=values.productId;type.value=values.type;status.value=values.status;page.value=1}
function resetFilters(){keyword.value='';productId.value='';type.value='all';status.value='all';page.value=1}
const columns=[
 {title:'产品 / 编号',key:'name',width:230,fixed:'left'},
 {title:'状态',key:'status',width:100},
 {title:'产品类型',key:'productType',width:110},
 {title:'赎回审核',key:'redemptionReview',width:140},
 {title:'提前赎回',key:'earlyRedemption',width:130},
 {title:'币种 / 期限',key:'term',width:130},
 {title:'提前赎回手续费',key:'earlyFee',width:180},
 {title:'日利率区间 / 预计年化',key:'rate',width:200,align:'right'},
 {title:'申购区间',key:'limits',width:180,align:'right'},
 {title:'个人持仓上限',key:'perUser',width:180,align:'right'},
 {title:'初始募集比例 / 金额',key:'initialFunding',width:200,align:'right'},
 {title:'已审核申购',key:'actualFunding',width:180,align:'right'},
 {title:'已申购 / 募集进度',key:'funding',width:200,align:'right'},
 {title:'总额度 / 剩余额度',key:'quota',width:210,align:'right'},
 {title:'排序权重',key:'sort',width:100,align:'right'},
 {title:'更新时间',key:'updatedAt',width:180},
 {title:'操作',key:'actions',fixed:'right',width:140},
]
const open=ref(false),form=reactive({}),error=ref(''),busy=ref(false),errorRef=ref(null)
function show(row) { Object.assign(form,clone(row));error.value='';open.value=true }
async function save(){ if(busy.value)return;busy.value=true;error.value='';try{await nextTick();setEarnProductStatus(earnAdmin,form.id,form.version);notice.value='产品状态已更新。';open.value=false}catch(cause){error.value=cause.message;await nextTick();errorRef.value?.focus()}finally{busy.value=false} }
</script>
<template>
 <FeedbackToast v-if="notice" type="success" :source="() => (notice) ? ((notice)) : ''"></FeedbackToast>
  <EarnSearchForm name="earn-products-filters" :model="filterModel" :fields="filterFields" @search="applyFilters" @reset="resetFilters"/>

  <EarnAdminTable title="产品目录" v-model:page="page" :rows="rows" :columns="columns"><template #toolbar><Button type="primary" @click="edit(null)"><template #icon><PlusOutlined/></template>新增产品</Button></template><template #cell="{column,record}">
   <template v-if="column.key==='name'"><div><TypographyText>{{ record.name }}</TypographyText><Tag v-if="record.hot" color="orange">热门</Tag></div><TypographyText type="secondary">{{ record.id }}</TypographyText></template>
   <Tag v-else-if="column.key==='productType'" :color="record.days>0?'blue':'cyan'">{{ record.days>0?'定期':'活期' }}</Tag>
   <Tag v-else-if="column.key==='redemptionReview'" :color="record.redemptionReviewRequired?'orange':'green'">{{ record.redemptionReviewRequired?'人工审核':'自动处理' }}</Tag>
   <Tag v-else-if="column.key==='earlyRedemption'" :color="record.days>0&&record.earlyRule==='fee'?'blue':'default'">{{ !record.days?'不适用':record.earlyRule==='fee'?'支持':'不支持' }}</Tag>
   <template v-else-if="column.key==='earlyFee'"><template v-if="record.days>0&&record.earlyRule==='fee'">{{ record.earlyFeeRate }}%<br/><TypographyText type="secondary">{{ record.earlyFeeBase==='principal'?'按本金':'按本金＋收益' }}</TypographyText></template><template v-else>—</template></template>
   <template v-else-if="column.key==='perUser'">{{ record.perUser==null?'不限':money(record.perUser)+' '+record.symbol }}</template>
   <template v-else-if="column.key==='initialFunding'">{{ Number((record.initialSubscribed/record.quota*100).toFixed(4)) }}%<br/><TypographyText type="secondary">{{ money(record.initialSubscribed) }} {{ record.symbol }}</TypographyText></template>
   <template v-else-if="column.key==='actualFunding'">{{ money(record.subscribed) }} {{ record.symbol }}</template>
   <template v-else-if="column.key==='sort'">{{ record.sort }}</template>
   <template v-else-if="column.key==='updatedAt'">{{ dateText(record.updatedAt) }}</template>
   <template v-else-if="column.key==='term'">{{ record.symbol }}<br/>{{ record.days?record.days+' 天':'活期' }}</template>
   <template v-else-if="column.key==='rate'">{{ record.dailyRateMin }}% – {{ record.dailyRateMax }}%<br/><TypographyText type="secondary">预计年化 {{ record.apy }}%</TypographyText></template>
   <template v-else-if="column.key==='limits'">{{ money(record.min) }} – {{ money(record.max) }}<br/><TypographyText type="secondary">{{ record.symbol }}</TypographyText></template>
   <template v-else-if="column.key==='funding'">{{ money(earnFundingProgress(record).total) }} {{ record.symbol }}<br/><TypographyText type="secondary">{{ Number(earnFundingProgress(record).percent.toFixed(2)) }}%</TypographyText></template>
   <template v-else-if="column.key==='quota'">{{ money(record.quota) }} {{ record.symbol }}<br/><TypographyText type="secondary">剩余 {{ money(earnFundingProgress(record).remaining) }} {{ record.symbol }}</TypographyText></template>
   <Tag v-else-if="column.key==='status'" :color="statusMeta[record.status][1]">{{ statusMeta[record.status][0] }}</Tag>
   <Space v-else-if="column.key==='actions'" :size="0"><Button type="link" @click="edit(record)">编辑</Button><Button type="link" :danger="record.status==='enabled'" @click="show(record)">{{ record.status==='enabled'?'下架':'上架' }}</Button></Space>
  </template></EarnAdminTable>
 <EarnAdminModal :open="open" :title="form.status==='enabled'?'下架理财产品':'上架理财产品'" :busy="busy" :confirm-text="'确认'+(form.status==='enabled'?'下架':'上架')" :danger="form.status==='enabled'" @close="open=false" @confirm="save">
  <div v-if="error" ref="errorRef" tabindex="-1"><FeedbackToast  type="error" :source="() => (error)"></FeedbackToast></div>
  <div><TypographyText strong>{{ form.name }}</TypographyText><p>{{ form.status==='enabled'?'确认下架该产品？现有持仓和赎回不受影响。':'确认上架该产品？' }}</p></div>
 </EarnAdminModal>
</template>
