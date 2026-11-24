<script setup>
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import { money } from '../../../helpers/money.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const router = useRouter();

const { filters, response: apiResponse, loading, apply, clear, goToPage, reload } = useListFilters(
    { q: '' },
    async (params, { signal }) => castPaginated((await api.get('/package-transfers', { params, signal })).data),
);

const toDelete = ref(null);
const deleting = ref(false);
async function confirmDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        await api.delete(`/package-transfers/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (row) => (auth.can('packageTransfers.edit') ? [
    { label: 'Edit', action: () => router.push(routeUrl('packageTransfers.edit', row.id)) },
    { label: 'Delete', danger: true, action: () => (toDelete.value = row) },
] : []);
</script>

<template>
    <AppLayout title="Transfers" fluid>
        <FullWidthBox title="Transfers (package prices)" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="apply">
                <input v-model="filters.q" type="text" placeholder="Name or destination…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="clear">Clear</Button>
            </form>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">Transfer</th>
                            <th class="border border-gray-300 px-2 py-2">Destination</th>
                            <th class="border border-gray-300 px-2 py-2">Hotel</th>
                            <th class="border border-gray-300 px-2 py-2">Unit prices</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse"><td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td></tr>
                        <tr v-else-if="apiResponse.data.length === 0"><td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No transfers yet.</td></tr>
                        <tr v-for="row in (loading ? [] : apiResponse?.data ?? [])" :key="row.id" :class="row.active ? 'hover:bg-gray-50' : 'text-gray-400'">
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ row.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.parent_destination?.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.hotel?.title ?? 'All hotels' }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div v-for="band in row.bands" :key="band.min_pax">{{ band.min_pax }}-{{ band.max_pax }} persons: {{ money(band.price) }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ row.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ row.active ? 'Yes' : 'No' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center"><DropdownMenu :items="rowActions(row)" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
            <template #footer>
                <RouterLink v-if="auth.can('packageTransfers.edit')" :to="routeUrl('packageTransfers.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">+ New transfer</RouterLink>
            </template>
        </FullWidthBox>
        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete transfer?"
            :message="toDelete ? `${toDelete.name} will be deleted. To pause it, switch it off instead.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
