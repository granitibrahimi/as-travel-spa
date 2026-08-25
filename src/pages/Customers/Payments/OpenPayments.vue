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

// GET /customers/payments?open=1 — standard paginated envelope.
const apiResponse = ref(null);
const loading = ref(false);

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customers/payments', { params: { open: 1, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

// A payment's method comes back either as { id, name } or a plain string
// depending on the endpoint — handle both.
function methodName(payment) {
    return payment.payment_method?.name ?? payment.payment_method ?? '—';
}

function approvedByName(payment) {
    return payment.approved_by?.name ?? payment.approved_by ?? null;
}

onMounted(() => fetchPayments());
</script>

<template>
    <AppLayout title="Open Customer Payments" fluid>
        <DashboardWidget title="List of all Open Payments">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Created by / at</th>
                            <th class="border border-gray-300 px-2 py-2">Approved</th>
                            <th class="border border-gray-300 px-2 py-2">Reconcile</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No open payments.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : apiResponse?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('customerPayments.show', payment.id)" class="text-red-600 hover:underline">
                                    {{ payment.id }}<br>
                                    {{ payment.gen_id }}
                                </RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.customer" :to="routeUrl('customers.show', payment.customer.id)" class="text-red-600 hover:underline">
                                    {{ payment.customer.id }} # {{ payment.customer.name }}
                                </RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ methodName(payment) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                {{ payment.user?.name ?? '—' }}<br>
                                <span class="text-xs text-gray-500">{{ payment.created_at }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <template v-if="approvedByName(payment)">
                                    {{ approvedByName(payment) }}<br>
                                    <span class="text-xs text-gray-500">{{ payment.approved_at }}</span>
                                </template>
                                <span v-else>Not approved</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.customer" :to="routeUrl('customers.reconcile', payment.customer.id)" class="inline-flex items-center gap-1.5 font-medium text-gray-700 hover:text-red-600">
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
