<script setup>
import { computed } from 'vue';
import Chart from '../../components/Chart.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ReportFilters from '../../components/ReportFilters.vue';
import StatCard from '../../components/StatCard.vue';
import AppLayout from '../../layouts/AppLayout.vue';
import { color } from '../../helpers/chartColors.js';
import { money } from '../../helpers/money.js';
import { useReport } from '../../composables/useReport.js';

const { loading, error, data, load } = useReport('/statistics/count-invoices');

const countChart = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ label: 'Invoices', data: data.value?.series?.count ?? [], backgroundColor: color(1) }],
}));

const totalChart = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ label: 'Total amount (€)', data: data.value?.series?.total ?? [], backgroundColor: color(2) }],
}));
</script>

<template>
    <AppLayout title="Count Invoices">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Count Invoices</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :months-back="3" :loading="loading" @apply="load" />
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard label="Total invoices" :value="data.totals.count" animate />
                    <StatCard label="Total amount" :value="data.totals.total" :format="money" animate />
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FullWidthBox title="Invoices per month" :collapsible="false">
                        <div class="h-72"><Chart type="bar" :data="countChart" /></div>
                    </FullWidthBox>
                    <FullWidthBox title="Total amount per month" :collapsible="false">
                        <div class="h-72"><Chart type="bar" :data="totalChart" /></div>
                    </FullWidthBox>
                </div>
            </template>
        </div>
    </AppLayout>
</template>
