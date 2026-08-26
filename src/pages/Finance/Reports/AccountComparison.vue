<script setup>
import { onMounted } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ReportTable from '../../../components/ReportTable.vue';
import Loader from '../../../components/Loader.vue';
import { useReport } from '../../../composables/useReport.js';

// TODO: placeholder endpoint — swap for the real one once it's available.
// No filters specified for this report yet; it just loads on mount. Revisit
// once the endpoint (and whatever filters it needs) is confirmed.
const { loading, error, data, load } = useReport('/finance/reports/4000-vs-5000');

onMounted(() => load());
</script>

<template>
    <AppLayout title="4000 vs 5000" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">4000 vs 5000</h1>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else title="Results" :collapsible="false">
                <Loader v-if="loading" />
                <ReportTable v-else-if="data" :rows="data.rows ?? []" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
