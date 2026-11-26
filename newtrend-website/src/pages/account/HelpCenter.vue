<script setup>
import {computed,ref} from 'vue'
import {t} from '../../i18n'
const filter=ref('aiQuant.templates.filterAll'),query=ref('')
const faqIds=['account1','account2','trade1','trade2','deposit1','deposit2','security1','security2']
const faqs=computed(()=>faqIds.filter(k=>(filter.value==='aiQuant.templates.filterAll'||k.startsWith(filter.value))&&t('profile.helpCenterPage.faq.'+k).toLowerCase().includes(query.value.toLowerCase())))
</script>
<template><input v-model="query" :placeholder="$t(t('profile.helpCenterPage.searchPlaceholder'))" :aria-label="$t(t('profile.helpCenterPage.searchPlaceholder'))" class="wide-button section-gap"/><div class="filter-row"><button v-for="[key,label] in [[&quot;aiQuant.templates.filterAll&quot;,&quot;aiQuant.templates.filterAll&quot;],['account',&quot;profile.helpCenterPage.categories.account&quot;],['trade',&quot;profile.helpCenterPage.categories.trade&quot;],['deposit',&quot;profile.helpCenterPage.categories.deposit&quot;],['security',&quot;profile.helpCenterPage.categories.security&quot;]]" :class="{active:filter===key}" @click="filter=key">{{ $t(label) }}</button></div><details v-for="key in faqs" :key="key" class="account-faq"><summary>{{ $t(t('profile.helpCenterPage.faq.'+key)) }}</summary><p>{{ $t(t('profile.helpCenterPage.faq.'+key+'Answer')) }}</p></details><p v-if="!faqs.length" class="empty">{{ $t(t('profile.helpCenterPage.empty',{query})) }}</p></template>
