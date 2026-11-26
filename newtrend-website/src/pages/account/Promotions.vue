<script setup>
import {t} from '../../i18n'
import Icon from '../../components/Icon.vue'
</script>
<template><div class="empty"><Icon name="trophy"/><h2>{{ $t(t('promotion.empty.title')) }}</h2><p>{{ $t(t('promotion.empty.description')) }}</p></div></template>
