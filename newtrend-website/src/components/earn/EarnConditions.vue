<script setup>
import {computed} from 'vue'
import {eligibilityFailures} from '../../platform/lendingRules.js'
import {earnMockProfile} from '../../utils/earnEligibility'
import {path} from '../../data'
const props=defineProps({product:{type:Object,required:true}})
defineEmits(['navigate'])
const failures=computed(()=>eligibilityFailures(props.product,earnMockProfile))
</script>
<template>
 <section class="earn-panel">
  <h2>{{$t('lending.requirements')}}</h2>
  <p>{{$t('lending.verification')}}: {{!product.minVerificationLevel||product.minVerificationLevel==='none'?$t('lending.unrestricted'):$t('lending.levels.'+product.minVerificationLevel)}} · VIP {{product.minVipLevel||$t('lending.unrestricted')}}</p>
  <p class="earn-caption">{{$t('lending.mockProfile')}}: {{$t('lending.levels.'+earnMockProfile.verificationLevel)}} · VIP {{earnMockProfile.vipLevel}}</p>
  <p v-for="reason in failures" :key="reason" ><RouterLink :to="path(reason==='verificationRequired'?'/kyc':'/profile')" @click="$emit('navigate')">{{$t(reason==='verificationRequired'?'lending.goVerify':'lending.goVip')}}</RouterLink></p>
 </section>
</template>
