<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');

async function fetchPayments(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customers/payments', { params: { q: search.value || undefined, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchPayments());

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/payments/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchPayments(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (payment) => [
    ...(auth.can('customerPayments.show') ? [{ label: 'View', href: routeUrl('customerPayments.show', payment.id) }] : []),
    ...(auth.can('customerPayments.edit') ? [{ label: 'Edit', href: routeUrl('customerPayments.edit', payment.id) }] : []),
    ...(auth.can('customerPayments.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = payment) }] : []),
];
</script>

<template>
    <AppLayout title="Customer Payments" fluid>
        <FullWidthBox title="Customer Payments" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchPayments()">
                <input v-model="search" type="text" placeholder="Gen ID / transaction #…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchPayments();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Transaction #</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Agent</th>
                            <th class="border border-gray-300 px-2 py-2">Approved by</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 140px;">Created</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="10" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="10" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No payments found.</td>
                        </tr>
                        <tr v-for="payment in (loading ? [] : apiResponse?.data ?? [])" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('customerPayments.show', payment.id)" class="text-red-600 hover:underline">{{ payment.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.transaction_nr ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="payment.customer" :to="routeUrl('customers.show', payment.customer.id)" class="text-red-600 hover:underline">{{ payment.customer.name }}</RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.user?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.approved_by?.name ?? payment.approved_by ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-500">{{ payment.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(payment)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchPayments" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete payment?"
            :message="toDelete ? `Payment ${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
