<script setup>
import {path} from '../data'
// Single not-found page for unknown routes and unknown ids inside known routes (product, order, strategy record).
</script>
<template>
<div class="container section-pad not-found-page">
 <h1 class="page-title">{{ $t('common.notFound.title') }}</h1>
 <RouterLink class="green-link" :to="path('/')">{{ $t('news.backToHome') }}</RouterLink>
</div>
</template>
