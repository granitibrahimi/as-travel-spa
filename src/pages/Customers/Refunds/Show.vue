<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const refund = ref(null);

const connectedTotal = computed(() =>
    (refund.value?.connected ?? []).reduce((sum, link) => sum + Number(link.amount ?? 0), 0),
);

async function load() {
    const { data } = await api.get(`/customers/refunds/${route.params.id}`);
    refund.value = castResource(data);
}
onMounted(load);

// Title ⋯ menu (≤4 entries → DropdownMenu, per the list-view actions rule).
// Actions are defined here, not served by the API. QB is data-driven off the
// backend `qb_link` (null until synced), not permission-gated — same pattern as
// Customers/Payments/Actions.vue; the journal slug `customer-refund` is verified
// against Finance\Enums\AccountTransactionType on the platform.
const actions = computed(() => {
    const r = refund.value;

    if (! r) {
        return [];
    }

    return [
        ...(r.qb_link ? [{ label: 'QB', href: r.qb_link }] : []),
        ...(auth.can('accountTransactions.journal')
            ? [{ label: 'Journal', to: { name: 'accountTransactions.journal', params: { type: 'customer-refund', reference: r.id } } }]
            : []),
        ...(auth.can('customerRefunds.delete')
            ? [{ label: 'Delete', danger: true, action: () => (confirmingDelete.value = true) }]
            : []),
    ];
});

const confirmingDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/refunds/${refund.value.id}`);
        router.push(refund.value.customer?.id
            ? routeUrl('customers.show', refund.value.customer.id)
            : routeUrl('customerRefunds.list'));
    } finally {
        deleting.value = false;
    }
}

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this reimbursement and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } catch (error) {
        notifications.push({
            type: 'error',
            message: error.response?.data?.errors?.link?.[0] ?? 'Could not unlink this transaction.',
        });
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="refund ? `Reimbursement ${refund.gen_id}` : 'Reimbursement'" fluid>
        <Loader v-if="! refund" />

        <template v-else>
            <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="refund.customer" />

                <FullWidthBox title="Reimbursement details" :collapsible="false">
                    <template v-if="actions.length" #actions>
                        <DropdownMenu :items="actions" />
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ refund.id }} | {{ refund.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ refund.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(refund.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(refund.open_amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Payment method</th>
                                <td class="border border-gray-300 px-2 py-2">{{ refund.payment_method ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Transaction #</th>
                                <td class="border border-gray-300 px-2 py-2">{{ refund.transaction_nr ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ refund.agent ?? '—' }}
                                    <br>
                                    <span class="text-gray-500">{{ refund.created_at }}</span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="border border-gray-300 px-2 py-2">
                                    <p class="pb-2 font-bold text-gray-600">Notes:</p>
                                    <span class="whitespace-pre-line">{{ refund.notes ?? '—' }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="refund.connected.length" title="Connected transactions" :collapsible="false">
                <CustomerTransactionLinks
                    :links="refund.connected"
                    :total="connectedTotal"
                    @unlink="toUnlink = $event"
                />
            </FullWidthBox>

            <ConfirmDialog
                :show="Boolean(toUnlink)"
                title="Unlink transaction?"
                :message="unlinkMessage"
                confirm-label="Yes, unlink"
                confirm-variant="danger"
                :processing="unlinking"
                @confirm="confirmUnlink"
                @cancel="toUnlink = null"
            />

            <ConfirmDialog
                :show="confirmingDelete"
                title="Delete reimbursement?"
                :message="`Reimbursement ${refund.gen_id} will be permanently deleted.`"
                confirm-label="Yes, delete"
                confirm-variant="danger"
                :processing="deleting"
                @confirm="confirmDelete"
                @cancel="confirmingDelete = false"
            />
        </template>
    </AppLayout>
</template>
