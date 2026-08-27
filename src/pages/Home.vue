<script setup>
import { defineAsyncComponent } from 'vue';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/auth';
import { useLayoutStore } from '../stores/layout';

// Lazy — only the active workspace's dashboard is ever rendered (see the
// v-if chain below), but a static import would still bundle all three (and
// AdministratorDashboard's chart.js dependency) into this page's chunk.
const CrmDashboard = defineAsyncComponent(() => import('./Dashboards/CrmDashboard.vue'));
const AdministratorDashboard = defineAsyncComponent(() => import('./Dashboards/AdministratorDashboard.vue'));
const FinanceDashboard = defineAsyncComponent(() => import('./Dashboards/FinanceDashboard.vue'));

const auth = useAuthStore();
const layout = useLayoutStore();
</script>

<template>
    <AppLayout title="Home" fluid>
        <!-- Each workspace gets its own dashboard here; others fall back to the welcome banner. -->
        <CrmDashboard v-if="layout.activeWorkspace === 'crm'" />
        <AdministratorDashboard v-else-if="layout.activeWorkspace === 'administration'" />
        <FinanceDashboard v-else-if="layout.activeWorkspace === 'finance'" />

        <div v-else class="space-y-4">
            <h1 class="text-2xl font-bold">Welcome, {{ auth.user?.name }}</h1>
            <p class="text-gray-600">
                You are signed in to the AS Travel SPA, talking to the platform API over a bearer token.
            </p>
        </div>
    </AppLayout>
</template>
