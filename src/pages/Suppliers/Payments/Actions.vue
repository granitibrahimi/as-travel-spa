<script setup>
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castMutation } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable supplier-payment actions side overlay (mirrors
// Customers/Payments/Actions.vue). Actions are defined here, not served by the
// API, and shown only when the user holds the action's permission.
//
// Endpoint/permission/field names below are verified against the backend
// source in /Users/granit.ibrahimi/Projects/as-travel-platform-api:
//   - Reconcile reuses the supplier-level Reconcile page (no payment-specific
//     one exists), gated on `suppliers.reconcile` — same as Bills/Show.vue and
//     Suppliers/Show.vue.
//   - QB is data-driven: `qb_link` is built server-side (ShowSupplierPayments /
//     GetSupplierPayments) as https://qbo.intuit.com/app/billpayment?txnId=…,
//     matching the legacy payments aside.
//   - Journal slug is `supplier-payment` (AccountTransactionType::SUPPLIER_PAYMENT->slug()).
const props = defineProps({
    payment: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();
const router = useRouter();

const groups = computed(() => {
    const payment = props.payment;

    if (!payment) {
        return [];
    }

    const supplierId = payment.supplier?.id ?? null;
    const result = [];

    const record = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('supplierPayments.show', payment.id), can: 'supplierPayments.show' }]
            : []),
        ...(supplierId
            ? [{ label: 'Reconcile', to: routeUrl('suppliers.reconcile', supplierId), can: 'suppliers.reconcile' }]
            : []),
        { label: 'Edit', to: routeUrl('supplierPayments.edit', payment.id), can: 'supplierPayments.edit' },
        // Convert is only possible while the payment is fully unused (legacy rule).
        ...(payment.open_amount === payment.amount
            ? [{ label: 'Convert to deposit', action: () => (toConvert.value = payment), can: 'supplierPayments.convertToDeposit' }]
            : []),
        { label: 'Delete', danger: true, action: () => (toDelete.value = payment), can: 'supplierPayments.delete' },
    ].filter((action) => auth.can(action.can));

    if (record.length) {
        result.push({ label: null, items: record });
    }

    const links = [
        ...(payment.qb_link ? [{ label: 'QB', href: payment.qb_link }] : []),
        { label: 'Journal', to: `/finance/account-transactions/journal/supplier-payment/${payment.id}`, can: 'accountTransactions.journal' },
    ].filter((item) => item.href || auth.can(item.can));

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
        await api.delete(`/suppliers/payments/${removed.id}`);
        toDelete.value = null;
        emit('deleted', removed);
        emit('close');
    } finally {
        deleting.value = false;
    }
}

const toConvert = ref(null);
const converting = ref(false);

async function confirmConvert() {
    if (converting.value || !toConvert.value) {
        return;
    }

    converting.value = true;

    try {
        const { data } = await api.post(`/suppliers/payments/${toConvert.value.id}/convert-to-deposit`);
        router.push(routeUrl('supplierDeposits.show', castMutation(data).id));
    } finally {
        converting.value = false;
        toConvert.value = null;
    }
}

const linkClass = 'block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50';
const dangerClass = 'block w-full rounded border border-red-200 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50';
</script>

<template>
    <ActionsOverlay
        :show="show"
        title="Supplier Payment"
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

    <ConfirmDialog
        :show="Boolean(toConvert)"
        title="Convert payment to deposit?"
        :message="toConvert ? `Payment ${toConvert.gen_id} will be converted into a supplier deposit.` : ''"
        confirm-label="Yes, convert"
        :processing="converting"
        @confirm="confirmConvert"
        @cancel="toConvert = null"
    />
</template>
