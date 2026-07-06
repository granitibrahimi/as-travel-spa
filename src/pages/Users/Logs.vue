<script setup>
import { onMounted, ref } from 'vue';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

const logs = ref(null);
const loading = ref(false);
const search = ref('');
const type = ref('');
const userId = ref('');
const from = ref('');
const to = ref('');
const logTypes = ref([]);
const agents = ref([]);

let request = null;

async function fetchOptions() {
    const { data } = await api.get('/users/form-options');
    logTypes.value = data.logTypes;
    agents.value = data.agents;
}

async function fetchLogs(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/users/logs', {
            signal: controller.signal,
            params: {
                q: search.value || undefined,
                type: type.value || undefined,
                user: userId.value || undefined,
                from: from.value || undefined,
                to: to.value || undefined,
                page,
            },
        });
        logs.value = { data: data.data, ...data.meta };
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
    fetchOptions();
    fetchLogs();
});

function clearFilters() {
    search.value = '';
    type.value = '';
    userId.value = '';
    from.value = '';
    to.value = '';
    fetchLogs();
}
</script>

<template>
    <AppLayout title="User logs" fluid>
        <FullWidthBox title="User logs" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchLogs()">
                <input v-model="search" type="text" placeholder="Log text…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-56">
                <select v-model="type" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                    <option value="">All types</option>
                    <option v-for="logType in logTypes" :key="logType.value" :value="logType.value">{{ logType.label }}</option>
                </select>
                <select v-model="userId" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                    <option value="">All users</option>
                    <option v-for="agent in agents" :key="agent.value" :value="agent.value">{{ agent.label }}</option>
                </select>
                <input v-model="from" type="date" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                <input v-model="to" type="date" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="clearFilters">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">User</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Log</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! logs">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="logs.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No logs found.</td>
                        </tr>
                        <tr v-for="log in (loading ? [] : logs?.data ?? [])" :key="log.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ log.id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.type ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.log ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.created_at }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="logs" :paginator="logs" class="mt-4" @page="fetchLogs" />
        </FullWidthBox>
    </AppLayout>
</template>
