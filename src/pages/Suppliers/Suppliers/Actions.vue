<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable supplier actions side overlay. Actions are defined here (not served
// by the API) and shown only when the user holds the action's permission —
// mirrors the platform SupplierActions service. Used by Index.vue and Show.vue.
const props = defineProps({
    // The supplier whose actions are shown (null = nothing selected).
    supplier: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();

// List payloads use `name`, the show payload uses `full_name`.
const name = computed(() => props.supplier?.full_name ?? props.supplier?.name ?? '');

// Grouped, permission-filtered actions. Each item is a link (`to`), an external
// link (`href`) or a local handler (`action`, e.g. delete). Empty groups drop.
const groups = computed(() => {
    const supplier = props.supplier;

    if (!supplier) {
        return [];
    }

    const result = [];

    // "Create" — only for top-level suppliers (no parent).
    if (supplier.parent_supplier_id == null) {
        const creates = [
            { label: 'Bill', to: `/suppliers/${supplier.id}/bills/create`, can: 'supplierBills.create' },
            { label: 'Payment', to: `/suppliers/${supplier.id}/payments/create`, can: 'supplierPayments.create' },
            { label: 'Deposit', to: `/suppliers/${supplier.id}/deposits/create`, can: 'supplierDeposits.create' },
            { label: 'Credit Note', to: `/suppliers/${supplier.id}/credit-notes/create`, can: 'supplierCreditNotes.create' },
            { label: 'Gift Card', to: `/suppliers/${supplier.id}/gift-cards/create`, can: 'supplierGiftCards.create' },
            { label: 'Refund', to: `/suppliers/${supplier.id}/refunds/create`, can: 'supplierRefunds.create' },
        ].filter((action) => auth.can(action.can));

        if (creates.length) {
            result.push({ label: 'Create', items: creates });
        }
    }

    // "Pages"
    const pages = [
        ...(props.showViewAction ? [{ label: 'View', to: `/suppliers/${supplier.id}`, can: 'suppliers.show' }] : []),
        { label: 'Statements', to: `/suppliers/${supplier.id}/statements`, can: 'suppliers.statements' },
        { label: 'Credentials', to: `/suppliers/${supplier.id}/credentials`, can: 'suppliers.credentials' },
        { label: 'Edit', to: `/suppliers/${supplier.id}/edit`, can: 'suppliers.edit' },
    ].filter((action) => auth.can(action.can));

    if (pages.length) {
        result.push({ label: 'Pages', items: pages });
    }

    // Ungrouped: delete + external links.
    const other = [];

    if (auth.can('suppliers.delete')) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = supplier) });
    }

    if (supplier.qb_id != null) {
        other.push({
            label: 'Open in QuickBooks',
            href: `https://qbo.intuit.com/app/vendordetail?nameId=${supplier.qb_id}`,
            external: true,
        });
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
    if (deleting.value || ! toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        const removed = toDelete.value;
        await api.delete(`/suppliers/${removed.id}`);
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
        :title="name"
        :subtitle="supplier ? `#${supplier.id} · ${supplier.unique_id ?? ''}` : ''"
        @close="emit('close')"
    >
        <div v-if="supplier" class="space-y-5">
            <div v-for="(group, i) in groups" :key="i">
                <p v-if="group.label" class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ group.label }}</p>
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <a
                            v-if="action.href"
                            :href="action.href"
                            target="_blank"
                            rel="noopener"
                            :class="linkClass"
                        >
                            {{ action.label }} <span class="text-gray-400">↗</span>
                        </a>
                        <RouterLink v-else-if="action.to" :to="action.to" :class="linkClass">
                            {{ action.label }}
                        </RouterLink>
                        <button v-else type="button" :class="dangerClass" @click="action.action">
                            {{ action.label }}
                        </button>
                    </template>
                </div>
            </div>

            <p v-if="groups.length === 0" class="text-sm text-gray-400">No actions available.</p>

            <dl class="space-y-1 border-t border-gray-100 pt-4 text-sm">
                <div v-if="supplier.email" class="flex gap-2">
                    <dt class="w-14 shrink-0 text-gray-400">Email</dt>
                    <dd class="break-all text-gray-700">{{ supplier.email }}</dd>
                </div>
                <div v-if="supplier.phone" class="flex gap-2">
                    <dt class="w-14 shrink-0 text-gray-400">Phone</dt>
                    <dd class="text-gray-700">{{ supplier.phone }}</dd>
                </div>
            </dl>
        </div>
    </ActionsOverlay>

    <ConfirmDialog
        :show="Boolean(toDelete)"
        title="Delete supplier?"
        :message="toDelete ? `${name} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
