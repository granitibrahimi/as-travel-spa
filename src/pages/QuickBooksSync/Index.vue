<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { quickBooksSyncEntityPath } from '../../helpers/quickbooksSyncEntity.js';
import { castPaginated } from '../../types/responses.js';
import { useListFilters } from '../../composables/useListFilters.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FiltersButton from '../../components/FiltersButton.vue';
import FiltersPanel from '../../components/FiltersPanel.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import SearchSelect from '../../components/Form/SearchSelect.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const options = reactive({ entities: [], statuses: [], actions: [] });
// Option values can legitimately be 0 (enum ids); the composable only drops
// null/'' so a selected 0 is still sent.
const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { entity: null, status: null, action: null, entity_id: '' },
    async (params, { signal }) => castPaginated((await api.get('/quickbooks-sync', { params, signal })).data),
);

// Row pending deletion (drives the confirm dialog) + row being retried.
const pendingDelete = ref(null);
const processing = ref(false);
const retryingId = ref(null);

async function fetchOptions() {
    const { data } = await api.get('/quickbooks-sync/options');
    // The API returns these keyed by id ({ "4": { value, label }, ... }), not
    // as arrays — Select's onChange does an array .find() over its options,
    // so they need to be arrays or every selection throws and silently never
    // updates the v-model.
    options.entities = Object.values(data.entities);
    options.statuses = Object.values(data.statuses);
    options.actions = Object.values(data.actions);
}

onMounted(fetchOptions);

async function retry(row) {
    retryingId.value = row.id;

    try {
        await api.post(`/quickbooks-sync/${row.id}/retry`);
        await reload();
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
        await reload();
    } finally {
        processing.value = false;
    }
}

// Floating three-dots menu entries for one row, permission-filtered.
const rowActions = (row) => [
    ...(auth.can('quickBooksSync.show') ? [{ label: 'View', href: routeUrl('quickBooksSync.show', row.id) }] : []),
    ...(auth.can('quickBooksSync.retry') ? [{ label: retryingId.value === row.id ? 'Retrying…' : 'Retry', action: () => retry(row) }] : []),
    ...(row.can_delete && auth.can('quickBooksSync.delete') ? [{ label: 'Delete', danger: true, action: () => (pendingDelete.value = row) }] : []),
];

// The API's `entity_url` is a platform API path (or `#`) — resolve the entity's
// real in-SPA route from its type (`entity_value`) instead.
const entityPath = (row) => quickBooksSyncEntityPath(row.entity_value, row.entity_id);

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
            <FullWidthBox title="QuickBooks Sync Data" :collapsible="false">
                <template #actions>
                    <FiltersButton v-model="showFilters" :count="activeCount" />
                </template>

                <FiltersPanel :open="showFilters">
                    <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                        <SearchSelect v-model="filters.entity" :options="options.entities" label="Entity" placeholder="All entities" />
                        <Select v-model="filters.status" :options="options.statuses" label="Status" placeholder="All statuses" />
                        <Select v-model="filters.action" :options="options.actions" label="Action" placeholder="All actions" />
                        <InputText v-model="filters.entity_id" label="Entity / QB ID" placeholder="ID…" />
                        <div class="flex items-end gap-2 md:col-span-4">
                            <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                            <Button type="button" @click="clear">Clear</Button>
                        </div>
                    </form>
                </FiltersPanel>

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
                            <tr v-if="loading || ! apiResponse">
                                <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="apiResponse.data.length === 0">
                                <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No sync data found.</td>
                            </tr>
                            <tr v-for="row in (loading ? [] : apiResponse?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.entity }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.action }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink v-if="entityPath(row)" :to="entityPath(row)" class="text-red-700 hover:underline">{{ row.entity_id }}</RouterLink>
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

                <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
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
