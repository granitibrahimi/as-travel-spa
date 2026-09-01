<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { openFileInNewTab } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable customer-credit-note actions side overlay — mirrors
// Invoices/Actions.vue. Actions are defined here (not served by the API) and
// shown only when the user holds the action's permission. Used by Index.vue
// and Show.vue.
//
// Backing endpoints (as-travel-platform-api, all mirror customerInvoices.* 1:1):
//   DELETE /customers/credit-notes/{id}                 perm customerCreditNotes.delete / .deleteOwnWithinTheDay (424 when guarded)
//   GET    /customers/credit-notes/{id}/print           perm customerCreditNotes.print          (application/pdf, attachment)
//   GET    /customers/credit-notes/{id}/print-products  perm customerCreditNotes.printProducts  (application/pdf, attachment)
//   PUT    /customers/credit-notes/{id}/customer        perm customerCreditNotes.changeCustomer — body { customer_id }
//   PUT    /customers/credit-notes/{id}/agent           perm customerCreditNotes.changeAgent    — body { agent_id }
//   PUT    /customers/credit-notes/{id}/date            perm customerCreditNotes.changeDate     — body { new_date: d.m.Y }
//   PUT    /customers/credit-notes/{id}/due-date        perm customerCreditNotes.changeDueDate  — body { new_date: d.m.Y, note? }
// The changeCustomer / changeAgent / changeDueDate slugs are new (seeder ids
// 427-429) and must be present in the live DB + granted to roles for those
// actions to appear.
// QB needs no endpoint — the resource exposes qb_id and the credit-memo
// deep-link is https://qbo.intuit.com/app/creditmemo?txnId={qb_id}
// (per QuickBooksSyncDataEntityEnum::CUSTOMER_CREDIT_NOTE on the platform).
const props = defineProps({
    // The credit note whose actions are shown (null = nothing selected).
    // Accepts both the list summary row and the detail payload.
    creditNote: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
    // Offer "Add document" — only the show page hosts the upload modal, so the
    // list view (Index.vue) leaves this off.
    showAddDocument: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'deleted', 'addDocument']);

const auth = useAuthStore();

// The detail payload nests the customer as an object ({ id, name, … }); the
// list summary sends only the customer name string. Reconcile needs the id.
const customerId = computed(() => {
    const customer = props.creditNote?.customer;
    return customer && typeof customer === 'object' ? customer.id : null;
});

const customerName = computed(() => {
    const customer = props.creditNote?.customer;
    return typeof customer === 'object' ? customer?.name : customer;
});

const allowed = (action) => (action.canAny ? auth.canAny(action.canAny) : auth.can(action.can));

// Grouped, permission-filtered actions. Empty groups are dropped.
const groups = computed(() => {
    const cn = props.creditNote;

    if (!cn) {
        return [];
    }

    const result = [];

    const documents = [
        { label: 'Print', can: 'customerCreditNotes.print', action: () => openFileInNewTab(`/customers/credit-notes/${cn.id}/print`) },
        { label: 'Print with products', can: 'customerCreditNotes.printProducts', action: () => openFileInNewTab(`/customers/credit-notes/${cn.id}/print-products`) },
        ...(props.showAddDocument
            ? [{ label: 'Add document', can: 'customerCreditNotes.edit', action: () => emit('addDocument') }]
            : []),
    ].filter(allowed);

    if (documents.length) {
        result.push({ label: null, items: documents });
    }

    const pages = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('customerCreditNotes.show', cn.id), canAny: ['customerCreditNotes.show', 'customerCreditNotes.showOwn'] }]
            : []),
        { label: 'Edit', to: routeUrl('customerCreditNotes.edit', cn.id), canAny: ['customerCreditNotes.edit', 'customerCreditNotes.editOwnWithinTheDay'] },
        { label: 'Journal', to: `/finance/account-transactions/journal/customer-credit-note/${cn.id}`, can: 'accountTransactions.journal' },
        ...(customerId.value
            ? [{ label: 'Reconcile', to: routeUrl('customers.reconcile', customerId.value), can: 'customerCreditNotes.reconcile' }]
            : []),
        ...(cn.qb_id
            ? [{ label: 'QB', can: 'customerCreditNotes.show', href: `https://qbo.intuit.com/app/creditmemo?txnId=${cn.qb_id}` }]
            : []),
    ].filter(allowed);

    if (pages.length) {
        result.push({ label: 'Pages', items: pages });
    }

    const changes = [
        { label: 'Change Customer', can: 'customerCreditNotes.changeCustomer', to: routeUrl('customerCreditNotes.changeCustomer', cn.id) },
        { label: 'Change Agent', can: 'customerCreditNotes.changeAgent', to: routeUrl('customerCreditNotes.changeAgent', cn.id) },
        { label: 'Change Date', can: 'customerCreditNotes.changeDate', to: routeUrl('customerCreditNotes.changeDate', cn.id) },
        { label: 'Change Due Date', can: 'customerCreditNotes.changeDueDate', to: routeUrl('customerCreditNotes.changeDueDate', cn.id) },
    ].filter(allowed);

    if (changes.length) {
        result.push({ label: 'Change', items: changes });
    }

    const other = [];

    if (auth.canAny(['customerCreditNotes.delete', 'customerCreditNotes.deleteOwnWithinTheDay'])) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = cn) });
    }

    if (other.length) {
        result.push({ label: null, items: other });
    }

    return result;
});

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
        await api.delete(`/customers/credit-notes/${removed.id}`);
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
        :title="creditNote ? `Credit Note ${creditNote.gen_id}` : ''"
        :subtitle="creditNote ? `${customerName ?? ''} · ${creditNote.on_date ?? ''}` : ''"
        @close="emit('close')"
    >
        <div v-if="creditNote" class="space-y-5">
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
        title="Delete credit note?"
        :message="toDelete ? `Credit note ${toDelete.gen_id} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
