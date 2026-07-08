<script setup>
import { computed } from 'vue';
import Chart from '../../components/Chart.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ReportFilters from '../../components/ReportFilters.vue';
import StatCard from '../../components/StatCard.vue';
import AppLayout from '../../layouts/AppLayout.vue';
import { color } from '../../helpers/chartColors.js';
import { useReport } from '../../composables/useReport.js';

const { loading, error, data, load } = useReport('/statistics/days-before-event');

const chart = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ label: 'Invoices', data: data.value?.series?.count ?? [], backgroundColor: color(4) }],
}));
</script>

<template>
    <AppLayout title="Days Before Event" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Days Before Event</h1>
            <p class="text-sm text-gray-500">How far ahead of departure invoices are issued.</p>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :months-back="3" :loading="loading" @apply="load" />
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <StatCard label="Invoices in range" :value="data.totals.count" animate />

                <FullWidthBox title="Lead-time distribution" :collapsible="false">
                    <div class="h-80"><Chart type="bar" :data="chart" /></div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
