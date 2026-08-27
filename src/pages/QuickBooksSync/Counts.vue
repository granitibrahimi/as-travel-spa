<script setup>
import { computed, onMounted, ref } from 'vue';
import { castResource } from '../../types/responses.js';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import DashboardWidget from '../../components/DashboardWidget.vue';
import Loader from '../../components/Loader.vue';

// GET /quickbooks/count — { [entity]: { qb, as, no_qb_id } }; each value is
// either a plain number or a "\n"-joined multi-line string.
const loading = ref(true);
const error = ref(null);
const counts = ref({});

const rows = computed(() => Object.entries(counts.value).map(([entity, values]) => ({ entity, ...values })));

// A row's QB/AS counts matching exactly is a quick "reconciled" cue.
function matches(row) {
    return String(row.qb) === String(row.as);
}

function lines(value) {
    return String(value ?? '—').split('\n');
}

async function load() {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await api.get('/quickbooks/count');
        counts.value = castResource(data);
    } catch {
        error.value = 'Could not load QuickBook counts right now.';
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <AppLayout title="QuickBook Counts" fluid>
        <DashboardWidget title="QuickBook Counts">
            <Loader v-if="loading" />
            <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-4 py-2">Entity</th>
                            <th class="border border-gray-300 px-4 py-2">QB</th>
                            <th class="border border-gray-300 px-4 py-2">AS</th>
                            <th class="border border-gray-300 px-4 py-2">Without QB ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="rows.length === 0">
                            <td colspan="4" class="border border-gray-300 px-4 py-4 text-center text-gray-400">No data.</td>
                        </tr>
                        <tr v-for="row in rows" :key="row.entity" :class="matches(row) ? 'bg-green-500 text-white' : 'odd:bg-gray-50'">
                            <td class="border border-gray-300 px-4 py-3 font-medium">{{ row.entity }}</td>
                            <td class="border border-gray-300 px-4 py-3">
                                <div v-for="(line, i) in lines(row.qb)" :key="i">{{ line }}</div>
                            </td>
                            <td class="border border-gray-300 px-4 py-3">
                                <div v-for="(line, i) in lines(row.as)" :key="i">{{ line }}</div>
                            </td>
                            <td class="border border-gray-300 px-4 py-3">
                                <div v-for="(line, i) in lines(row.no_qb_id)" :key="i">{{ line }}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </DashboardWidget>
    </AppLayout>
</template>
