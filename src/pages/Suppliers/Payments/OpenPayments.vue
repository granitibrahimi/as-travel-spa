<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import DashboardWidget from '../../../components/DashboardWidget.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

// GET /suppliers/payments?open=1 — standard paginated envelope.
const apiResponse = ref(null);
const loading = ref(false);

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/suppliers/payments', { params: { open: 1, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchPayments());
</script>

<template>
    <AppLayout title="Open Supplier Payments" fluid>
        <DashboardWidget title="List of Open Payments">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2">Reconcile</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No open payments.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : apiResponse?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('supplierPayments.show', payment.id)" class="text-red-600 hover:underline">
                                    {{ payment.id }}
                                </RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.supplier" :to="routeUrl('suppliers.show', payment.supplier.id)" class="text-red-600 hover:underline">
                                    {{ payment.supplier.id }} # {{ payment.supplier.name }}
                                </RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.supplier" :to="routeUrl('suppliers.reconcile', payment.supplier.id)" class="inline-flex items-center gap-1.5 font-medium text-gray-700 hover:text-red-600">
                                    <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    Reconcile
                                </RouterLink>
                                <span v-else>—</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchPayments" />
        </DashboardWidget>
    </AppLayout>
</template>
