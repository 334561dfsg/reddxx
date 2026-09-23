<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AgentDeliveryCard from '../agent/AgentDeliveryCard.vue'
import { salespersonDelivery } from '../../../features/user-staff/userMfa.js'
import UserStaffSurface from './UserStaffSurface.vue'
import PanelSingleSelect from '../form/PanelSingleSelect.vue'
import { getUserStaffRepository } from '../../repositories/userStaffRepository.js'
import { generateUserPassword, userCredentialText } from '../../../features/user-staff/userCredentials.js'
import { validateNewUser } from '../../../features/user-staff/userStaff.js'
const props=defineProps({visible:Boolean,mode:{type:String,default:'create'},user:{default:null},returnFocus:{default:null}})
const emit=defineEmits(['close','closed','saved'])
const surface=ref(null),first=ref(null),errorRef=ref(null),keepRef=ref(null)
const form=reactive({email:'',phone:'',password:'',confirmPassword:'',isSalesperson:false,employeeId:'',reason:''})
const baseline=ref(''),error=ref(''),errors=ref({}),busy=ref(false),discard=ref(false),discardAction=ref('close'),confirm=ref(false),revision=ref(0),showPassword=ref(false)
const passwordMode=ref('auto'),delivery=ref(null),copying=ref(false),copied=ref(false),deliveryTitle=ref(null)
let session=0,disposed=false
function generatePassword(){try{form.password=generateUserPassword();form.confirmPassword=form.password;errors.value={};copied.value=false}catch{showError('无法生成密码，请选择手动输入')}}
function setPasswordMode(mode){passwordMode.value=mode;errors.value={};if(mode==='auto')generatePassword();else{form.password='';form.confirmPassword=''}}
async function copyCredentials(){if(copying.value||!delivery.value)return;copying.value=true;error.value='';const generation=session;try{await navigator.clipboard.writeText(userCredentialText(delivery.value.email,delivery.value.password));if(!disposed&&generation===session)copied.value=true}catch{if(!disposed&&generation===session)await showError('复制失败，请手动选择账号和密码复制')}finally{if(!disposed&&generation===session)copying.value=false}}
const isCreate=computed(()=>props.mode==='create')
const dirty=computed(()=>JSON.stringify(form)!==baseline.value)
const options=computed(()=>{
  revision.value
  try {
    const repo=getUserStaffRepository(),agents=repo.agents()
    return [{value:'',label:'未分配业务员'},...repo.employees().filter(u=>u.agentParentId&&u.id!==props.user?.id).map(u=>{
      const agent=agents.find(a=>a.id===u.agentParentId)
      return {value:u.id,label:`${u.username} · ${agent?.username||'代理不可用'} · ${u.id}`,searchText:`${u.username} ${u.email} ${u.id} ${agent?.username||''}`,disabled:u.status!=='active'||agent?.status!=='active',agentId:u.agentParentId,agentName:agent?.username}
    })]
  } catch {return []}
})
const title=computed(()=>delivery.value?'用户添加成功':isCreate.value?'添加用户':'设置上级业务员')
const agentLabel=computed(()=>{try{return form.employeeId ? options.value.find(o=>o.value===form.employeeId)?.agentName||'—' : getUserStaffRepository().nameOf(props.user?.agentParentId)}catch{return '—'}})
function reset(){Object.assign(form,{email:'',phone:'',password:'',confirmPassword:'',isSalesperson:false,employeeId:props.user?.employeeId||'',reason:''});baseline.value=JSON.stringify(form);errors.value={};error.value='';busy.value=false;discard.value=false;confirm.value=false;showPassword.value=false;delivery.value=null;copied.value=false;copying.value=false;passwordMode.value='auto';if(isCreate.value)generatePassword();baseline.value=JSON.stringify(form)}
function safeClose(){if(delivery.value)return true;if(dirty.value){discardAction.value='close';discard.value=true;nextTick(()=>keepRef.value?.focus());return false}return true}
function requestReset(){if(dirty.value){discardAction.value='reset';discard.value=true;nextTick(()=>keepRef.value?.focus())}else reset()}
function abandon(){if(discardAction.value==='reset'){reset();nextTick(()=>first.value?.focus());return}baseline.value=JSON.stringify(form);discard.value=false;surface.value.close()}
async function showError(message){error.value=message;await nextTick();if(!disposed&&props.visible)errorRef.value?.focus()}
function validate(){if(isCreate.value){errors.value=validateNewUser(form);if(passwordMode.value==='manual'&&form.password!==form.confirmPassword)errors.value.confirmPassword='两次输入的密码不一致';return Object.values(errors.value)[0]||''}if(!options.value.some(o=>o.value===form.employeeId&&!o.disabled))return '所选业务员不可用，请重新选择';if((props.user?.employeeId||'')===form.employeeId)return '上级业务员未改变';if(form.reason.trim().length>200)return '变更原因不能超过 200 字';return ''}
async function submit(){
  if(busy.value)return
  error.value=''
  const message=validate()
  if(message)return showError(message)
  if(!isCreate.value&&!confirm.value){confirm.value=true;await nextTick();keepRef.value?.focus();return}
  busy.value=true
  const generation=session
  const isCurrent=()=>!disposed&&props.visible&&generation===session
  try{
    const repo=getUserStaffRepository()
    const result=isCreate.value?await repo.createUser({email:form.email,phone:form.phone,password:form.password,isSalesperson:form.isSalesperson,isCurrent}):repo.assignEmployee({customerId:props.user.id,employeeId:form.employeeId,reason:form.reason})
    if(!isCurrent())return
    if(isCreate.value)delivery.value=result.isSalesperson ? salespersonDelivery(result.email,form.password,result.mfaSetup) : {email:result.email,password:form.password}
    form.password='';form.confirmPassword='';baseline.value=JSON.stringify(form);busy.value=false
    emit('saved',{user:result,created:isCreate.value})
    if(isCreate.value){await nextTick();deliveryTitle.value?.focus()}else surface.value.close()
  }catch(e){if(!isCurrent())return;busy.value=false;if(e.fields)errors.value=e.fields;await showError(e.message||'保存失败，请稍后重试')}
}
function closed(){form.password='';form.confirmPassword='';delivery.value=null;showPassword.value=false;emit('closed')}
watch(()=>props.visible,visible=>{session++;if(!visible)return;reset();revision.value++})
onBeforeUnmount(()=>{disposed=true;session++;form.password='';form.confirmPassword='';delivery.value=null})
</script>
<template>
  <UserStaffSurface ref="surface" :visible="visible" :title="title" :subtitle="delivery?'':isCreate?'邮箱作为用户登录名':`${user?.username || ''} · ${user?.id || ''}`" :return-focus="returnFocus" :initial-focus="first" :busy="busy||copying" :before-close="safeClose" @close="emit('close')" @closed="closed">
    <p v-if="error" ref="errorRef" tabindex="-1" role="alert" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{{ error }}</p>
    <div v-if="delivery?.mfaSetup" ref="deliveryTitle" tabindex="-1" class="outline-none"><AgentDeliveryCard :delivery="delivery" @copying="copying=$event" recipient="业务员" title="业务员创建成功，以下信息可发送给业务员" description="初始密码只在本次创建结果中展示；下方卡片可截图发送给业务员，用于设置验证器。" /></div>
    <div v-else-if="delivery" class="space-y-4"><h3 ref="deliveryTitle" tabindex="-1" class="font-medium text-emerald-700">用户已添加，可以复制账号和密码。</h3><div class="rounded-lg border border-slate-200 bg-slate-50 p-4"><pre class="whitespace-pre-wrap break-all text-sm leading-7 select-text">{{ userCredentialText(delivery.email,delivery.password) }}</pre></div><p class="text-xs text-slate-500">密码仅在本次添加成功后展示，关闭后不再显示。</p><p role="status" class="text-sm text-emerald-700">{{ copied?'账号和密码已复制':'' }}</p></div>
    <div v-else-if="discard" class="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 class="font-semibold text-amber-950">{{ discardAction==='reset'?'重置已填写的内容？':'放弃未保存的修改？' }}</h3><p class="mt-2 text-sm text-amber-900">本次填写的内容将被清空，不会保存。</p></div>
    <div v-else-if="confirm" class="space-y-3 text-sm"><h3 class="font-semibold text-slate-900">确认客户归属变更</h3><dl class="space-y-3 rounded-xl bg-slate-50 p-4"><div><dt class="text-slate-500">保存后所属代理</dt><dd>{{ agentLabel }}</dd></div><div><dt class="text-slate-500">原业务员</dt><dd>{{ user?.employeeId ? getUserStaffRepository().nameOf(user.employeeId) : '未分配业务员' }}</dd></div><div><dt class="text-slate-500">新业务员</dt><dd>{{ options.find(o=>o.value===form.employeeId)?.label }}</dd></div></dl><p class="text-slate-600">仅影响后续业务归属，历史业绩保持不变。</p></div>
    <form v-else id="staff-editor-form" class="space-y-5" novalidate @submit.prevent="submit">
      <fieldset :disabled="busy" class="space-y-5">
        <template v-if="isCreate">
          <div><label for="new-user-email" class="block text-sm font-medium text-slate-800">邮箱 <span class="text-rose-600">*</span></label><input id="new-user-email" ref="first" v-model="form.email" type="email" inputmode="email" required maxlength="254" autocomplete="off" :aria-invalid="errors.email?'true':undefined" :aria-describedby="errors.email?'new-user-email-help new-user-email-error':'new-user-email-help'" class="ant-input staff-input" placeholder="name@example.com" /><p id="new-user-email-help" class="mt-1 text-xs text-slate-500">邮箱即登录名，请填写未注册的邮箱。</p><p v-if="errors.email" id="new-user-email-error" class="mt-1 text-xs text-rose-700">{{ errors.email }}</p></div>
          <div><label for="new-user-phone" class="block text-sm font-medium text-slate-800">手机号码（选填）</label><input id="new-user-phone" v-model="form.phone" type="tel" maxlength="20" autocomplete="off" :aria-invalid="errors.phone?'true':undefined" :aria-describedby="errors.phone?'new-user-phone-help new-user-phone-error':'new-user-phone-help'" class="ant-input staff-input" placeholder="86-13600006666" /><p id="new-user-phone-help" class="mt-1 text-xs text-slate-500">格式：66-999918888 / 86-13600006666</p><p v-if="errors.phone" id="new-user-phone-error" class="mt-1 text-xs text-rose-700">{{ errors.phone }}</p></div>
          <div class="space-y-3">
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"><input v-model="form.isSalesperson" type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-blue-600" />是否为业务员</label>
          </div>
          <div class="space-y-3"><p class="text-sm font-medium text-slate-800">初始登录密码 <span class="text-rose-600">*</span></p><div class="flex flex-wrap gap-2" role="group" aria-label="密码设置方式"><button type="button" :class="passwordMode==='auto'?'ant-btn ant-btn-primary':'ant-btn'" :aria-pressed="passwordMode==='auto'" @click="setPasswordMode('auto')">自动生成</button><button type="button" :class="passwordMode==='manual'?'ant-btn ant-btn-primary':'ant-btn'" :aria-pressed="passwordMode==='manual'" @click="setPasswordMode('manual')">手动输入</button></div>
          <div class="grid grid-cols-2 gap-4"><div :class="passwordMode==='auto'?'col-span-2':''"><label for="new-user-password" class="block text-sm font-medium text-slate-800">密码</label><div class="flex items-center gap-2"><input id="new-user-password" v-model="form.password" :type="showPassword?'text':'password'" :readonly="passwordMode==='auto'" required minlength="6" maxlength="128" autocomplete="new-password" :aria-invalid="errors.password?'true':undefined" aria-describedby="new-user-password-help" class="ant-input staff-input" placeholder="设置初始密码" /><button type="button" class="ant-btn mt-1.5 shrink-0" :aria-label="showPassword?'隐藏密码':'显示密码'" :aria-pressed="showPassword" @click="showPassword=!showPassword">{{ showPassword?'隐藏':'显示' }}</button></div><p id="new-user-password-help" class="mt-1 text-xs text-slate-500">{{ errors.password || (passwordMode==='auto'?'已自动生成 16 位密码，可点击“重新生成”更换。':'6–128 位字符。') }}</p></div>
          <div v-if="passwordMode==='manual'"><label for="new-user-confirm-password" class="block text-sm font-medium text-slate-800">确认密码 <span class="text-rose-600">*</span></label><input id="new-user-confirm-password" v-model="form.confirmPassword" :type="showPassword?'text':'password'" required maxlength="128" autocomplete="new-password" class="ant-input staff-input" :aria-invalid="errors.confirmPassword?'true':undefined" :aria-describedby="errors.confirmPassword?'confirm-password-error':undefined" placeholder="请再次输入密码" /><p v-if="errors.confirmPassword" id="confirm-password-error" class="mt-1 text-xs text-rose-700">{{ errors.confirmPassword }}</p></div></div><button v-if="passwordMode==='auto'" type="button" class="ant-btn" @click="generatePassword">重新生成</button></div>
        </template>
        <template v-else>
          <PanelSingleSelect ref="first" v-model="form.employeeId" :options="options" label="上级业务员" placeholder="请选择业务员" search-label="搜索业务员名称、邮箱或 UID" id-base="staff-assign-employee" />
          <p class="text-xs text-slate-500">选择业务员后自动关联其所属代理；选择“未分配业务员”仅解除业务员关系，保留当前代理。</p>
          <label class="block text-sm font-medium text-slate-800">变更原因（选填）<textarea v-model="form.reason" rows="2" maxlength="200" class="ant-input staff-input" /></label>
          <p class="rounded-lg bg-blue-50 p-3 text-xs leading-6 text-blue-800">更换业务员时，所属代理同步更新；历史业绩保留原归属，裂变关系保持不变。</p>
        </template>
      </fieldset>
    </form>
    <template #footer><div class="flex flex-wrap justify-end gap-3">
      <template v-if="delivery"><button type="button" class="ant-btn" :disabled="copying" @click="surface.close()">完成</button><button v-if="!delivery.mfaSetup" type="button" class="ant-btn ant-btn-primary" :disabled="copying" @click="copyCredentials">{{ copying?'复制中…':copied?'再次复制账号和密码':'复制账号和密码' }}</button></template>
      <template v-else-if="discard"><button ref="keepRef" type="button" class="ant-btn" @click="discard=false">继续填写</button><button type="button" class="ant-btn ant-btn-primary" @click="abandon">{{ discardAction==='reset'?'确认重置':'放弃并关闭' }}</button></template>
      <template v-else><button ref="keepRef" type="button" :disabled="busy" class="ant-btn" @click="confirm ? confirm=false : surface.close()">{{ confirm?'返回修改':'取消' }}</button><button v-if="isCreate" type="button" :disabled="busy" class="ant-btn" @click="requestReset">重置</button><button type="button" :disabled="busy" class="ant-btn ant-btn-primary" @click="submit">{{ busy?'保存中…':confirm?'确认变更':isCreate?'确认添加':'下一步' }}</button></template>
    </div></template>
  </UserStaffSurface>
</template>
<style scoped>
.staff-input{margin-top:.375rem}
button:focus-visible{outline:2px solid #1677ff;outline-offset:3px}
button:disabled{cursor:not-allowed;opacity:.5}
</style>
