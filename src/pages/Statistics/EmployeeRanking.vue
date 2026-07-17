<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import api from '../../helpers/api.js';
import { downloadFile } from '../../helpers/download.js';
import { money } from '../../helpers/money.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import DateInput from '../../components/Form/DateInput.vue';
import Loader from '../../components/Loader.vue';
import { useReport } from '../../composables/useReport.js';
import { useFormOptionsStore } from '../../stores/formOptions.js';
import { todayApiDate } from '../../helpers/date.js';

const { loading, error, data, load } = useReport('/statistics/ranking');

const formOptions = useFormOptionsStore();

// Roles selected by default, mirroring the legacy report.
const DEFAULT_ROLE_IDS = [2, 3, 4, 5, 6, 7];

function apiMonthsAgo(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months, 1);
    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

const from = ref(apiMonthsAgo(1));
const to = ref(todayApiDate());
// Roles come from the shared form-options store (user_roles category).
const roles = computed(() => formOptions.userRoles.map((role) => ({
    id: role.id ?? role.value,
    name: role.name ?? role.label,
})));
const selectedRoles = ref([]);
const downloading = ref(false);

function params() {
    return {
        from: from.value || undefined,
        to: to.value || undefined,
        roles: selectedRoles.value.length ? selectedRoles.value : undefined,
    };
}

function apply() {
    load(params());
}

function percent(value) {
    return `${Number(value ?? 0).toFixed(0)} %`;
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }
    downloading.value = true;
    try {
        await downloadFile('/statistics/ranking/export', {
            fallbackName: 'employee-ranking.xlsx',
            config: { params: params() },
        });
    } finally {
        downloading.value = false;
    }
}

// Preselect the default roles once the store's roles are available (they may
// arrive after mount while the form-options sync is still in flight).
let defaultsApplied = false;

function applyDefaultRoles() {
    if (defaultsApplied || ! roles.value.length) {
        return;
    }

    defaultsApplied = true;
    selectedRoles.value = roles.value
        .filter((role) => DEFAULT_ROLE_IDS.includes(role.id))
        .map((role) => role.id);
    apply();
}

watch(roles, applyDefaultRoles);

onMounted(() => {
    applyDefaultRoles();

    // Roles not loaded yet — show the ranking for all roles until they arrive.
    if (! defaultsApplied) {
        apply();
    }
});
</script>

<template>
    <AppLayout title="Employee Ranking">
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Employee Ranking</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="space-y-3">
                    <div class="flex flex-wrap items-end gap-3">
                        <DateInput v-model="from" label="From" />
                        <DateInput v-model="to" label="To" />
                        <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                        <Button type="button" :disabled="downloading" @click="downloadExcel">
                            {{ downloading ? 'Preparing…' : 'Download Excel' }}
                        </Button>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-2">
                        <label v-for="role in roles" :key="role.id" class="flex items-center gap-2 text-sm">
                            <input type="checkbox" :value="role.id" v-model="selectedRoles">
                            {{ role.name }}
                        </label>
                    </div>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" :title="`Ranking ${data.data.from} – ${data.data.to}`" :collapsible="false">
                <Loader v-if="loading"/>
                <div class="overflow-x-auto" v-if="! loading && data.data.rows.length">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Employee</th>
                                <th class="border border-gray-300 px-2 py-2">Role</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">SVC — 70%</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Total — 20%</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Count — 10%</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Ranking</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in data.data.rows" :key="row.user_id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.employee }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.role }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.svc) }} <span class="text-gray-400">/ {{ percent(row.svc_percentage) }}</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.total) }} <span class="text-gray-400">/ {{ percent(row.total_percentage) }}</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.count }} <span class="text-gray-400">/ {{ percent(row.count_percentage) }}</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-semibold tabular-nums">{{ percent(row.ranking_percentage) }}</td>
                            </tr>
                            <tr v-if="! data.data.rows.length">
                                <td colspan="6" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No data for this range.</td>
                            </tr>
                        </tbody>
                        <tfoot v-if="data.data.rows.length">
                            <tr class="font-semibold">
                                <td class="border border-gray-300 px-2 py-2" colspan="2">Total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(data.data.totals.svc) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(data.data.totals.sales) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ data.data.totals.count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right">100 %</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
