<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
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

const auth = useAuthStore();
const router = useRouter();

const { response: apiResponse, loading, goToPage, reload } = useListFilters(
    {},
    async (params, { signal }) => castPaginated((await api.get('/hotel-availability-uploads', { params, signal })).data),
);

// refresh quietly while a chart is being read
let timer = null;
watch(apiResponse, (value) => {
    clearTimeout(timer);
    if (value?.data.some((u) => u.status === 'processing')) timer = setTimeout(reload, 4000);
});
onBeforeUnmount(() => clearTimeout(timer));

const file = ref(null);
const fileInput = ref(null);
const uploading = ref(false);
const uploadError = ref('');

async function upload() {
    if (uploading.value || ! file.value) return;
    uploading.value = true;
    uploadError.value = '';
    try {
        const body = new FormData();
        body.append('file', file.value);
        const { id } = castMutation((await api.post('/hotel-availability-uploads', body)).data);
        router.push(routeUrl('hotelAvailability.show', id));
    } catch (error) {
        if (error.response?.status === 422) {
            uploadError.value = Object.values(error.response.data.errors ?? {})[0]?.[0] ?? error.response.data.message;
        } else {
            throw error;
        }
    } finally {
        uploading.value = false;
    }
}

const statusBadge = {
    processing: ['Reading…', 'bg-blue-100 text-blue-800'],
    ready: ['To review', 'bg-yellow-100 text-yellow-800'],
    applied: ['Applied', 'bg-green-100 text-green-800'],
    failed: ['Failed', 'bg-red-100 text-red-800'],
};

const toDelete = ref(null);
const deleting = ref(false);
async function confirmDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        await api.delete(`/hotel-availability-uploads/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (u) => [
    { label: 'Open', action: () => router.push(routeUrl('hotelAvailability.show', u.id)) },
    ...(auth.can('hotelContracts.edit') && u.status !== 'applied' ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = u) }] : []),
];
</script>

<template>
    <AppLayout title="Stop Sales" fluid>
        <FullWidthBox v-if="auth.can('hotelContracts.edit')" title="Upload an availability / stop sale chart" :collapsible="false">
            <p class="mb-3 text-sm text-gray-600">
                Upload the chart the hotel sent (PDF or image). AI reads it, finds the hotel contract and the sold out and on request dates
                per room. You check the result next to the original and then apply it. A newer chart replaces the dates of the older one;
                stop sales added by hand on the contract stay.
            </p>
            <form class="flex flex-wrap items-center gap-3" @submit.prevent="upload">
                <input ref="fileInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" class="text-sm" @change="(e) => (file = e.target.files[0] ?? null)">
                <Button type="submit" variant="primary" :disabled="uploading || ! file">{{ uploading ? 'Uploading…' : 'Upload and read' }}</Button>
                <span v-if="uploadError" class="text-xs text-red-600">{{ uploadError }}</span>
            </form>
        </FullWidthBox>

        <FullWidthBox title="Charts" class="mt-6" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">File</th>
                            <th class="border border-gray-300 px-2 py-2">Hotel / contract</th>
                            <th class="border border-gray-300 px-2 py-2">Chart date</th>
                            <th class="border border-gray-300 px-2 py-2">Covers</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Closed ranges</th>
                            <th class="border border-gray-300 px-2 py-2 text-center">Status</th>
                            <th class="border border-gray-300 px-2 py-2">Uploaded</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="! apiResponse && loading"><td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td></tr>
                        <tr v-else-if="apiResponse?.data.length === 0"><td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No charts uploaded yet.</td></tr>
                        <tr v-for="u in apiResponse?.data ?? []" :key="u.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('hotelAvailability.show', u.id)" class="font-medium text-red-600 hover:underline">{{ u.original_name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div>{{ u.hotel_name ?? '—' }}</div>
                                <div class="text-xs" :class="u.contract ? 'text-gray-500' : 'text-red-600'">{{ u.contract ? u.contract.name : (u.status === 'processing' ? '' : 'No contract matched') }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ u.as_of ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ u.first_date ? `${u.first_date} – ${u.last_date}` : '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                {{ u.closed_ranges }}
                                <div v-if="u.unmatched_rooms" class="text-xs text-red-600">{{ u.unmatched_rooms }} rooms not matched</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="statusBadge[u.status]?.[1]" class="rounded px-2 py-0.5 text-xs">{{ statusBadge[u.status]?.[0] ?? u.status }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-xs text-gray-600">{{ u.created_at }}<div>{{ u.user }}</div></td>
                            <td class="border border-gray-300 px-2 py-2 text-center"><DropdownMenu :items="rowActions(u)" /></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete chart?"
            :message="toDelete ? `${toDelete.original_name} and its reading will be deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
