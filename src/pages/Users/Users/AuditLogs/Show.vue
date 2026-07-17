<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../../helpers/api';
import AppLayout from '../../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../../components/FullWidthBox.vue';
import Loader from '../../../../components/Loader.vue';
import Button from '../../../../components/Button.vue';

const route = useRoute();

const activityLog = ref(null);
const selected = ref(null);
const selectedIndex = ref(null);

async function load() {
    const { data } = await api.get(`/user-activity-logs/${route.params.id}`);
    activityLog.value = data.data ?? data;
}

onMounted(load);

const auditLogs = computed(() => activityLog.value?.audit_logs ?? []);

// Meta rows for the activity log itself, rendered CustomerDetails-style.
const metaRows = computed(() => {
    const log = activityLog.value;

    if (!log) {
        return [];
    }

    return [
        ['ID', log.id],
        ['Action', log.action],
        ['User', log.user],
        ['Entity', log.entity_id],
        ['Date', log.timestamp],
    ];
});

// Render any value as a table cell: null/empty → dash, objects → JSON.
function displayValue(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function asObject(data) {
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

function select(auditLog, index) {
    selected.value = auditLog;
    selectedIndex.value = index;
}

// One row per field, with old and new side by side so changes are easy to spot.
const comparisonRows = computed(() => {
    if (!selected.value) {
        return [];
    }

    const oldData = asObject(selected.value.old_data);
    const newData = asObject(selected.value.new_data);
    const keys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])];

    return keys.map((key) => ({
        key,
        old: oldData[key],
        new: newData[key],
        changed: JSON.stringify(oldData[key] ?? null) !== JSON.stringify(newData[key] ?? null),
    }));
});
</script>

<template>
    <AppLayout :title="activityLog ? `Audit logs · ${activityLog.action}` : 'Audit logs'" fluid>
        <Loader v-if="! activityLog" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <FullWidthBox :title="`Activity log ${activityLog.id}`" :collapsible="false">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr v-for="[label, value] in metaRows" :key="label">
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                                <td class="border border-gray-300 px-2 py-2">{{ displayValue(value) }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <template #footer>
                        <RouterLink to="/users/activity-logs" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to activity logs</RouterLink>
                    </template>
                </FullWidthBox>

                <FullWidthBox title="Audit logs" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Entity</th>
                                    <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Entity ID</th>
                                    <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="auditLogs.length === 0">
                                    <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No audit logs.</td>
                                </tr>
                                <tr
                                    v-for="(auditLog, i) in auditLogs"
                                    :key="i"
                                    class="hover:bg-gray-50"
                                    :class="{ 'bg-red-50': selectedIndex === i }"
                                >
                                    <td class="border border-gray-300 px-2 py-2 font-medium">{{ auditLog.entity ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ auditLog.entity_id ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-center">
                                        <Button size="sm" @click="select(auditLog, i)">Show</Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </div>

            <FullWidthBox
                v-if="selected"
                :title="`Changes · ${selected.entity ?? 'Entity'} ${selected.entity_id ?? ''}`"
                :collapsible="false"
                class="mt-6"
            >
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Field</th>
                                <th class="border border-gray-300 px-2 py-2">Old</th>
                                <th class="border border-gray-300 px-2 py-2">New</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="comparisonRows.length === 0">
                                <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No data.</td>
                            </tr>
                            <tr v-for="row in comparisonRows" :key="row.key" :class="row.changed ? 'bg-amber-50' : ''">
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ row.key }}</th>
                                <td class="border border-gray-300 px-2 py-2 break-all text-gray-500">{{ displayValue(row.old) }}</td>
                                <td class="border border-gray-300 px-2 py-2 break-all" :class="row.changed ? 'font-medium text-gray-900' : 'text-gray-500'">{{ displayValue(row.new) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
