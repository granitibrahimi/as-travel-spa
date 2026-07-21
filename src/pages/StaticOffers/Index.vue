<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../helpers/money';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castPaginated } from '../../types/responses.js';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const destination = ref(null);
const status = ref(null);
const destinations = ref([]);
const statuses = ref([]);
const offerToDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchOffers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/static-offers', {
            signal: controller.signal,
            params: {
                search: search.value || undefined,
                destination: destination.value || undefined,
                status: status.value || undefined,
                page,
            },
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

async function fetchFilterOptions() {
    const { data } = await api.get('/static-offers/filter-options');
    destinations.value = data.destinations ?? [];
    statuses.value = data.statuses ?? [];
}

onMounted(() => {
    fetchFilterOptions();
    fetchOffers();
});

const rowActions = (offer) => [
    { label: 'View', href: routeUrl('staticOffers.show', offer.id) },
    ...(auth.can('staticOffers.create') ? [{ label: 'Edit', href: routeUrl('staticOffers.edit', offer.id) }] : []),
    ...(auth.can('staticOffers.delete') ? [{ label: 'Delete', danger: true, action: () => (offerToDelete.value = offer) }] : []),
];

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/static-offers/${offerToDelete.value.id}`);
        offerToDelete.value = null;
        await fetchOffers(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout title="Static offers" fluid>
        <FullWidthBox title="Static offers" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5" @submit.prevent="fetchOffers()">
                <div class="md:col-span-2">
                    <InputText v-model="search" label="Search" placeholder="Code or name…" />
                </div>
                <Select v-model="destination" :options="destinations" label="Destination" placeholder="All" />
                <Select v-model="status" :options="statuses" label="Status" placeholder="All" />
                <div class="flex items-end">
                    <Button type="submit">Filter</Button>
                </div>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Code</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Destinations</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">Pax</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Travel dates</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Valid dates</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Per person</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Group</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">By</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="10" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="10" class="border border-gray-300 px-2 py-4 text-center text-gray-400">
                                No offers found.
                                <RouterLink v-if="auth.can('staticOffers.create')" :to="routeUrl('staticOffers.create')" class="text-red-600 hover:underline">Add one</RouterLink>
                            </td>
                        </tr>
                        <tr v-for="offer in (loading ? [] : apiResponse?.data ?? [])" :key="offer.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ offer.code }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                {{ offer.name }}
                                <a v-if="offer.instagram_url" :href="offer.instagram_url" target="_blank"
                                   rel="noopener" class="ml-1 text-red-600 hover:underline">IG↗</a>
                                <span class="block text-xs font-normal text-gray-400">{{ offer.status }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div v-for="(leg, i) in offer.destinations" :key="i" class="whitespace-nowrap">
                                    {{ leg.name ?? '—' }}<template v-if="leg.nights">: {{ leg.nights }} nights</template>
                                </div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ offer.pax }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-xs">
                                <template v-if="offer.travel_from || offer.travel_to">
                                    {{ offer.travel_from ?? '…' }} → {{ offer.travel_to ?? '…' }}
                                </template>
                                <span v-else class="text-gray-300">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-xs">
                                <template v-if="offer.valid_from || offer.valid_to">
                                    {{ offer.valid_from ?? '…' }} → {{ offer.valid_to ?? '…' }}
                                </template>
                                <span v-else class="text-gray-300">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right font-semibold text-green-600">
                                {{ money(offer.per_person_from) }}
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right text-gray-500">
                                {{ money(offer.group_total_from) }}
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-xs text-gray-500">{{ offer.user ?? '' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(offer)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchOffers" />

            <template #footer>
                <RouterLink v-if="auth.can('staticOffers.create')" :to="routeUrl('staticOffers.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + New static offer
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(offerToDelete)"
            title="Delete offer?"
            :message="offerToDelete ? `${offerToDelete.code} · ${offerToDelete.name} will be removed.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="offerToDelete = null"
        />
    </AppLayout>
</template>
