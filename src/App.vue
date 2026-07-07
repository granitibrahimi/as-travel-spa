<script setup>
import { RouterView } from 'vue-router';
import IdleWarning from './components/IdleWarning.vue';
import ToastHost from './components/ToastHost.vue';
import SyncScreen from './components/SyncScreen.vue';
</script>

<template>
    <RouterView />
    <IdleWarning />
    <ToastHost />
    <SyncScreen />
</template>
