<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { downloadFile } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable pro-invoice actions side overlay (mirrors
// Customers/Payments/Actions.vue and Customers/Invoices/Actions.vue).
// Actions are defined here, not served by the API, and shown only when the
// user holds the action's permission. Used by Index.vue and Show.vue.
//
// Endpoint/permission names verified against the backend source
// (Show/Update/Delete/PrintCustomerProInvoiceAction) in
// /Users/granit.ibrahimi/Projects/as-travel-platform-api. Two actions from
// the original reference screenshot are NOT here because the backend has
// no support for them at all (not just an unconfirmed guess — grepped and
// found nothing):
//   - "Convert to Invoice": no dedicated convert endpoint exists.
//     CreateCustomerInvoiceAction accepts an optional pro_invoice_id, so
//     converting really means creating an invoice from this pro-invoice's
//     data — that needs the invoice Create page to support pre-filling
//     from a pro-invoice, which it doesn't yet.
//   - "Generate Payment Link": OnlinePaymentTypeEnum::PRO_INVOICE exists,
//     but no action anywhere creates one (GenerateInvoicePaymentLinkAction
//     only handles customer invoices) — it's a reserved-but-unbuilt case.
const props = defineProps({
    proInvoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();

const allowed = (action) => (action.canAny ? auth.canAny(action.canAny) : auth.can(action.can));

const groups = computed(() => {
    const proInvoice = props.proInvoice;

    if (!proInvoice) {
        return [];
    }

    const items = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('customerProInvoices.show', proInvoice.id), canAny: ['customerProInvoices.show', 'customerProInvoices.showOwn'] }]
            : []),
        {
            label: 'Print',
            action: () => downloadFile(`/customers/pro-invoices/${proInvoice.id}/print`, { fallbackName: `pro-invoice-${proInvoice.gen_id ?? proInvoice.id}.pdf` }),
            can: 'customerProInvoices.print',
        },
        { label: 'Edit', to: routeUrl('customerProInvoices.edit', proInvoice.id), canAny: ['customerProInvoices.update', 'customerProInvoices.updateOwn'] },
        { label: 'Delete', danger: true, action: () => (toDelete.value = proInvoice), canAny: ['customerProInvoices.deleteAll', 'customerProInvoices.deleteOwn'] },
    ].filter(allowed);

    return items.length ? [{ label: null, items }] : [];
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
        await api.delete(`/customers/pro-invoices/${removed.id}`);
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
        :title="proInvoice ? `Customer ProInvoice` : ''"
        :subtitle="proInvoice?.gen_id ?? ''"
        @close="emit('close')"
    >
        <div v-if="proInvoice" class="space-y-5">
            <div v-for="(group, i) in groups" :key="i">
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <button v-if="action.action" type="button" :class="action.danger ? dangerClass : linkClass + ' text-left'" @click="action.action">
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
        title="Delete pro-invoice?"
        :message="toDelete ? `Pro-invoice ${toDelete.gen_id} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
