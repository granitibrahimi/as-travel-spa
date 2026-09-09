<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import GiftCardActions from './Actions.vue';

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchGiftCards(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/suppliers/gift-cards', { params: { q: search.value || undefined, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchGiftCards());

// Row picked via the ⋯ button — opens the actions side overlay (Actions.vue,
// the same component used on the show page).
const selected = ref(null);

// After a delete from the actions overlay, refresh the current page.
function onGiftCardDeleted() {
    selected.value = null;
    fetchGiftCards(apiResponse.value?.pagination?.current_page ?? 1);
}
</script>

<template>
    <AppLayout title="Supplier Gift Cards" fluid>
        <FullWidthBox title="Supplier Gift Cards" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchGiftCards()">
                <input v-model="search" type="text" placeholder="Gen ID…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchGiftCards();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No gift cards found.</td>
                        </tr>
                        <tr v-for="giftCard in (loading ? [] : apiResponse?.data ?? [])" :key="giftCard.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('supplierGiftCards.show', giftCard.id)" class="text-red-600 hover:underline">{{ giftCard.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ giftCard.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(giftCard.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(giftCard.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ giftCard.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Gift card actions"
                                    @click="selected = giftCard"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="1.8" />
                                        <circle cx="12" cy="12" r="1.8" />
                                        <circle cx="12" cy="19" r="1.8" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchGiftCards" />
        </FullWidthBox>

        <!-- Per-gift-card actions — defined locally and permission-gated (Actions.vue). -->
        <GiftCardActions
            :gift-card="selected"
            :show="Boolean(selected)"
            @close="selected = null"
            @deleted="onGiftCardDeleted"
        />
    </AppLayout>
</template>
