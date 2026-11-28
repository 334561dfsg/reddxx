<script setup>
// Embedded login (Overlay type 'login', user decision 2026-11-29): a signed-out action inside a channel (理財 / C2C /
// 借貸 / 策略 / 量化基金) opens this dialog over the page instead of leaving for /login, so the page keeps its state.
// Login uses the shared LoginForm; on success the dialog signs in and closes, and Overlay then re-runs the action.
// 註冊 / 忘記密碼 are full pages (longer flows) that come back here through ?redirect; 連接錢包 hands over to the
// wallet dialog, which continues the same action after connecting.
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {path} from '../../data'
import {login} from '../../session'
import Icon from '../Icon.vue'
import LoginForm from '../auth/LoginForm.vue'
const emit=defineEmits(['state','success','wallet'])
const route=useRoute()
const register=computed(()=>({path:path('/register'),query:{redirect:route.fullPath}}))
function done(){login();emit('success')}
</script>
<template>
<div class="auth-form login-dialog">
 <p class="login-dialog-switch">{{ $t('auth.noAccountYet') }} <RouterLink class="green-link" :to="register">{{ $t('auth.register') }}</RouterLink></p>
 <LoginForm @state="emit('state',$event)" @success="done"/>
 <div class="divider"><span>{{ $t('auth.or') }}</span></div>
 <button type="button" class="secondary-button wide-button" @click="emit('wallet')"><Icon name="wallet"/>{{ $t('common.connectWallet') }}</button>
</div>
</template>
<style>
.nt-dialog .login-dialog .form-stack{margin-top:16px}
.nt-dialog .login-dialog label,.nt-dialog .login-dialog .phone-field{display:grid;gap:8px;font-size:var(--nt-text-body);line-height:20px}
.nt-dialog .login-dialog .phone-row{display:flex;gap:8px;position:relative}
.nt-dialog .login-dialog .phone-row>.dial-picker{position:static}
.nt-dialog .login-dialog .phone-row>input{flex:1;min-width:0}
/* 或 between two rules, so it does not depend on the dialog's background colour. */
.nt-dialog .login-dialog .divider{display:flex;align-items:center;gap:12px;margin:20px 0;border:0}
.nt-dialog .login-dialog .divider::before,.nt-dialog .login-dialog .divider::after{content:'';flex:1;border-top:1px solid var(--nt-border)}
.nt-dialog .login-dialog .divider span{position:static;padding:0;background:none}
.login-dialog-switch{color:var(--nt-text-dim);font-size:var(--nt-text-body);line-height:20px}
</style>
