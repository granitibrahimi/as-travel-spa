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

const { loading, error, data, load } = useReport('/statistics/month-concentration');

const halfColors = [color(1), color(3)];

const salesPie = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ data: data.value?.series?.sales ?? [], backgroundColor: halfColors }],
}));

const earningsPie = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ data: data.value?.series?.earnings ?? [], backgroundColor: halfColors }],
}));

const earningsPercentage = computed(() => `${(data.value?.totals?.earnings_percentage ?? 0).toFixed(1)} %`);
</script>

<template>
    <AppLayout title="Month Concentration">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Month Concentration of Sales</h1>
            <p class="text-sm text-gray-500">First half (1–15) vs second half (16–31) of the month.</p>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :months-back="1" :loading="loading" @apply="load" />
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard label="Total sales" :value="data.totals.sales" :format="money" animate />
                    <StatCard label="Total earnings" :value="data.totals.earnings" :format="money" animate />
                    <StatCard label="Earnings %" :value="earningsPercentage" />
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FullWidthBox title="Sales concentration" :collapsible="false">
                        <div class="h-80"><Chart type="pie" :data="salesPie" /></div>
                    </FullWidthBox>
                    <FullWidthBox title="Earnings concentration" :collapsible="false">
                        <div class="h-80"><Chart type="pie" :data="earningsPie" /></div>
                    </FullWidthBox>
                </div>
            </template>
        </div>
    </AppLayout>
</template>
