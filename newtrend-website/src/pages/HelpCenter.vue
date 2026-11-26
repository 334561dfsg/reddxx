<script setup>
// 幫助中心 — a standalone channel (user decision, 2026-11-26), not part of 個人中心: reached from the footer's
// 幫助中心 column, the profile's 支援 group and direct links. Search + category pills over the FAQ accordion, and a
// contact card that opens the support drawer or the announcements. FAQ text is bundled locale content.
import {computed,ref} from 'vue'
import LineIcon from '../components/ui/LineIcon.vue'
import {path} from '../data'
import {t} from '../i18n'
import {openModal} from '../session'
const CATEGORIES = ['account', 'trade', 'deposit', 'security']
const FAQ_IDS = ['account1', 'account2', 'trade1', 'trade2', 'deposit1', 'deposit2', 'security1', 'security2']
const category = ref(''), query = ref('')
const faqs = computed(() => {
  const q = query.value.trim().toLowerCase()
  return FAQ_IDS.filter(id => (!category.value || id.startsWith(category.value)) &&
    (!q || (t('profile.helpCenterPage.faq.' + id) + ' ' + t('profile.helpCenterPage.faq.' + id + 'Answer')).toLowerCase().includes(q)))
})
</script>
<template>
<div class="page-wrap help-page">
 <header class="help-hero">
  <h1>{{ $t('profile.helpCenterPage.title') }}</h1>
  <p>{{ $t('profile.helpCenterPage.subtitle') }}</p>
  <label class="help-search"><LineIcon name="search" aria-hidden="true"/><input v-model="query" type="search" autocomplete="off" :placeholder="$t('profile.helpCenterPage.searchPlaceholder')" :aria-label="$t('profile.helpCenterPage.searchPlaceholder')"/></label>
 </header>

 <div class="help-tabs" role="group" :aria-label="$t('profile.helpCenterPage.categoriesLabel')">
  <button type="button" :aria-pressed="category===''" :class="{active: category===''}" @click="category=''">{{ $t('profile.helpCenterPage.categories.all') }}</button>
  <button v-for="key in CATEGORIES" :key="key" type="button" :aria-pressed="category===key" :class="{active: category===key}" @click="category=key">{{ $t('profile.helpCenterPage.categories.'+key) }}</button>
 </div>

 <section class="help-card" aria-live="polite">
  <p class="help-count">{{ $t('profile.helpCenterPage.resultCount', {count: faqs.length}) }}</p>
  <details v-for="id in faqs" :key="id" class="help-faq">
   <summary><span>{{ $t('profile.helpCenterPage.faq.'+id) }}</span><LineIcon name="chevron-down" aria-hidden="true"/></summary>
   <p>{{ $t('profile.helpCenterPage.faq.'+id+'Answer') }}</p>
  </details>
  <div v-if="!faqs.length" class="help-empty"><LineIcon name="inbox" aria-hidden="true"/>{{ $t('profile.helpCenterPage.empty', {query}) }}</div>
 </section>

 <section class="help-card help-contact">
  <span class="help-contact-icon" aria-hidden="true"><LineIcon name="message-circle"/></span>
  <div><h2>{{ $t('profile.helpCenterPage.contactTitle') }}</h2><p>{{ $t('profile.helpCenterPage.contactDescription') }}</p></div>
  <div class="help-contact-actions">
   <RouterLink class="help-button" :to="path('/messages')">{{ $t('common.announcements') }}</RouterLink>
   <button type="button" class="help-button primary" aria-haspopup="dialog" @click="openModal('support','common.onlineSupport')">{{ $t('profile.contactSupport') }}</button>
  </div>
 </section>
</div>
</template>
<style scoped>
/* Same family as 個人中心: 1280px page, Syne headings, #0c1017 cards with the #191b1f border and 24px corners. */
#main-content .help-page{display:grid;gap:16px;max-width:1280px}
.help-hero{display:grid;gap:12px;justify-items:start;margin-bottom:8px}
#main-content .help-hero h1{margin:0;font-family:var(--nt-font-display);font-size:30px;line-height:38px;font-weight:600;letter-spacing:normal}
.help-hero p{margin:0;color:#a0a1a2;font-size:14px;line-height:20px}
.help-search{display:flex;align-items:center;gap:10px;width:min(560px,100%);min-height:48px;margin-top:8px;padding:0 18px;border:1px solid #191b1f;border-radius:999px;background:#0c1017;color:#a0a1a2}
.help-search:focus-within{background:#11161e}
.help-search svg{width:18px;height:18px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
#main-content .help-search input{flex:1;min-width:0;min-height:46px;padding:0;border:0;background:transparent;color:#fff;font-size:14px;outline:none}
.help-search input::placeholder{color:#6b6d70}
.help-tabs{display:flex;flex-wrap:wrap;gap:8px}
.help-tabs button{min-height:34px;padding:6px 16px;border-radius:999px;background:#141619;color:#a0a1a2;font-size:13px}
.help-tabs button:hover{color:#fff}
.help-tabs button.active{background:#a5ff4a1f;color:var(--nt-accent);font-weight:600}
.help-tabs button:focus-visible{outline:none;text-decoration:underline}
.help-card{border:1px solid #191b1f;border-radius:24px;background:#0c1017;overflow:hidden}
.help-count{margin:0;padding:14px 20px;border-bottom:1px solid #191b1f;color:#a0a1a2;font-size:12px;line-height:18px}
.help-faq+.help-faq{border-top:1px solid #191b1f}
.help-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px;padding:14px 20px;cursor:pointer;list-style:none;font-size:15px;line-height:22px}
.help-faq summary::-webkit-details-marker{display:none}
.help-faq summary:hover{background:#ffffff06}
.help-faq summary:focus-visible{outline:none;background:#ffffff0a;text-decoration:underline}
.help-faq summary svg{width:16px;height:16px;flex-shrink:0;color:#a0a1a2;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .15s ease-out}
.help-faq[open] summary svg{transform:rotate(180deg)}
.help-faq[open] summary{color:var(--nt-accent)}
.help-faq p{margin:0;padding:0 20px 18px;color:#b4b5b6;font-size:14px;line-height:22px}
.help-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 20px;color:#a0a1a2;font-size:13px;text-align:center}
.help-empty svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.help-contact{display:flex;align-items:center;gap:16px;padding:20px}
.help-contact>div:nth-child(2){flex:1;min-width:0}
#main-content .help-contact h2{margin:0 0 2px;font-size:16px;line-height:24px;font-weight:600;letter-spacing:normal}
.help-contact p{margin:0;color:#a0a1a2;font-size:13px;line-height:20px}
.help-contact-icon{display:grid;place-items:center;flex-shrink:0;width:44px;height:44px;border-radius:12px;background:#a5ff4a14;color:var(--nt-accent)}
.help-contact-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.help-contact-actions{display:flex;flex-wrap:wrap;gap:8px;flex-shrink:0}
.help-button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:7px 18px;border-radius:999px;background:#202326;color:#fff;font-size:14px;font-weight:500;white-space:nowrap}
.help-button:hover{background:#2a2e32}
.help-button.primary{background:var(--nt-accent);color:var(--nt-bg)}
.help-button.primary:hover{background:#b6ff6a}
.help-button:focus-visible{outline:none;text-decoration:underline}
@media(prefers-reduced-motion:reduce){.help-faq summary svg{transition:none}}
@media(max-width:640px){.help-contact{flex-direction:column;align-items:stretch}}
</style>
