<script setup>
import { computed } from 'vue';
import Chart from '../../components/Chart.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ReportFilters from '../../components/ReportFilters.vue';
import StatCard from '../../components/StatCard.vue';
import AppLayout from '../../layouts/AppLayout.vue';
import { colors } from '../../helpers/chartColors.js';
import { money } from '../../helpers/money.js';
import { useReport } from '../../composables/useReport.js';

const { loading, error, data, load } = useReport('/statistics/employee-contribution');

const segmentColors = computed(() => colors((data.value?.labels ?? []).length));

const totalPie = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ data: data.value?.series?.total ?? [], backgroundColor: segmentColors.value }],
}));

const countPie = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [{ data: data.value?.series?.count ?? [], backgroundColor: segmentColors.value }],
}));
</script>

<template>
    <AppLayout title="Employee Contribution">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Employee Contribution</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :months-back="0" :loading="loading" @apply="load" />
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard label="Total sold" :value="data.totals.total" :format="money" animate />
                    <StatCard label="Total invoices" :value="data.totals.count" animate />
                </div>

                <div v-if="data.labels.length" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <FullWidthBox title="Sold by agent" :collapsible="false">
                        <div class="h-80"><Chart type="pie" :data="totalPie" /></div>
                    </FullWidthBox>
                    <FullWidthBox title="Invoice count by agent" :collapsible="false">
                        <div class="h-80"><Chart type="pie" :data="countPie" /></div>
                    </FullWidthBox>
                </div>
                <p v-else class="text-sm text-gray-500">No agent activity in this range.</p>
            </template>
        </div>
    </AppLayout>
</template>
