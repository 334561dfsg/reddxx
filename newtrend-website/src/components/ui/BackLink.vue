<script setup>
import {onBeforeUnmount,onMounted} from 'vue'
import LineIcon from './LineIcon.vue'
// Shared back navigation for secondary pages. Desktop: the "← back" link in the page. Phones (≤767px, user decision
// 2026-11-27): an app-style top bar instead — back arrow left, page title centred, pinned to the top — and the site
// header is hidden while the page is shown (html.nt-has-page-bar). Extra attrs (classes, aria-disabled, click guards)
// apply to both links, so a busy page blocks back navigation in either form.
defineOptions({inheritAttrs:false})
const props=defineProps({to:{type:[String,Object],required:true},title:{type:String,default:''}})
onMounted(()=>document.documentElement.classList.add('nt-has-page-bar'))
onBeforeUnmount(()=>document.documentElement.classList.remove('nt-has-page-bar'))
</script>
<template>
<RouterLink :to="to" class="nt-back-link" v-bind="$attrs"><LineIcon name="arrow-left" aria-hidden="true"/><slot/></RouterLink>
<Teleport to="body">
 <header class="nt-page-bar">
  <RouterLink :to="to" class="nt-page-bar-back" v-bind="{...$attrs,class:undefined}" :aria-label="$t('common.back')"><LineIcon name="arrow-left" aria-hidden="true"/></RouterLink>
  <strong class="nt-page-bar-title">{{ title }}</strong>
  <span class="nt-page-bar-end" aria-hidden="true"></span>
 </header>
</Teleport>
</template>
<style>
.nt-back-link{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:14px;line-height:20px;color:#87888a;text-decoration:none}
.nt-back-link svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nt-back-link:hover,.nt-back-link:focus-visible{outline:none;color:#fff;text-decoration:underline;text-underline-offset:3px}
.nt-back-link[aria-disabled=true],.nt-page-bar-back[aria-disabled=true]{opacity:.5;pointer-events:none}
.nt-page-bar{display:none}
@media(max-width:767px){
 html.nt-has-page-bar #site-shell>.site-header{display:none}
 html.nt-has-page-bar #site-shell{padding-top:calc(48px + env(safe-area-inset-top))}
 /* Beats page-specific back-link layouts (.qf-back, .earn-back …): the bar replaces the in-page link on phones. */
 html.nt-has-page-bar body #site-shell a.nt-back-link.nt-back-link{display:none}
 /* Section tabs (e.g. 量化基金 / 我的倉位) belong to the list pages, not to a secondary page. */
 html.nt-has-page-bar body #site-shell #main-content .quant-page .subnav{display:none}
 .nt-page-bar{position:fixed;top:0;left:0;right:0;z-index:30;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;height:calc(48px + env(safe-area-inset-top));padding:env(safe-area-inset-top) max(4px,env(safe-area-inset-right)) 0 max(4px,env(safe-area-inset-left));background:var(--nt-bg,#05070b);border-bottom:1px solid #ffffff0d}
 .nt-page-bar-back{display:grid;place-items:center;width:44px;height:44px;color:#fff;border-radius:12px}
 .nt-page-bar-back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
 .nt-page-bar-back:focus-visible{outline:none;background:#ffffff10}
 .nt-page-bar-title{overflow:hidden;text-align:center;white-space:nowrap;text-overflow:ellipsis;font-size:16px;line-height:24px;font-weight:600;color:#fff}
}
</style>
