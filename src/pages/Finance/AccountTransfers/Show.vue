<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const transfer = ref(null);
const notFound = ref(false);
const showDelete = ref(false);
const deleting = ref(false);

const title = computed(() => {
    if (notFound.value) {
        return 'Transfer not found';
    }

    return transfer.value ? `Transfer ${transfer.value.gen_id}` : `Transfer #${id}`;
});

// Edit/Delete/QB/Journal — the ⋯ dropdown, per the row-actions convention
// (see AccountTransfers/Index.vue, whose rowActions this mirrors minus "View").
// QB is data-driven off `qb_url` (empty until QuickBooks-synced), not
// permission-gated — same convention as Customers/Payments/Actions.vue.
// Journal path/slug confirmed against the backend
// (AccountTransactionType::TRANSFER->slug() === 'transfer').
const actions = computed(() => (transfer.value ? [
    ...(auth.can('accountTransfers.edit') && transfer.value.editable
        ? [{ label: 'Edit', to: routeUrl('accountTransfers.edit', transfer.value.id) }]
        : []),
    ...(auth.can('accountTransfers.delete') ? [{ label: 'Delete', danger: true, action: () => (showDelete.value = true) }] : []),
    ...(transfer.value.qb_url ? [{ label: 'QB', href: transfer.value.qb_url }] : []),
    ...(auth.can('accountTransactions.journal')
        ? [{ label: 'Journal', to: `/finance/account-transactions/journal/transfer/${transfer.value.id}` }]
        : []),
] : []));

onMounted(async () => {
    try {
        const { data } = await api.get(`/finance/account-transfers/${id}`);
        transfer.value = castResource(data);
    } catch (error) {
        if (error.response?.status === 404) {
            notFound.value = true;
        } else {
            throw error;
        }
    }
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/finance/account-transfers/${id}`);
        router.push(routeUrl('accountTransfers.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox title="Transfer details" :collapsible="false">
            <template v-if="transfer && actions.length" #actions>
                <DropdownMenu :items="actions" />
            </template>

            <div v-if="notFound" class="py-16 text-center">
                <p class="text-5xl font-bold text-gray-300">404</p>
                <p class="mt-3 text-gray-600">Transfer #{{ id }} doesn't exist — it may have been deleted.</p>
            </div>

            <Loader v-else-if="! transfer" />
            <template v-else>
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.id }} | {{ transfer.gen_id }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(transfer.amount) }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">From account</th>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.from_account }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">To account</th>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.to_account }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.user.name }}</td>
                        </tr>
                        <tr>
                            <td colspan="2" class="border border-gray-300 px-2 py-2">
                                <p class="pb-2 font-bold text-gray-600">Notes:</p>
                                {{ transfer.notes ?? '—' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </template>

            <template #footer>
                <RouterLink :to="routeUrl('accountTransfers.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to transfers
                </RouterLink>
            </template>
        </FullWidthBox>

        <FullWidthBox v-if="transfer && transfer.payments.length" title="Approved cash" :collapsible="false" class="mt-6">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Client</th>
                            <th class="border border-gray-300 px-2 py-2">Method</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Open amount</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Created by</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Approved</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Unlink</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="payment in transfer.payments" :key="payment.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">
                                <RouterLink :to="routeUrl('customerPayments.show', payment.id)" class="text-red-700 hover:underline">{{ payment.id }} | {{ payment.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('customers.show', payment.customer.id)" class="text-red-700 hover:underline">{{ payment.customer.name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method?.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.open_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ payment.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ payment.user?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">
                                <template v-if="payment.approved_by">
                                    {{ payment.approved_by.name }}
                                    <br>
                                    <span class="text-gray-500">{{ payment.approved_at }}</span>
                                </template>
                                <template v-else>—</template>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <!-- Unlink endpoint isn't built yet — button is a placeholder. -->
                                <button
                                    type="button"
                                    disabled
                                    title="Coming soon"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-300"
                                >
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m5.656-5.656l1.5-1.5a4 4 0 115.656 5.656l-3 3a4 4 0 01-5.656 0" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <FullWidthBox v-if="transfer && transfer.cash_transactions.length" title="Cash movement" :collapsible="false" class="mt-6">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Deposited amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Total amount</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Created by</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="tx in transfer.cash_transactions" :key="tx.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">{{ tx.id }} | {{ tx.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink :to="routeUrl('customers.show', tx.customer.id)" class="text-red-700 hover:underline">{{ tx.customer.name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(tx.deposited_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(tx.total_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ tx.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ tx.created_by?.name ?? '—' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="showDelete"
            title="Delete transfer?"
            message="The transfer will be deleted and any approved cash returned to undeposited."
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
