<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const giftCards = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchGiftCards(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customer-gift-cards', { params: { q: search.value || undefined, page } });
        giftCards.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchGiftCards());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customer-gift-cards/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchGiftCards(giftCards.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (giftCard) => [
    ...(auth.can('customerGiftCards.show') ? [{ label: 'View', href: `/customer-gift-cards/${giftCard.id}` }] : []),
    ...(auth.can('customerGiftCards.edit') ? [{ label: 'Edit', href: `/customer-gift-cards/${giftCard.id}/edit` }] : []),
    ...(auth.can('customerGiftCards.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = giftCard) }] : []),
];
</script>

<template>
    <AppLayout title="Customer Gift Cards" fluid>
        <FullWidthBox title="Customer Gift Cards" :collapsible="false">
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
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! giftCards">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="giftCards.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No gift cards found.</td>
                        </tr>
                        <tr v-for="giftCard in (loading ? [] : giftCards?.data ?? [])" :key="giftCard.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/customer-gift-cards/${giftCard.id}`" class="text-red-600 hover:underline">{{ giftCard.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="giftCard.customer" :to="`/customers/${giftCard.customer.id}`" class="text-red-600 hover:underline">{{ giftCard.customer.name }}</RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(giftCard.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(giftCard.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ giftCard.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(giftCard)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="giftCards" :paginator="giftCards" class="mt-4" @page="fetchGiftCards" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete gift card?"
            :message="toDelete ? `Gift card ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
