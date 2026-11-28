<script setup>
// Signed-out prompt (user reference 2026-11-29): one line 「登入 或 立即註冊 後查看 / 去交易」. 登入 opens the embedded login
// dialog (the page then shows its content), 立即註冊 goes to /register and comes back through ?redirect. `fill` centres
// it in the remaining height of a flex-column parent; `page` gives a whole page (account routes) a centred block.
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {path} from '../../data'
import {requireLogin} from '../../session'
const props=defineProps({suffix:{type:String,default:'common.toView'},page:Boolean})
const route=useRoute()
const register=computed(()=>({path:path('/register'),query:{redirect:route.fullPath}}))
</script>
<template>
<div class="guest-prompt" :class="{'guest-page':props.page}">
 <p><button type="button" aria-haspopup="dialog" @click="requireLogin()">{{ $t('auth.login') }}</button> {{ $t('trade.or') }} <RouterLink :to="register">{{ $t('auth.registerNow') }}</RouterLink> {{ $t(suffix) }}</p>
</div>
</template>
<style>
.guest-prompt{display:flex;flex:1;align-items:center;justify-content:center;padding:24px 16px;text-align:center}
.guest-prompt p{margin:0;font-size:14px;line-height:22px;color:var(--nt-text-dim)}
.guest-prompt :is(button,a){padding:0;background:none;color:#fff;font:inherit}
.guest-prompt :is(button,a):hover{color:var(--nt-accent)}
.guest-prompt.guest-page{min-height:max(320px,calc(100dvh - 320px))}
</style>
