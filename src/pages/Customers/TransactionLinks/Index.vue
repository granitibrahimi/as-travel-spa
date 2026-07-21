<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money';
import { customerTransactionPath } from '../../../helpers/customerTransactions.js';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castPaginated } from '../../../types/responses.js';
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

async function fetchLinks(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/customers/transaction-links', { params: { q: search.value || undefined, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchLinks());

const toUnlink = ref(null);
const unlinking = ref(false);

function parentPath(link) {
    return link.is_reconciliation
        ? routeUrl('customerReconciliations.show', link.reconciliation_id)
        : routeUrl('customerPayments.show', link.payment_id);
}

function unlinkMessage(link) {
    if (! link) {
        return '';
    }

    if (link.is_reconciliation) {
        return `This reverses ${link.reference} from reconciliation #${link.reconciliation_id}. `
            + `If it is the last linked transaction, the reconciliation is removed too.`;
    }

    return `This reverses ${link.reference} from payment #${link.payment_id} and restores its open amount.`;
}

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await fetchLinks(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        unlinking.value = false;
    }
}

const rowActions = (link) => [
    ...(auth.can('customerTransactionsLinks.unlink')
        ? [{ label: 'Unlink', danger: true, action: () => (toUnlink.value = link) }]
        : []),
];
</script>

<template>
    <AppLayout title="Customer Transactions" fluid>
        <FullWidthBox title="Customer Transactions" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchLinks()">
                <input v-model="search" type="text" placeholder="Customer name or link ID…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <button type="submit" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Search</button>
                <button type="button" class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" @click="search = ''; fetchLinks();">Clear</button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 80px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Linked to</th>
                            <th class="border border-gray-300 px-2 py-2">Agent</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No linked transactions found.</td>
                        </tr>
                        <tr v-for="link in (loading ? [] : apiResponse?.data ?? [])" :key="link.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ link.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ link.type }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink
                                    v-if="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                    :to="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                    class="text-red-600 hover:underline"
                                >{{ link.reference }}</RouterLink>
                                <span v-else>{{ link.reference }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink v-if="link.customer" :to="routeUrl('customers.show', link.customer.id)" class="text-red-600 hover:underline">{{ link.customer.id }} # {{ link.customer.name }}</RouterLink>
                                <span v-else>—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="parentPath(link)" class="text-red-600 hover:underline">{{ link.parent_type }}: {{ link.parent_reference }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ link.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ link.created_at }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu v-if="rowActions(link).length" :items="rowActions(link)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchLinks" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toUnlink)"
            title="Unlink transaction?"
            :message="unlinkMessage(toUnlink)"
            confirm-label="Yes, unlink"
            confirm-variant="danger"
            :processing="unlinking"
            @confirm="confirmUnlink"
            @cancel="toUnlink = null"
        />
    </AppLayout>
</template>
