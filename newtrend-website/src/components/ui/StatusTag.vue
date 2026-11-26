<script setup>
import {computed} from 'vue'
import {statusDomains} from '../../utils/statusLabels.js'
// Order/holding status label. The domain picks the reference look (class) and the translation namespace;
// the status value is added as a class so each look can tone it (pending, active, rejected …).
const props = defineProps({domain: {type: String, required: true}, status: {type: String, required: true}})
const config = computed(() => statusDomains[props.domain])
</script>
<template><span :class="[config.look, status]">{{ $t(config.labels + status) }}</span></template>
