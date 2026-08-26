<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { downloadFile } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable customer-payment actions side overlay (mirrors
// Customers/Invoices/Actions.vue). Actions are defined here, not served by
// the API, and shown only when the user holds the action's permission.
//
// "Receipt" opens GET /customers/payments/{id}/print (confirmed endpoint);
// its permission slug (`customerPayments.print`) is still a guess, matched
// by symmetry with customerInvoices.print on Invoices/Actions.vue.
//
// TODO: "QB" follows the per-record `qb_link` field convention already used
// for persons on Invoices/Show.vue (data-driven, not permission-gated there
// either) — confirm `payment.qb_link` is the right field name once this is
// wired against real data.
const props = defineProps({
    payment: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();

const allowed = (action) => (action.canAny ? auth.canAny(action.canAny) : auth.can(action.can));

const groups = computed(() => {
    const payment = props.payment;

    if (!payment) {
        return [];
    }

    const customerId = payment.customer?.id ?? null;
    const result = [];

    // Three visually separated groups, matching the reference screenshot:
    // Receipt alone, then the record actions, then the linked-system pages.
    const receipt = [
        {
            label: 'Receipt',
            action: () => downloadFile(`/customers/payments/${payment.id}/print`, { fallbackName: `payment-${payment.gen_id ?? payment.id}.pdf` }),
            can: 'customerPayments.print',
        },
    ].filter(allowed);

    if (receipt.length) {
        result.push({ label: null, items: receipt });
    }

    const record = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('customerPayments.show', payment.id), can: 'customerPayments.show' }]
            : []),
        ...(customerId
            ? [{ label: 'Reconcile', to: routeUrl('customers.reconcile', customerId), can: 'customers.reconcile' }]
            : []),
        { label: 'Edit', to: routeUrl('customerPayments.edit', payment.id), can: 'customerPayments.edit' },
        { label: 'Delete', danger: true, action: () => (toDelete.value = payment), can: 'customerPayments.delete' },
    ].filter(allowed);

    if (record.length) {
        result.push({ label: null, items: record });
    }

    // QB is data-driven (shown whenever `qb_link` is present), not
    // permission-gated — matches the per-person QB link on
    // Customers/Invoices/Show.vue. Journal needs its permission.
    const links = [
        ...(payment.qb_link ? [{ label: 'QB', href: payment.qb_link }] : []),
        { label: 'Journal', to: `/finance/account-transactions/journal/customers/payment/${payment.id}`, can: 'accountTransactions.journal' },
    ].filter((item) => item.href || allowed(item));

    if (links.length) {
        result.push({ label: null, items: links });
    }

    return result;
});

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value || !toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        const removed = toDelete.value;
        await api.delete(`/customers/payments/${removed.id}`);
        toDelete.value = null;
        emit('deleted', removed);
        emit('close');
    } finally {
        deleting.value = false;
    }
}

const linkClass = 'block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50';
const dangerClass = 'block w-full rounded border border-red-200 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50';
</script>

<template>
    <ActionsOverlay
        :show="show"
        :title="payment ? `Customer Payment` : ''"
        :subtitle="payment?.gen_id ?? ''"
        @close="emit('close')"
    >
        <div v-if="payment" class="divide-y divide-gray-200">
            <div v-for="(group, i) in groups" :key="i" class="py-4 first:pt-0 last:pb-0">
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <a v-if="action.href" :href="action.href" target="_blank" rel="noopener" :class="linkClass">
                            {{ action.label }}
                        </a>
                        <button v-else-if="action.action" type="button" :class="action.danger ? dangerClass : linkClass + ' text-left'" @click="action.action">
                            {{ action.label }}
                        </button>
                        <RouterLink v-else :to="action.to" :class="linkClass" @click="emit('close')">
                            {{ action.label }}
                        </RouterLink>
                    </template>
                </div>
            </div>

            <p v-if="groups.length === 0" class="text-sm text-gray-400">No actions available.</p>
        </div>
    </ActionsOverlay>

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
</template>
