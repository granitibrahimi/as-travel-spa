<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from '../../components/Button.vue';
import Chart from '../../components/Chart.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ReportFilters from '../../components/ReportFilters.vue';
import StatCard from '../../components/StatCard.vue';
import InputText from '../../components/Form/InputText.vue';
import AppLayout from '../../layouts/AppLayout.vue';
import { color } from '../../helpers/chartColors.js';
import { useReport } from '../../composables/useReport.js';

const { loading, error, errors, data, load } = useReport('/statistics/online-credentials');

const showOthers = ref(false);
const search = ref('');

function label(row) {
    return row.title || row.username || `#${row.id}`;
}

const chart = computed(() => ({
    labels: (data.value?.top ?? []).map(label),
    datasets: [
        { label: 'Access logs', data: (data.value?.top ?? []).map((row) => row.logs_count), backgroundColor: color(0) },
    ],
}));

const chartOptions = {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
};

const others = computed(() => {
    const rows = data.value?.others ?? [];
    const term = search.value.trim().toLowerCase();

    if (! term) {
        return rows;
    }

    return rows.filter((row) => [row.title, row.username, row.url, row.supplier?.name]
        .some((value) => (value ?? '').toLowerCase().includes(term)));
});

const othersUsed = computed(() => (data.value?.others ?? []).filter((row) => row.logs_count > 0).length);
</script>

<template>
    <AppLayout title="Top Online Credentials" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Top Online Credentials</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <ReportFilters :show-destination="false" :months-back="0" :loading="loading" @apply="load" />
                <p v-if="errors.from || errors.to" class="mt-2 text-sm text-red-600">{{ errors.from || errors.to }}</p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard accent label="Access logs" :value="data.totals.logs" animate />
                    <StatCard label="Credentials used" :value="data.totals.credentials_used" animate />
                    <StatCard label="All credentials" :value="data.totals.credentials" animate />
                </div>

                <FullWidthBox :title="`Top 10 credentials ${data.from} – ${data.to}`" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2 text-right">#</th>
                                    <th class="border border-gray-300 px-2 py-2">Credential</th>
                                    <th class="border border-gray-300 px-2 py-2">Supplier</th>
                                    <th class="border border-gray-300 px-2 py-2">Username</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Access logs</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Users</th>
                                    <th class="border border-gray-300 px-2 py-2">Last used</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in data.top" :key="row.id" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums text-gray-500">{{ row.rank }}</td>
                                    <td class="border border-gray-300 px-2 py-2 font-medium">
                                        <span v-if="row.deleted" class="text-gray-500">{{ label(row) }} <span class="text-xs">(deleted)</span></span>
                                        <RouterLink v-else :to="`/online-credentials/${row.id}`" class="text-blue-600 hover:underline">{{ label(row) }}</RouterLink>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.supplier?.name ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.username }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right font-semibold tabular-nums">{{ row.logs_count }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.users_count }}</td>
                                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.last_used_at ?? '—' }}</td>
                                </tr>
                                <tr v-if="! data.top.length">
                                    <td colspan="7" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No credentials yet.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div v-if="data.totals.logs" class="mt-6 h-80"><Chart type="bar" :data="chart" :options="chartOptions" /></div>
                </FullWidthBox>

                <FullWidthBox v-if="data.others.length" :title="`Other credentials (${data.others.length}, ${othersUsed} used in range)`" :collapsible="false">
                    <div class="flex flex-wrap items-end gap-3">
                        <Button type="button" @click="showOthers = ! showOthers">
                            {{ showOthers ? 'Hide other credentials' : 'Show other credentials' }}
                        </Button>
                        <InputText v-if="showOthers" v-model="search" label="Search" class="min-w-[240px]" />
                    </div>

                    <div v-if="showOthers" class="mt-4 overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2 text-right">#</th>
                                    <th class="border border-gray-300 px-2 py-2">Credential</th>
                                    <th class="border border-gray-300 px-2 py-2">Supplier</th>
                                    <th class="border border-gray-300 px-2 py-2">Username</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Access logs</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Users</th>
                                    <th class="border border-gray-300 px-2 py-2">Last used</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="row in others" :key="row.id" class="hover:bg-gray-50" :class="{ 'text-gray-400': ! row.logs_count }">
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.rank }}</td>
                                    <td class="border border-gray-300 px-2 py-2 font-medium">
                                        <span v-if="row.deleted">{{ label(row) }} <span class="text-xs">(deleted)</span></span>
                                        <RouterLink v-else :to="`/online-credentials/${row.id}`" class="text-blue-600 hover:underline">{{ label(row) }}</RouterLink>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.supplier?.name ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.username }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right font-semibold tabular-nums">{{ row.logs_count }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.users_count }}</td>
                                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.last_used_at ?? '—' }}</td>
                                </tr>
                                <tr v-if="! others.length">
                                    <td colspan="7" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No credentials match "{{ search }}".</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
