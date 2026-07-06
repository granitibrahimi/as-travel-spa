<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const rows = ref(null);
const loading = ref(false);
const options = reactive({ entities: [], statuses: [], actions: [] });
const form = reactive({ entity: null, status: null, action: null, entity_id: '' });

// Row pending deletion (drives the confirm dialog) + row being retried.
const pendingDelete = ref(null);
const processing = ref(false);
const retryingId = ref(null);

async function fetchOptions() {
    const { data } = await api.get('/quickbooks-sync/options');
    options.entities = data.entities;
    options.statuses = data.statuses;
    options.actions = data.actions;
}

async function fetchRows(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/quickbooks-sync', {
            params: {
                entity: form.entity || undefined,
                status: form.status || undefined,
                action: form.action || undefined,
                entity_id: form.entity_id || undefined,
                page,
            },
        });
        rows.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    fetchOptions();
    fetchRows();
});

function clear() {
    form.entity = null;
    form.status = null;
    form.action = null;
    form.entity_id = '';
    fetchRows();
}

async function retry(row) {
    retryingId.value = row.id;

    try {
        await api.post(`/quickbooks-sync/${row.id}/retry`);
        await fetchRows(rows.value?.current_page ?? 1);
    } finally {
        retryingId.value = null;
    }
}

async function confirmDelete() {
    if (processing.value) {
        return;
    }

    processing.value = true;

    try {
        await api.delete(`/quickbooks-sync/${pendingDelete.value.id}`);
        pendingDelete.value = null;
        await fetchRows(rows.value?.current_page ?? 1);
    } finally {
        processing.value = false;
    }
}

// Floating three-dots menu entries for one row, permission-filtered.
const rowActions = (row) => [
    ...(auth.can('quickBooksSync.show') ? [{ label: 'View', href: `/quickbooks-sync/${row.id}` }] : []),
    ...(auth.can('quickBooksSync.retry') ? [{ label: retryingId.value === row.id ? 'Retrying…' : 'Retry', action: () => retry(row) }] : []),
    ...(row.can_delete && auth.can('quickBooksSync.delete') ? [{ label: 'Delete', danger: true, action: () => (pendingDelete.value = row) }] : []),
];

const statusClass = (status) => ({
    Open: 'bg-gray-100 text-gray-600',
    'In progress': 'bg-blue-100 text-blue-700',
    Finished: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
}[status] ?? 'bg-yellow-100 text-yellow-700');
</script>

<template>
    <AppLayout title="QuickBooks Sync" fluid>
        <div class="space-y-6">
            <FullWidthBox title="Filters" :collapsible="false">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-5" @submit.prevent="fetchRows()">
                    <Select v-model="form.entity" :options="options.entities" label="Entity" placeholder="All entities" />
                    <Select v-model="form.status" :options="options.statuses" label="Status" placeholder="All statuses" />
                    <Select v-model="form.action" :options="options.actions" label="Action" placeholder="All actions" />
                    <InputText v-model="form.entity_id" label="Entity / QB ID" placeholder="ID…" />
                    <div class="flex items-end gap-2">
                        <Button type="submit" variant="primary">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FullWidthBox>

            <FullWidthBox title="QuickBooks Sync Data" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Entity</th>
                                <th class="border border-gray-300 px-2 py-2">Action</th>
                                <th class="border border-gray-300 px-2 py-2">Entity ID</th>
                                <th class="border border-gray-300 px-2 py-2">QB ID</th>
                                <th class="border border-gray-300 px-2 py-2">Status</th>
                                <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 160px;">Last activity</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! rows">
                                <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="rows.data.length === 0">
                                <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No sync data found.</td>
                            </tr>
                            <tr v-for="row in (loading ? [] : rows?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.entity }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.action }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <a v-if="row.entity_url" :href="row.entity_url" target="_blank" class="text-red-700 hover:underline">{{ row.entity_id }}</a>
                                    <span v-else>{{ row.entity_id }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <a v-if="row.qb_url" :href="row.qb_url" target="_blank" class="text-red-700 hover:underline">{{ row.qb_id }}</a>
                                    <span v-else>{{ row.qb_id ?? '-' }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(row.status)">{{ row.status }}</span>
                                    <div v-if="row.response_title" class="mt-1 text-xs text-gray-400">{{ row.response_title }}</div>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.updated_at }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <DropdownMenu :items="rowActions(row)" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="rows" :paginator="rows" class="mt-4" @page="fetchRows" />
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="Boolean(pendingDelete)"
            title="Delete sync record?"
            :message="`This will permanently delete failed sync record #${pendingDelete?.id}.`"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="processing"
            @confirm="confirmDelete"
            @cancel="pendingDelete = null"
        />
    </AppLayout>
</template>
