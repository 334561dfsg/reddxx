<script setup>
import FeedbackToast from '../platform/FeedbackToast.js'
import {sanitizeHtml} from '../platform/regulatoryClient.js'
import {computed,ref,watch} from 'vue'
import {useRoute} from 'vue-router'
import {locale,t} from '../i18n'
import {path} from '../data'
import images from '../content/document-images.json'
import RequestState from '../components/ui/RequestState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import {useRequest} from '../composables/useRequest.js'
import {getRegulatory,listRegulatory} from '../api/regulatory.js'
const route=useRoute(),loaded=ref({}),loading=ref(true),failed=ref(false),loaders=import.meta.glob('../content/documents/*.json',{import:'default'});let request=0
const key=computed(()=>route.params.section==='content'?'content/'+route.params.id:route.params.section)
// 监管资讯 (index and /content/regulation-*) reads the shared regulatory module (admin 内容管理 → 监管资讯); other legal pages keep the bundled documents.
const isIndex=computed(()=>key.value==='regulatory-information'),regSlug=computed(()=>route.params.section==='content'&&/^regulation-/.test(route.params.id||'')?route.params.id:'')
const isDocument=computed(()=>!isIndex.value&&!regSlug.value)
async function load(){if(!isDocument.value)return;const n=++request;loading.value=true;failed.value=false;try{const data=await loaders['../content/documents/'+locale.value+'.json']();if(n===request)loaded.value=data}catch{if(n===request)failed.value=true}finally{if(n===request)loading.value=false}}
watch([locale,isDocument],load,{immediate:true})
const document=computed(()=>loaded.value[key.value])
const listRequest=useRequest(()=>isIndex.value?listRegulatory(locale.value):Promise.resolve(null),{key:()=>isIndex.value&&locale.value,immediate:isIndex.value})
const entryRequest=useRequest(()=>regSlug.value?getRegulatory(regSlug.value,locale.value):Promise.resolve(null),{key:()=>regSlug.value&&[regSlug.value,locale.value].join('|'),immediate:!!regSlug.value})
const entry=computed(()=>regSlug.value&&entryRequest.status.value==='ready'?entryRequest.data.value:null)
const entryMissing=computed(()=>entryRequest.status.value==='error'&&entryRequest.error.value?.code==='notFound')
const isImage=a=>a.type.startsWith('image/')
const docs=computed(()=>entry.value?entry.value.attachments.filter(a=>!isImage(a)):[])
const fileSize=bytes=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB'
const fileType=a=>a.type==='application/pdf'?'PDF':a.type.split('/').pop().toUpperCase()
</script>
<template><article class="legal-page">
<template v-if="isIndex"><h1>{{$t("common.regulatoryInformation")}}</h1>
 <RequestState :status="listRequest.status.value" :error="listRequest.error.value" @retry="listRequest.refresh">
  <template #loading><div class="regulation-links"><span v-for="n in 5" :key="n" class="regulation-link-skeleton"><Skeleton width="72px" height="16px"/></span></div></template>
  <nav v-if="listRequest.data.value?.length" class="regulation-links" :aria-label="$t('common.regulatoryInformation')"><RouterLink v-for="e in listRequest.data.value" :key="e.entryId" :to="path('/content/'+e.slug)">{{e.title}}<span aria-hidden="true">→</span></RouterLink></nav>
  <p v-else class="regulation-empty">{{t('regulatory.empty')}}</p>
 </RequestState>
</template>
<template v-else-if="regSlug">
 <template v-if="entry"><h1>{{entry.title}}</h1>
  <!-- Body is the admin editor's HTML, cleaned again to the allow-list before rendering. -->
  <div class="regulation-body" v-html="sanitizeHtml(entry.body)"></div>
  <img v-for="a in entry.attachments.filter(isImage)" :key="a.attachmentId" :src="a.url" :alt="a.name" loading="lazy"/>
  <section v-if="docs.length" class="regulation-files"><h2>{{t('regulatory.attachments')}}</h2><ul><li v-for="a in docs" :key="a.attachmentId"><a :href="a.url" target="_blank" rel="noopener">{{a.name}}</a><span>{{fileType(a)}} · {{fileSize(a.size)}}</span></li></ul></section>
  <RouterLink class="regulation-back" :to="path('/regulatory-information')">{{t('regulatory.backToList')}}</RouterLink>
 </template>
 <template v-else-if="entryMissing"><h1>{{t('common.notFound.title')}}</h1><RouterLink :to="path('/regulatory-information')">{{t('regulatory.backToList')}}</RouterLink></template>
 <RequestState v-else :status="entryRequest.status.value" :error="entryRequest.error.value" @retry="entryRequest.refresh">
  <template #loading><h1><Skeleton inline width="160px"/></h1><Skeleton v-for="n in 6" :key="n" class="regulation-line-skeleton" :width="n%3?'100%':'62%'"/></template>
 </RequestState>
</template>
<p v-else-if="loading" role="status">{{t('news.loading')}}</p><FeedbackToast v-else-if="failed" type="error" :source="() => (failed) ? (([[String((t('news.errorTitle')) ?? '')].join(''),''].join(''))) : ''"><button class="primary-button" @click="load">{{t('news.retry')}}</button></FeedbackToast><template v-else-if="document"><h1>{{document.title}}</h1><template v-for="(block,i) in document.blocks" :key="i"><img v-if="block.tag==='img'" :src="images[block.src]" :alt="block.alt" loading="lazy"/><component v-else :is="block.tag==='li'?'p':block.tag">{{block.text}}</component></template></template><template v-else><h1>{{t('common.notFound.title')}}</h1><RouterLink :to="path('/')">{{t('news.backToHome')}}</RouterLink></template></article></template>
<style scoped>.legal-page{max-width:1280px;padding:48px 16px;margin:auto;line-height:1.85;min-height:50vh}.legal-page h1{font-size:2.25rem;margin-bottom:32px;line-height:1.3}.legal-page h2,.legal-page h3{margin:32px 0 16px}.legal-page p{color:var(--nt-text-secondary);margin:16px 0;white-space:pre-line;overflow-wrap:anywhere}.legal-page img{max-width:100%;height:auto;margin:24px 0}.regulation-links{display:grid;gap:12px}.regulation-links a,.regulation-link-skeleton{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border:1px solid #ffffff16;border-radius:var(--nt-radius-panel)}.regulation-link-skeleton{min-height:67px}.regulation-links a:hover{color:var(--nt-accent)}.regulation-empty{text-align:center}.regulation-line-skeleton{margin:24px 0}.regulation-body :deep(:is(h2,h3)){margin:32px 0 16px}.regulation-body :deep(p){color:var(--nt-text-secondary);margin:16px 0;overflow-wrap:anywhere}.regulation-body :deep(:is(ul,ol)){color:var(--nt-text-secondary);padding-left:24px;margin:16px 0}.regulation-body :deep(a){color:var(--nt-accent);text-decoration:underline}.regulation-files ul{display:grid;gap:12px;padding:0;margin:0;list-style:none}.regulation-files li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 16px;padding:16px 20px;border:1px solid #ffffff16;border-radius:var(--nt-radius-panel)}.regulation-files a{color:var(--nt-accent);overflow-wrap:anywhere}.regulation-files span{color:var(--nt-text-dim)}.regulation-back{display:inline-block;margin-top:32px;color:var(--nt-accent)}@media(max-width:600px){.legal-page{padding:40px 20px}.legal-page h1{font-size:1.75rem}}</style>
