<script setup>
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { openFileInNewTab } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import SendEmailModal from './SendEmailModal.vue';
import AddDocumentModal from './AddDocumentModal.vue';
import PaymentLinkModal from './PaymentLinkModal.vue';

// Reusable customer-invoice actions side overlay. Actions are defined here (not
// served by the API) and shown only when the user holds the action's
// permission — mirrors the legacy invoice aside. Used by Index.vue and Show.vue.
//
// Each action is backed by a real api/v1 endpoint + SPA route. Legacy aside
// actions still without an api/v1 endpoint (Print, Print with products, Send
// E-Mail, Generate Payment Link, Add document, Create Credit Note, Edit) are
// wired incrementally as the platform exposes them — we don't call platform
// web routes from here.
const props = defineProps({
    // The invoice whose actions are shown (null = nothing selected). Accepts
    // both the list summary row and the detail payload.
    invoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted', 'documentAdded']);

const auth = useAuthStore();
const router = useRouter();

// The detail payload nests the customer as an object ({ id, name }); the list
// summary sends only the customer name string. Reconcile needs the id.
const customerId = computed(() => {
    const customer = props.invoice?.customer;
    return customer && typeof customer === 'object' ? customer.id : null;
});

const customerName = computed(() => {
    const customer = props.invoice?.customer;
    return typeof customer === 'object' ? customer?.name : customer;
});

const allowed = (action) => (action.canAny ? auth.canAny(action.canAny) : auth.can(action.can));

// Grouped, permission-filtered actions. Each item is a link (`to`) or an
// external link (`href`). Empty groups are dropped.
const groups = computed(() => {
    const invoice = props.invoice;

    if (!invoice) {
        return [];
    }

    const result = [];

    const documents = [
        { label: 'Print', action: () => openFileInNewTab(`/customer-invoices/${invoice.id}/print`), can: 'customerInvoices.print' },
        { label: 'Print with products', action: () => openFileInNewTab(`/customer-invoices/${invoice.id}/print-products`), can: 'customerInvoices.printProducts' },
        { label: 'Send E-Mail', action: () => (emailOpen.value = true), can: 'customerInvoices.sendEmail' },
        { label: 'Add document', action: () => (documentOpen.value = true), can: 'invoiceDocuments.manageDocuments' },
        { label: 'Generate Payment Link', action: () => (paymentLinkOpen.value = true), can: 'onlinePayments.generate' },
    ].filter(allowed);

    if (documents.length) {
        result.push({ label: null, items: documents });
    }

    const pages = [
        ...(props.showViewAction
            ? [{ label: 'View', to: `/customer-invoices/${invoice.id}`, canAny: ['customerInvoices.show', 'customerInvoices.showOwn'] }]
            : []),
        ...(customerId.value
            ? [{ label: 'Reconcile', to: `/customers/${customerId.value}/reconcile`, can: 'customers.reconcile' }]
            : []),
        { label: 'Journal', to: `/finance/account-transactions/journal/customer-invoice/${invoice.id}`, can: 'accountTransactions.journal' },
        { label: 'Edit', to: `/customer-invoices/${invoice.id}/edit`, canAny: ['customerInvoices.edit', 'customerInvoices.editOwnWithinTheDay'] },
    ].filter(allowed);

    if (pages.length) {
        result.push({ label: 'Pages', items: pages });
    }

    const changes = [
        { label: 'Change Customer', to: `/customer-invoices/${invoice.id}/change-customer`, can: 'customerInvoices.changeCustomer' },
        { label: 'Change Agent', to: `/customer-invoices/${invoice.id}/change-agent`, can: 'customerInvoices.changeAgent' },
        { label: 'Change Date', to: `/customer-invoices/${invoice.id}/change-date`, can: 'customerInvoices.changeDate' },
        { label: 'Change Due Date', to: `/customer-invoices/${invoice.id}/change-due-date`, can: 'customerInvoices.changeDueDate' },
    ].filter(allowed);

    if (changes.length) {
        result.push({ label: 'Change', items: changes });
    }

    // Ungrouped: mutations + destructive actions.
    const other = [];

    if (auth.can('customerInvoices.createCreditNote')) {
        other.push({ label: 'Create Credit Note', action: () => createCreditNote(invoice) });
    }

    if (auth.canAny(['customerInvoices.delete', 'customerInvoices.deleteOwnWithinTheDay'])) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = invoice) });
    }

    if (other.length) {
        result.push({ label: null, items: other });
    }

    return result;
});

// Modal open states.
const emailOpen = ref(false);
const documentOpen = ref(false);
const paymentLinkOpen = ref(false);

// Create a credit note from this invoice, then navigate to the new credit note.
async function createCreditNote(invoice) {
    const { data } = await api.post(`/customer-invoices/${invoice.id}/credit-note`);
    emit('close');
    router.push(`/customer-credit-notes/${data.id}`);
}

// Local delete flow (confirm dialog → API). The parent decides what happens
// after (the list refetches, the show page navigates away) via `deleted`.
const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value || !toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        const removed = toDelete.value;
        await api.delete(`/customer-invoices/${removed.id}`);
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
        :title="invoice ? `Invoice ${invoice.gen_id}` : ''"
        :subtitle="invoice ? `${customerName ?? ''} · ${invoice.on_date ?? ''}` : ''"
        @close="emit('close')"
    >
        <div v-if="invoice" class="space-y-5">
            <div v-for="(group, i) in groups" :key="i">
                <p v-if="group.label" class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ group.label }}</p>
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <a v-if="action.href" :href="action.href" target="_blank" rel="noopener" :class="linkClass">
                            {{ action.label }} <span class="text-gray-400">↗</span>
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
        title="Delete invoice?"
        :message="toDelete ? `Invoice ${toDelete.gen_id} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />

    <SendEmailModal :invoice="invoice" :show="emailOpen" @close="emailOpen = false" @sent="emit('close')" />

    <AddDocumentModal
        :invoice="invoice"
        :show="documentOpen"
        @close="documentOpen = false"
        @uploaded="emit('documentAdded'); emit('close')"
    />

    <PaymentLinkModal :invoice="invoice" :show="paymentLinkOpen" @close="paymentLinkOpen = false" />
</template>
