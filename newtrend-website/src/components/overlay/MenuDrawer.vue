<script setup>
import {kycStatus} from '../../utils/accountBadge.js'
import {useCopyFeedback} from '../../composables/useCopyFeedback.js'
import FeedbackToast from '../../platform/FeedbackToast.js'
import {isDemo,MODES} from '../../utils/accountMode.js'
import {computed,shallowRef} from 'vue'
import LineIcon from '../ui/LineIcon.vue'
import {navGroups,path} from '../../data'
import {availableInMode} from '../../utils/demoAccess.js'
import {session,logout} from '../../session'
import {account,DEMO_UID} from '../../account'
import {languages,locale,t} from '../../i18n'
// Mobile navigation drawer body, laid out after the GMXX mobile sidebar (user reference, 2026-11-27) in the
// NewQuantCapital style: user card (name, UID copy, credit score), a verification reminder, icon rows for pages and
// expandable groups (trading, finance, AI Quant: only their pages, no subtitles or overview entry); language opens the language picker sheet like GMXX; then account rows (mode, security, clear cache, log out).
// Navigation, mode switches, language changes and clearing the cache are reported to the overlay shell, which owns
// the closing order (close first, then act) and the dialog lifecycle.
const emit=defineEmits(['close','navigate','switch-mode','open-language','clear-cache'])
const expanded=shallowRef('')
const toggle=key=>{expanded.value=expanded.value===key?'':key}
const groupIcons={'common.trade':'candlestick','common.finance':'landmark','aiQuant.landing.eyebrow':'ai-chip'}
const verified=computed(()=>kycStatus(account).verified)
const currentLanguage=computed(()=>languages.find(([code])=>code===locale.value)?.[1]||locale.value)
// The drawer is a dialog: the copy toast renders in its layer (useCopyFeedback), not under it.
const {feedback,copy}=useCopyFeedback()
const copyUid=()=>copy(DEMO_UID)
function signout(){logout();emit('close')}
</script>
<template>
<div class="menu-drawer">
 <section v-if="session.loggedIn" class="drawer-user">
  <div class="drawer-user-head">
   <span class="drawer-avatar" aria-hidden="true"><LineIcon name="user"/></span>
   <div class="drawer-user-text">
    <div class="drawer-user-top"><strong>{{ account.name||$t('common.unnamed') }}</strong><span class="drawer-credit">{{ $t('profile.center.overview.credit',{score:100}) }}</span></div>
    <span class="drawer-uid">UID: {{ DEMO_UID }}<button type="button" :aria-label="$t('common.copy')" @click="copyUid"><LineIcon name="copy"/></button><FeedbackToast v-if="feedback" :type="feedback.type" :source="() => feedback ? $t(feedback.key) : ''"/></span>
   </div>
  </div>
  <div v-if="!verified" class="drawer-verify"><span>{{ $t('common.drawer.verifyReminder') }}</span><button type="button" @click="$emit('navigate','/kyc')">{{ $t('common.drawer.verifyAction') }}</button></div>
 </section>
 <div v-else class="drawer-guest">
  <button type="button" class="primary-button" @click="$emit('navigate','/login')">{{ $t('auth.login') }}</button>
  <button type="button" class="secondary-button" @click="$emit('navigate','/register')">{{ $t('auth.register') }}</button>
 </div>

 <nav class="drawer-nav" :aria-label="$t('common.menu')">
  <RouterLink class="drawer-row" :to="path('/')" @click="$emit('close')"><LineIcon name="home"/><span>{{ $t('common.home') }}</span></RouterLink>
  <template v-if="session.loggedIn">
   <RouterLink class="drawer-row" :to="path('/profile')" @click="$emit('close')"><LineIcon name="user"/><span>{{ $t('profile.center.rows.backToProfile') }}</span></RouterLink>
   <RouterLink v-if="!isDemo(session.mode)" class="drawer-row" :to="path('/deposit')" @click="$emit('close')"><LineIcon name="download"/><span>{{ $t('common.assetsMenu.deposit') }}</span></RouterLink>
  </template>
  <button type="button" class="drawer-row" aria-haspopup="dialog" @click="$emit('open-language')"><LineIcon name="globe"/><span>{{ $t('common.language') }}</span><em>{{ currentLanguage }}</em><LineIcon name="chevron-right" class="drawer-caret"/></button>
  <template v-for="g in navGroups" :key="g.label">
   <button type="button" class="drawer-row" :aria-expanded="expanded===g.label" :aria-controls="'drawer-'+g.label" @click="toggle(g.label)"><LineIcon :name="groupIcons[g.label]||'chevron-right'"/><span>{{ $t(g.label) }}</span><LineIcon name="chevron-down" class="drawer-caret"/></button>
   <div v-if="expanded===g.label" :id="'drawer-'+g.label" class="drawer-sub">
    <RouterLink v-for="item in g.items.filter(i=>availableInMode(i[2]))" :key="item[0]" :to="path(item[2])" @click="$emit('close')">{{ $t(item[0]) }}</RouterLink>
   </div>
  </template>
  <RouterLink v-if="session.loggedIn" class="drawer-row" :to="path('/assets')" @click="$emit('close')"><LineIcon name="wallet"/><span>{{ $t('assets.pageTitle') }}</span></RouterLink>
  <RouterLink class="drawer-row" :to="path('/news')" @click="$emit('close')"><LineIcon name="newspaper"/><span>{{ $t('common.news') }}</span></RouterLink>
  <RouterLink class="drawer-row" :to="path('/charity')" @click="$emit('close')"><LineIcon name="heart"/><span>{{ $t('common.charity') }}</span></RouterLink>
 </nav>

 <div v-if="session.loggedIn" class="drawer-account">
  <div class="drawer-row static"><LineIcon name="repeat"/><span id="drawer-mode-label">{{ $t('common.drawer.accountMode') }}</span>
   <div class="drawer-mode" role="group" aria-labelledby="drawer-mode-label"><button v-for="m in MODES" :key="m" type="button" :class="{active:session.mode===m}" :aria-pressed="session.mode===m" @click="$emit('switch-mode',m)">{{ $t(m) }}</button></div>
  </div>
  <RouterLink class="drawer-row" :to="{path:path('/profile'),hash:'#security'}" @click="$emit('close')"><LineIcon name="shield"/><span>{{ $t('profile.center.security.title') }}</span></RouterLink>
  <button type="button" class="drawer-row" aria-haspopup="dialog" @click="$emit('clear-cache')"><LineIcon name="eraser"/><span>{{ $t('profile.center.nav.clearCache') }}</span></button>
  <button type="button" class="drawer-row logout" @click="signout"><LineIcon name="log-out"/><span>{{ $t('profile.logout') }}</span></button>
 </div>
</div>
</template>
<style scoped>
.menu-drawer{display:grid;gap:8px}
.drawer-user{display:grid;gap:12px;padding:8px 0 16px;border-bottom:1px solid #ffffff0d}
.drawer-user-head{display:flex;align-items:center;gap:12px;min-width:0}
.drawer-avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#ffffff0f;flex-shrink:0}
.drawer-avatar svg,.drawer-row svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
.drawer-user-text{display:grid;gap:2px;min-width:0;flex:1}
.drawer-user-top{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.drawer-user-text strong{font-size:15px;line-height:22px;overflow-wrap:anywhere}
.drawer-uid{display:inline-flex;align-items:center;gap:4px;color:#fff8;font-size:12px;line-height:18px;white-space:nowrap}
.drawer-uid button{display:grid;place-items:center;width:28px;height:28px;margin:-6px 0;border-radius:6px;color:#fff8}
.drawer-uid svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.6}
.drawer-credit{flex-shrink:0;padding:2px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--nt-accent) 35%,transparent);background:color-mix(in srgb,var(--nt-accent) 10%,transparent);color:var(--nt-accent);font-size:12px;line-height:18px;white-space:nowrap}
.drawer-verify{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:var(--nt-radius-control);background:color-mix(in srgb,#f5a524 12%,transparent);color:#f5c06a;font-size:12px;line-height:18px}
.drawer-verify button{flex-shrink:0;color:var(--nt-accent);font-weight:600;min-height:32px}
.drawer-guest{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 0 16px;border-bottom:1px solid #ffffff0d}
.drawer-guest button{padding:9px 12px}
.drawer-nav,.drawer-account{display:grid}
.drawer-account{margin-top:4px;padding-top:8px;border-top:1px solid #ffffff0d}
.drawer-row{display:flex;align-items:center;gap:14px;width:100%;min-height:48px;padding:0 4px;text-align:left;color:#fffd;border-radius:var(--nt-radius-control)}
.drawer-row>span{flex:1;min-width:0;overflow-wrap:anywhere}
.drawer-row>em{font-style:normal;color:#fff8;font-size:13px}
.drawer-row svg:first-child{color:#fff9}
.drawer-row:hover,.drawer-row:focus-visible{outline:none;background:#ffffff08}
.drawer-row[aria-expanded="true"]{color:var(--nt-accent)}
.drawer-row[aria-expanded="true"] svg:first-child{color:var(--nt-accent)}
.drawer-caret{width:16px!important;height:16px!important;transition:transform 150ms ease-out}
.drawer-row[aria-expanded="true"] .drawer-caret{transform:rotate(180deg)}
.drawer-row.static:hover{background:none}
.drawer-row.logout{color:#ff6b81}
.drawer-row.logout svg:first-child{color:#ff6b81}
.drawer-sub{display:grid;padding:0 0 8px 38px}
.drawer-sub>a{display:block;padding:10px 8px;border-radius:var(--nt-radius-control);color:#fffd}
.drawer-sub>a:hover,.drawer-sub>a:focus-visible{outline:none;background:#ffffff08}
.drawer-mode{display:flex;padding:3px;border-radius:999px;background:#ffffff0d;flex-shrink:0}
.drawer-mode button{min-height:30px;padding:0 12px;border-radius:999px;color:#fff9;font-size:13px}
.drawer-mode button.active{background:var(--nt-accent);color:#05070b;font-weight:600}
@media(prefers-reduced-motion:reduce){.drawer-caret{transition:none}}
</style>
