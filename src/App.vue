<script setup>
import { RouterView } from 'vue-router';
import IdleWarning from './components/IdleWarning.vue';
import ToastHost from './components/ToastHost.vue';
import SyncScreen from './components/SyncScreen.vue';
import GlobalSearch from './components/GlobalSearch.vue';
import NavPalette from './components/NavPalette.vue';
</script>

<template>
    <!--
        Key the routed page by path so navigating between two records of the
        same route (e.g. /customers/customers/5371 -> /5372, from a link or the
        double-Shift search) fully remounts it and its onMounted fetch re-runs.
        Without this, Vue Router reuses the component instance and the view
        keeps showing the previous record. Keyed on `path` (not `fullPath`) so
        query-only changes still reuse the instance.
    -->
    <RouterView v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
    </RouterView>
    <IdleWarning />
    <ToastHost />
    <SyncScreen />
    <GlobalSearch />
    <NavPalette />
</template>
