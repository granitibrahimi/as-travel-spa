<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castMutation, castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import { downloadFile } from '../../../helpers/download.js';
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

// ---------------------------------------------------------------- contract files read by AI
const aiForm = reactive({ hotel_id: null, supplier_id: null, file: null });
const aiErrors = ref({});
const aiSending = ref(false);
const aiFileInput = ref(null);
const uploads = ref([]);
let uploadsTimer = null;

async function loadUploads() {
    clearTimeout(uploadsTimer);
    uploads.value = castPaginated((await api.get('/hotel-contract-uploads')).data).data;
    if (uploads.value.some((u) => u.status === 'processing')) uploadsTimer = setTimeout(loadUploads, 5000);
    if (uploads.value.some((u) => u.status === 'imported')) reload();
}
onMounted(() => { if (auth.can('hotelContracts.list')) loadUploads(); });
onBeforeUnmount(() => clearTimeout(uploadsTimer));

async function sendContractFile() {
    if (aiSending.value) return;
    aiSending.value = true;
    aiErrors.value = {};
    try {
        const body = new FormData();
        if (aiForm.hotel_id) body.append('hotel_id', aiForm.hotel_id);
        if (aiForm.supplier_id) body.append('supplier_id', aiForm.supplier_id);
        if (aiForm.file) body.append('file', aiForm.file);
        await api.post('/hotel-contract-uploads', body);
        aiForm.file = null;
        if (aiFileInput.value) aiFileInput.value.value = '';
        await loadUploads();
    } catch (error) {
        if (error.response?.status === 422) {
            aiErrors.value = Object.fromEntries(Object.entries(error.response.data.errors ?? {}).map(([k, v]) => [k, v[0]]));
        } else {
            throw error;
        }
    } finally {
        aiSending.value = false;
    }
}

async function readAgain(u) {
    await api.post(`/hotel-contract-uploads/${u.id}/read-again`);
    await loadUploads();
}
async function removeUpload(u) {
    await api.delete(`/hotel-contract-uploads/${u.id}`);
    await loadUploads();
}
const openUploadFile = (u) => downloadFile(`/hotel-contract-uploads/${u.id}/file`, { fallbackName: u.original_name });

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
                            <th class="border border-gray-300 px-2 py-2 text-center">Search</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="10" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="10" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No hotel contracts yet.</td>
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
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="contract.status === 'live' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'" class="rounded px-2 py-0.5 text-xs">{{ contract.status === 'live' ? 'Live' : 'Draft' }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center"><DropdownMenu :items="rowActions(contract)" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <FullWidthBox v-if="auth.can('hotelContracts.edit')" title="Upload a contract (PDF or Excel)" class="mt-6">
            <p class="mb-3 text-sm text-gray-600">
                AI reads the contract (rates per period, rooms, child ages, early booking, special offers, taxes) and creates it as a
                <strong>draft</strong>: only users with the "see draft contracts" permission find it in Package Search. Check the prices,
                add the markup, then switch it to live on the contract page. A file with several boards becomes one contract per board.
                If the contract has terms the system cannot calculate yet, nothing is imported.
            </p>
            <form class="grid grid-cols-1 gap-4 md:grid-cols-4" @submit.prevent="sendContractFile">
                <AsyncSelect v-model="aiForm.hotel_id" :url="hotelsUrl" label-key="title" label="Hotel *" placeholder="Search hotel…" :error="aiErrors.hotel_id" />
                <AsyncSelect v-model="aiForm.supplier_id" url="/suppliers/suppliers/autosuggest" label="Supplier" placeholder="Search supplier…" :error="aiErrors.supplier_id" />
                <div class="md:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-gray-700">Contract file (PDF, Excel) *</label>
                    <input ref="aiFileInput" type="file" accept=".pdf,.xlsx,.xls,.csv,.ods,.png,.jpg,.jpeg" class="block w-full text-sm" @change="(e) => (aiForm.file = e.target.files[0] ?? null)">
                    <p v-if="aiErrors.file" class="mt-1 text-xs text-red-600">{{ aiErrors.file }}</p>
                </div>
                <div class="md:col-span-4">
                    <Button type="submit" variant="primary" :disabled="aiSending">{{ aiSending ? 'Uploading…' : 'Upload and read' }}</Button>
                </div>
            </form>

            <div v-if="uploads.length" class="mt-5 space-y-2">
                <div v-for="u in uploads" :key="u.id" class="rounded border px-3 py-2 text-sm" :class="{ 'border-red-300 bg-red-50': u.status === 'blocked' || u.status === 'failed', 'border-green-300 bg-green-50': u.status === 'imported' }">
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" class="font-medium text-gray-800 hover:underline" @click="openUploadFile(u)">{{ u.original_name }}</button>
                        <span class="text-xs text-gray-500">{{ u.hotel?.title }} · {{ u.created_at }} · {{ u.user }}</span>
                        <span v-if="u.status === 'processing'" class="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Reading… (a few minutes)</span>
                        <span class="ml-auto flex gap-3 text-xs">
                            <button v-if="u.status === 'blocked' || u.status === 'failed'" type="button" class="text-red-600 hover:underline" @click="readAgain(u)">Read again</button>
                            <button v-if="u.status !== 'processing'" type="button" class="text-gray-500 hover:underline" @click="removeUpload(u)">Remove</button>
                        </span>
                    </div>
                    <div v-if="u.status === 'imported'" class="mt-1">
                        Draft contracts created:
                        <RouterLink v-for="c in u.contracts" :key="c.id" :to="routeUrl('hotelContracts.show', c.id)" class="mr-3 font-medium text-red-600 hover:underline">{{ c.code }}</RouterLink>
                    </div>
                    <div v-if="u.status === 'blocked'" class="mt-1 text-red-800">
                        <strong>Not imported: contact the developer.</strong> This contract has terms the system does not support yet:
                        <ul class="mt-1 list-disc pl-5">
                            <li v-for="(x, i) in u.unsupported" :key="i"><strong>{{ x.feature }}</strong>: {{ x.detail }}</li>
                        </ul>
                    </div>
                    <div v-if="u.status === 'failed'" class="mt-1 text-red-800">Could not be read: {{ u.error }}</div>
                </div>
            </div>
        </FullWidthBox>

        <FullWidthBox v-if="auth.can('hotelContracts.edit')" title="Import a contract JSON (developers)" class="mt-6" default-collapsed>
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
