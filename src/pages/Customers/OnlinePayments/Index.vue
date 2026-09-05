<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const notifications = useNotificationsStore();

const apiResponse = ref(null);
const loading = ref(false);

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customers/online-payments', { params: { page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchPayments());

// Reference links to the underlying invoice/pro-invoice show page — only
// once `payable_id` is set (the backend leaves it null if that record was
// since deleted).
const referenceRoute = (payment) => routeUrl(
    payment.type === 'Pro Invoice' ? 'customerProInvoices.show' : 'customerInvoices.show',
    payment.payable_id,
);

// ⋯ menu — View always available, "Copy link" only once the backend sends a
// `payment_url` (null until the portal URL is configured).
const rowActions = (payment) => [
    { label: 'View', to: routeUrl('customerOnlinePayments.show', payment.id) },
    ...(payment.payment_url ? [{ label: 'Copy link', action: () => copyLink(payment) }] : []),
];

async function copyLink(payment) {
    try {
        await navigator.clipboard.writeText(payment.payment_url);
        notifications.push({ type: 'success', message: 'Payment link copied to clipboard.' });
    } catch {
        notifications.push({ type: 'error', message: 'Could not copy the link.' });
    }
}

const statusClass = (status) => ({
    Pending: 'bg-yellow-100 text-yellow-700',
    Paid: 'bg-green-100 text-green-700',
    Declined: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
}[status] ?? 'bg-gray-100 text-gray-600');
</script>

<template>
    <AppLayout title="List of Online Payments" fluid>
        <FullWidthBox title="List of online payments" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 80px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2">Email</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 150px;">Created at</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No online payments found.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : apiResponse?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('customerOnlinePayments.show', payment.id)" class="text-red-600 hover:underline">{{ payment.id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.type }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.payable_id" :to="referenceRoute(payment)" class="text-red-600 hover:underline">{{ payment.reference }}</RouterLink>
                                <template v-else>{{ payment.reference ?? '—' }}</template>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.email ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(payment.status.label)">{{ payment.status.label }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.created_by ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(payment)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchPayments" />
        </FullWidthBox>
    </AppLayout>
</template>
