<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
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

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');

let request = null;

async function fetchHotels(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/hotels', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
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

onMounted(() => fetchHotels());

const hotelToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/hotels/${hotelToDelete.value.id}`);
        hotelToDelete.value = null;
        await fetchHotels(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (hotel) => [
    ...(auth.can('hotels.edit') ? [{ label: 'Edit', action: () => router.push(routeUrl('hotels.edit', hotel.id)) }] : []),
    ...(auth.can('hotels.delete') ? [{ label: 'Delete', danger: true, action: () => (hotelToDelete.value = hotel) }] : []),
];
</script>

<template>
    <AppLayout title="Hotels" fluid>
        <FullWidthBox title="Hotels" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchHotels()">
                <input v-model="search" type="text" placeholder="Hotel title…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchHotels();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Title</th>
                            <th class="border border-gray-300 px-2 py-2">Destination</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Stars</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Rooms</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No hotels found.</td>
                        </tr>
                        <tr v-for="hotel in (loading ? [] : apiResponse?.data ?? [])" :key="hotel.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ hotel.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ hotel.title }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ hotel.destination ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center text-amber-500">
                                <span v-if="hotel.stars">{{ '★'.repeat(hotel.stars) }}</span>
                                <span v-else class="text-gray-300">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ hotel.rooms_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(hotel)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchHotels" />

            <template #footer>
                <RouterLink v-if="auth.can('hotels.create')" :to="routeUrl('hotels.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + New hotel
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(hotelToDelete)"
            title="Delete hotel?"
            :message="hotelToDelete ? `${hotelToDelete.title} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="hotelToDelete = null"
        />
    </AppLayout>
</template>
