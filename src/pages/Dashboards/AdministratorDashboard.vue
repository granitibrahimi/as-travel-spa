<script setup>
import { computed, onMounted, ref } from 'vue';
import Chart from '../../components/Chart.vue';
import DashboardWidget from '../../components/DashboardWidget.vue';
import Loader from '../../components/Loader.vue';
import api from '../../helpers/api.js';
import { color } from '../../helpers/chartColors.js';
import { useReport } from '../../composables/useReport.js';

// -- Ranking widget: GET /dashboards/administrator --------------------------
// Shape: { employee_ranking: { from: 'd.m.Y', to: 'd.m.Y', ranking: [{ employee, percentage }] } }
const rankingLoading = ref(true);
const rankingError = ref(null);
const ranking = ref(null);

async function loadRanking() {
    rankingLoading.value = true;
    rankingError.value = null;

    try {
        const { data } = await api.get('/dashboards/administrator');
        ranking.value = data.data.employee_ranking;
    } catch {
        rankingError.value = 'Could not load the ranking right now.';
    } finally {
        rankingLoading.value = false;
    }
}

// -- Earnings widget: GET /statistics/earnings?period=... -------------------
// Shape: { labels: string[], series: { sales, revenue, invoices,
//          customer_payments, supplier_payments: number[] }, totals: {...} }
const periods = [
    { value: 'this-week', label: 'This week' },
    { value: 'last-week', label: 'Last week' },
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' },
];
const period = ref('this-week');

const { loading: earningsLoading, error: earningsError, data: earnings, load: loadEarnings } = useReport('/statistics/earnings');

function selectPeriod(value) {
    period.value = value;
    loadEarnings({ period: value });
}

function lineChart(series) {
    return {
        labels: earnings.value?.labels ?? [],
        datasets: [{
            data: series ?? [],
            borderColor: color(0),
            backgroundColor: color(0),
            pointBackgroundColor: color(0),
            pointRadius: 3,
            tension: 0.3,
            fill: false,
        }],
    };
}

const revenueChart = computed(() => lineChart(earnings.value?.series?.revenue));
const salesChart = computed(() => lineChart(earnings.value?.series?.sales));
const customerPaymentsChart = computed(() => lineChart(earnings.value?.series?.customer_payments));
const supplierPaymentsChart = computed(() => lineChart(earnings.value?.series?.supplier_payments));

const invoicesChart = computed(() => ({
    labels: earnings.value?.labels ?? [],
    datasets: [{ data: earnings.value?.series?.invoices ?? [], backgroundColor: color(0) }],
}));

// Single-series charts read cleaner without a legend or decimal y-ticks.
const chartOptions = {
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { precision: 0 } } },
};

onMounted(() => {
    loadRanking();
    loadEarnings({ period: period.value });
});
</script>

<template>
    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <DashboardWidget :title="ranking ? `Ranking ${ranking.from} - ${ranking.to}` : 'Ranking'">
            <Loader v-if="rankingLoading" />
            <p v-else-if="rankingError" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ rankingError }}</p>

            <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-gray-500">
                            <th class="border border-gray-300 bg-gray-50 px-2 py-2 font-medium">Employee</th>
                            <th class="border border-gray-300 bg-gray-50 px-2 py-2 font-medium">Contribution</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="! ranking?.ranking?.length">
                            <td colspan="2" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No data for this range.</td>
                        </tr>
                        <tr v-for="row in ranking.ranking" :key="row.employee" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">{{ row.employee }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.percentage }}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </DashboardWidget>

        <DashboardWidget title="Earnings">
            <div class="mb-6 flex flex-wrap gap-2">
                <button
                    v-for="option in periods"
                    :key="option.value"
                    type="button"
                    class="rounded border px-3 py-1.5 text-sm"
                    :class="period === option.value ? 'border-gray-400 bg-gray-100 font-medium text-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                    :disabled="earningsLoading"
                    @click="selectPeriod(option.value)"
                >
                    {{ option.label }}
                </button>
            </div>

            <!-- Keep the charts mounted across a filter change (only the very first
                 load shows the spinner) so Chart.js animates between the old and
                 new values instead of the whole card jumping as it unmounts. -->
            <Loader v-if="earningsLoading && ! earnings" />
            <p v-else-if="earningsError" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ earningsError }}</p>

            <div v-else class="space-y-6 transition-opacity" :class="{ 'opacity-50': earningsLoading }">
                <div>
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Revenue</h3>
                    <div class="h-48"><Chart type="line" :data="revenueChart" :options="chartOptions" /></div>
                </div>
                <div>
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Sales</h3>
                    <div class="h-48"><Chart type="line" :data="salesChart" :options="chartOptions" /></div>
                </div>
                <div>
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Invoices</h3>
                    <div class="h-48"><Chart type="bar" :data="invoicesChart" :options="chartOptions" /></div>
                </div>
                <div>
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Customer Payments</h3>
                    <div class="h-48"><Chart type="line" :data="customerPaymentsChart" :options="chartOptions" /></div>
                </div>
                <div>
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Supplier Payments</h3>
                    <div class="h-48"><Chart type="line" :data="supplierPaymentsChart" :options="chartOptions" /></div>
                </div>
            </div>
        </DashboardWidget>
    </div>
</template>
