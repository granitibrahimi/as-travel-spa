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
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import PaymentActions from './Actions.vue';

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const openOnly = ref(false);

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/suppliers/payments', {
            params: {
                q: search.value || undefined,
                open: openOnly.value ? 1 : undefined,
                page,
            },
        });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchPayments());

// Row picked via the ⋯ button — opens the actions side overlay (Actions.vue,
// the same component used on Payments/Show.vue).
const selected = ref(null);

// After a delete from the actions overlay, refresh the current page.
function onPaymentDeleted() {
    selected.value = null;
    fetchPayments(apiResponse.value?.pagination?.current_page ?? 1);
}
</script>

<template>
    <AppLayout title="Supplier Payments" fluid>
        <FullWidthBox title="Supplier Payments" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchPayments()">
                <input v-model="search" type="text" placeholder="Gen ID, transaction #, reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <NiceCheckbox v-model="openOnly" label="Open only" @update:model-value="fetchPayments()" />
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; openOnly = false; fetchPayments();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Open Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No payments found.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : apiResponse?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('supplierPayments.show', payment.id)" class="text-red-600 hover:underline">{{ payment.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Payment actions"
                                    @click="selected = payment"
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

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchPayments" />
        </FullWidthBox>

        <!-- Per-payment actions — defined locally and permission-gated (Actions.vue). -->
        <PaymentActions
            :payment="selected"
            :show="Boolean(selected)"
            @close="selected = null"
            @deleted="onPaymentDeleted"
        />
    </AppLayout>
</template>
