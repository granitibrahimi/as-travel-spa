<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable supplier-credit-note actions side overlay — the supplier twin of
// Customers/CreditNotes/Actions.vue. Actions are defined here (not served by
// the API) and shown only when the user holds the action's permission.
//
// Backing endpoints (as-travel-platform-api):
//   DELETE /suppliers/credit-notes/{id}                       perm supplierCreditNotes.delete
//   GET    /suppliers/{id}/reconcile ... (supplier-level page) perm suppliers.reconcile
//   PUT    /suppliers/credit-notes/{id}                        perm supplierCreditNotes.edit
// QB needs no endpoint — SupplierCreditNoteDetailResource exposes `qb_link`
// (https://qbo.intuit.com/app/vendorcredit?txnId={qb_id}).
const props = defineProps({
    // The credit note whose actions are shown (null = nothing selected).
    creditNote: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
    // Offer "Add document" — only the show page hosts the upload modal.
    showAddDocument: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'deleted', 'addDocument']);

const auth = useAuthStore();

const supplierId = computed(() => props.creditNote?.supplier?.id ?? null);

// Grouped, permission-filtered actions. Empty groups are dropped.
const groups = computed(() => {
    const cn = props.creditNote;

    if (!cn) {
        return [];
    }

    const result = [];

    const documents = [
        ...(props.showAddDocument
            ? [{ label: 'Add document', can: 'supplierCreditNotes.edit', action: () => emit('addDocument') }]
            : []),
    ].filter((action) => auth.can(action.can));

    if (documents.length) {
        result.push({ label: null, items: documents });
    }

    const pages = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('supplierCreditNotes.show', cn.id), can: 'supplierCreditNotes.show' }]
            : []),
        ...(supplierId.value
            ? [{ label: 'Reconcile', to: routeUrl('suppliers.reconcile', supplierId.value), can: 'suppliers.reconcile' }]
            : []),
        { label: 'Edit', to: routeUrl('supplierCreditNotes.edit', cn.id), can: 'supplierCreditNotes.edit' },
        { label: 'Journal', to: `/finance/account-transactions/journal/supplier-credit-note/${cn.id}`, can: 'accountTransactions.journal' },
        ...(cn.qb_link
            ? [{ label: 'QB', href: cn.qb_link, can: 'supplierCreditNotes.show' }]
            : []),
    ].filter((action) => auth.can(action.can));

    if (pages.length) {
        result.push({ label: 'Pages', items: pages });
    }

    const other = [];

    if (auth.can('supplierCreditNotes.delete')) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = cn) });
    }

    if (other.length) {
        result.push({ label: null, items: other });
    }

    return result;
});

// Local delete flow (confirm dialog → API). The parent decides what happens
// after (navigate away) via `deleted`.
const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value || !toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        const removed = toDelete.value;
        await api.delete(`/suppliers/credit-notes/${removed.id}`);
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
        :subtitle="creditNote ? `${creditNote.supplier?.name ?? ''} · ${creditNote.on_date ?? ''}` : ''"
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
