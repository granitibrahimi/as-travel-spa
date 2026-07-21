<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api, {getUsersAutosuggestEndpoint} from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const router = useRouter();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const userId = ref('');
const from = ref('');
const to = ref('');

let request = null;

async function fetchLogs(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/audit-logs/user-activity-logs', {
            signal: controller.signal,
            params: {
                q: search.value || undefined,
                user: userId.value || undefined,
                from: from.value || undefined,
                to: to.value || undefined,
                page,
            },
        });
        // Envelope: { data: { items: [...], pagination: {...} } }.
        apiResponse.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => {
    fetchLogs();
});

function clearFilters() {
    search.value = '';
    userId.value = '';
    from.value = '';
    to.value = '';
    fetchLogs();
}

// Shown only when the row has audit logs — open the per-entry audit log view.
function viewAuditLogs(log) {
    router.push(routeUrl('users.activityLogAudit', log.id));
}

// input_data is an empty array when there's nothing, or an object of params
// (e.g. { from, to, roles: [...] }) otherwise. Render it compactly.
function formatInput(input) {
    if (!input || Array.isArray(input)) {
        return Array.isArray(input) && input.length ? input.join(', ') : '—';
    }

    const entries = Object.entries(input);

    if (!entries.length) {
        return '—';
    }

    return entries
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('/') : value}`)
        .join(', ');
}
</script>

<template>
    <AppLayout title="User activity logs" fluid>
        <FullWidthBox title="User activity logs" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchLogs()">
                <input v-model="search" type="text" placeholder="Action…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-base leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-56">
                <div class="w-full sm:w-56">
                    <AsyncSelect v-model="userId" :url="getUsersAutosuggestEndpoint()" placeholder="All agents" />
                </div>
                <DateInput v-model="from" />
                <DateInput v-model="to" />
                <Button type="submit" variant="primary" :loading="loading">Search</Button>
                <Button type="button" @click="clearFilters">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">User</th>
                            <th class="border border-gray-300 px-2 py-2">Action</th>
                            <th class="border border-gray-300 px-2 py-2">Input</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Audit Logs</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No logs found.</td>
                        </tr>
                        <tr v-for="log in (loading ? [] : apiResponse?.data ?? [])" :key="log.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ log.id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.action ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ formatInput(log.input_data) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ log.timestamp }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <Button v-if="log.has_audit_logs" size="sm" @click="viewAuditLogs(log)">Audit Logs</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchLogs" />
        </FullWidthBox>
    </AppLayout>
</template>
