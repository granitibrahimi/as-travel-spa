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

const { loading, error, data, load } = useReport('/statistics/sales-with-svc');

const chart = computed(() => ({
    labels: data.value?.labels ?? [],
    datasets: [
        { label: 'Sold', data: data.value?.series?.sold ?? [], backgroundColor: color(0) },
        { label: 'Earnings (SVC)', data: data.value?.series?.earnings ?? [], backgroundColor: color(2) },
        { label: 'Buy', data: data.value?.series?.buy ?? [], backgroundColor: color(3) },
    ],
}));

const earningsPercentage = computed(() => `${(data.value?.totals?.earnings_percentage ?? 0).toFixed(1)} %`);

// Per-month breakdown for the table above the chart — newest month first.
const monthlyBreakdown = computed(() => {
    const labels = data.value?.labels ?? [];
    const sold = data.value?.series?.sold ?? [];
    const earnings = data.value?.series?.earnings ?? [];

    return labels
        .map((label, i) => {
            const soldValue = sold[i] ?? 0;
            const earningsValue = earnings[i] ?? 0;
            const percentage = soldValue ? Math.round((earningsValue / soldValue) * 100) : 0;

            return { label, sold: soldValue, earnings: earningsValue, percentage };
        })
        .reverse();
});
</script>

<template>
    <AppLayout title="Sales with SVC" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Sales with SVC</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :months-back="12" :loading="loading" @apply="load" />
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total sold" :value="data.totals.sold" :format="money" animate />
                    <StatCard accent label="Total earnings" :value="data.totals.earnings" :format="money" animate />
                    <StatCard label="Total buy" :value="data.totals.buy" :format="money" animate />
                    <StatCard label="Earnings %" :value="earningsPercentage" />
                </div>

                <FullWidthBox title="Sold / earnings / buy per month" :collapsible="false">
                    <div class="always-scroll overflow-x-scroll">
                        <table class="w-full border-collapse border border-gray-300 text-center text-sm">
                            <thead>
                                <tr class="text-gray-700">
                                    <th v-for="month in monthlyBreakdown" :key="month.label" class="border border-gray-300 bg-gray-50 px-4 py-2 font-semibold whitespace-nowrap">
                                        {{ month.label }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td v-for="month in monthlyBreakdown" :key="month.label" class="border border-gray-300 px-4 py-2 tabular-nums whitespace-nowrap">
                                        <div>{{ money(month.sold) }}</div>
                                        <div class="font-bold">{{ money(month.earnings) }}</div>
                                        <div>{{ month.percentage }}%</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-6 h-80"><Chart type="bar" :data="chart" /></div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>

<style scoped>
/* Force a persistently visible horizontal scrollbar for the monthly table —
   macOS/mobile overlay scrollbars hide themselves until actively scrolling,
   which makes a wide table look uncroppable at a glance. */
.always-scroll {
    scrollbar-width: thin; /* Firefox */
}

.always-scroll::-webkit-scrollbar {
    height: 8px;
}

.always-scroll::-webkit-scrollbar-track {
    background: #f3f4f6;
}

.always-scroll::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 4px;
}
</style>
