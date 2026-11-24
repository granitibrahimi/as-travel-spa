<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castMutation, castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import InputText from '../../../components/Form/InputText.vue';

const auth = useAuthStore();
const router = useRouter();
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const hotelsUrl = `${apiOrigin}/api/customers/hotels`;

const { filters, response: apiResponse, loading, apply, clear, goToPage, reload } = useListFilters(
    { q: '' },
    async (params, { signal }) => castPaginated((await api.get('/hotel-contracts', { params, signal })).data),
);

const importForm = reactive({ hotel_id: null, supplier_id: null, code: '', file: null });
const importErrors = ref({});
const importing = ref(false);
const fileInput = ref(null);

async function importContract() {
    if (importing.value) return;
    importing.value = true;
    importErrors.value = {};
    try {
        const body = new FormData();
        if (importForm.hotel_id) body.append('hotel_id', importForm.hotel_id);
        if (importForm.supplier_id) body.append('supplier_id', importForm.supplier_id);
        if (importForm.code) body.append('code', importForm.code);
        if (importForm.file) body.append('file', importForm.file);
        const { id } = castMutation((await api.post('/hotel-contracts', body)).data);
        router.push(routeUrl('hotelContracts.show', id));
    } catch (error) {
        if (error.response?.status === 422) {
            importErrors.value = Object.fromEntries(Object.entries(error.response.data.errors ?? {}).map(([k, v]) => [k, v[0]]));
        } else {
            throw error;
        }
    } finally {
        importing.value = false;
    }
}

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        await api.delete(`/hotel-contracts/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (contract) => [
    { label: 'Open', action: () => router.push(routeUrl('hotelContracts.show', contract.id)) },
    ...(auth.can('hotelContracts.edit') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = contract) }] : []),
];
</script>

<template>
    <AppLayout title="Hotel Contracts" fluid>
        <FullWidthBox title="Hotel contracts" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="apply">
                <input v-model="filters.q" type="text" placeholder="Code, name or hotel…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="clear">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">Contract</th>
                            <th class="border border-gray-300 px-2 py-2">Hotel</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2">Valid</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Rooms</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Early booking</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Special offers</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Status</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No hotel contracts yet.</td>
                        </tr>
                        <tr v-for="contract in (loading ? [] : apiResponse?.data ?? [])" :key="contract.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('hotelContracts.show', contract.id)" class="font-medium text-red-600 hover:underline">{{ contract.code }}</RouterLink>
                                <div class="text-xs text-gray-500">{{ contract.name }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ contract.hotel?.title ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ contract.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ contract.valid_from }} – {{ contract.valid_to }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ contract.rooms_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ contract.early_bookings_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ contract.special_offers_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="contract.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'" class="rounded px-2 py-0.5 text-xs">{{ contract.active ? 'Active' : 'Inactive' }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center"><DropdownMenu :items="rowActions(contract)" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <FullWidthBox v-if="auth.can('hotelContracts.edit')" title="Import a contract" class="mt-6" default-collapsed>
            <p class="mb-3 text-sm text-gray-600">
                Upload the contract JSON (rooms, rates per period, early booking, special offers and markups, as in the Lujo pricing tool).
                Room rates are taken as they are; early booking, special offers and markups can be edited afterwards.
            </p>
            <form class="grid grid-cols-1 gap-4 md:grid-cols-4" @submit.prevent="importContract">
                <AsyncSelect v-model="importForm.hotel_id" :url="hotelsUrl" label-key="title" label="Hotel *" placeholder="Search hotel…" :error="importErrors.hotel_id" />
                <AsyncSelect v-model="importForm.supplier_id" url="/suppliers/suppliers/autosuggest" label="Supplier" placeholder="Search supplier…" :error="importErrors.supplier_id" />
                <InputText v-model="importForm.code" label="Code (default: from the file)" :error="importErrors.code" />
                <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Contract file (.json) *</label>
                    <input ref="fileInput" type="file" accept=".json,application/json" class="block w-full text-sm" @change="(e) => (importForm.file = e.target.files[0] ?? null)">
                    <p v-if="importErrors.file" class="mt-1 text-xs text-red-600">{{ importErrors.file }}</p>
                </div>
                <div class="md:col-span-4">
                    <Button type="submit" variant="primary" :disabled="importing">Import contract</Button>
                </div>
            </form>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete hotel contract?"
            :message="toDelete ? `${toDelete.code} with its early booking, special offers and markups will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
