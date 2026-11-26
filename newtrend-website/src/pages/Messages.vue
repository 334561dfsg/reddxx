<script setup>
import Icon from '../components/Icon.vue'
</script>
<template>
<div class="container section-pad"><h1 class="page-title">{{ $t("common.announcements") }}</h1><div class="card empty"><Icon name="mail"/>{{ $t("content.ui.noAnnouncements") }}</div></div>
</template>
