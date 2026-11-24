<script setup>
import {computed,ref,watch} from 'vue'
import {useRoute} from 'vue-router'
import {locale,t} from '../i18n'
import {path} from '../data'
import images from '../document-images.json'
const route=useRoute(),loaded=ref({}),loading=ref(true),failed=ref(false),loaders=import.meta.glob('../documents/*.json',{import:'default'});let request=0
async function load(){const n=++request;loading.value=true;failed.value=false;try{const data=await loaders['../documents/'+locale.value+'.json']();if(n===request)loaded.value=data}catch{if(n===request)failed.value=true}finally{if(n===request)loading.value=false}}
watch(locale,load,{immediate:true})
const key=computed(()=>route.params.section==='content'?'content/'+route.params.id:route.params.section),document=computed(()=>loaded.value[key.value])
</script>
<template><article class="legal-page"><template v-if="key==='regulatory-information'"><h1>{{$tr('監管資訊')}}</h1><nav class="regulation-links"><RouterLink v-for="name in ['SEC','SFC','GFSOB','FSRA','FMSB']" :to="path('/content/regulation-'+name.toLowerCase())">{{name}}<span>→</span></RouterLink></nav></template><p v-else-if="loading" role="status">{{t('news.loading')}}</p><div v-else-if="failed" role="alert"><p>{{t('news.errorTitle')}}</p><button class="primary-button" @click="load">{{t('news.retry')}}</button></div><template v-else-if="document"><h1>{{document.title}}</h1><template v-for="(block,i) in document.blocks" :key="i"><img v-if="block.tag==='img'" :src="images[block.src]" :alt="block.alt" loading="lazy"/><component v-else :is="block.tag==='li'?'p':block.tag">{{block.text}}</component></template></template><template v-else><h1>{{t('common.notFound.title')}}</h1><RouterLink :to="path('/')">{{t('news.backToHome')}}</RouterLink></template></article></template>
<style scoped>.legal-page{max-width:1280px;padding:48px 16px;margin:auto;line-height:1.85;min-height:50vh}.legal-page h1{font-size:2.25rem;margin-bottom:32px;line-height:1.3}.legal-page h2,.legal-page h3{margin:32px 0 16px}.legal-page p{color:#fff9;margin:16px 0;white-space:pre-line;overflow-wrap:anywhere}.legal-page img{max-width:100%;height:auto;margin:24px 0}.regulation-links{display:grid;gap:12px}.regulation-links a{display:flex;justify-content:space-between;padding:20px 24px;border:1px solid #ffffff16;border-radius:12px}.regulation-links a:hover{color:var(--nt-accent)}@media(max-width:600px){.legal-page{padding:40px 20px}.legal-page h1{font-size:1.75rem}}</style>
