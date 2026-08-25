<script setup>
import { RouterView } from 'vue-router';
import IdleWarning from './components/IdleWarning.vue';
import ToastHost from './components/ToastHost.vue';
import SyncScreen from './components/SyncScreen.vue';
import GlobalSearch from './components/GlobalSearch.vue';
</script>

<template>
    <RouterView />
    <IdleWarning />
    <ToastHost />
    <SyncScreen />
    <GlobalSearch />
</template>
