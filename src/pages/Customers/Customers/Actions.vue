<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable customer actions side overlay. Actions are defined here (not served
// by the API) and shown only when the user holds the action's permission —
// mirrors the platform CustomerActions service. Used by Index.vue and Show.vue.
const props = defineProps({
    // The customer whose actions are shown (null = nothing selected).
    customer: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();

// List payloads use `name`, the show payload uses `full_name`.
const name = computed(() => props.customer?.full_name ?? props.customer?.name ?? '');

// Grouped, permission-filtered actions. Each item is a link (`to`), an external
// link (`href`) or a local handler (`action`, e.g. delete). Empty groups drop.
// Only actions with a matching SPA route are wired up here; platform actions
// without a SPA page yet (Gift Card create, Edit) are intentionally omitted
// until those routes exist.
const groups = computed(() => {
    const customer = props.customer;

    if (!customer) {
        return [];
    }

    const result = [];

    // "Create"
    const creates = [
        { label: 'Pro Invoice', to: `/customers/${customer.id}/pro-invoices/create`, can: 'customerProInvoices.create' },
        { label: 'Invoice', to: `/customers/${customer.id}/invoices/create`, can: 'customerInvoices.create' },
        { label: 'Payment', to: `/customers/${customer.id}/payments/create`, can: 'customerPayments.create' },
        { label: 'GiftCard', to: `/customers/${customer.id}/gift-cards/create`, can: 'customerGiftCards.create' },
    ].filter((action) => auth.can(action.can));

    if (creates.length) {
        result.push({ label: 'Create', items: creates });
    }

    // "Pages"
    const pages = [
        ...(props.showViewAction ? [{ label: 'View', to: `/customers/${customer.id}`, can: 'customers.show' }] : []),
        { label: 'Edit', to: `/customers/${customer.id}/edit`, can: 'customers.edit' },
        { label: 'Statistics', to: `/customers/${customer.id}/statistics`, can: 'customers.invoices' },
        { label: 'Statements', to: `/customers/${customer.id}/statements`, can: 'customers.statements' },
        { label: 'Reconcile', to: `/customers/${customer.id}/reconcile`, can: 'customers.reconcile' },
    ].filter((action) => auth.can(action.can));

    if (pages.length) {
        result.push({ label: 'Pages', items: pages });
    }

    // Ungrouped: delete + external links.
    const other = [];

    if (auth.can('customers.delete')) {
        other.push({ label: 'Delete', danger: true, action: () => (toDelete.value = customer) });
    }

    if (customer.qb_id != null) {
        other.push({
            label: 'Open in QuickBooks',
            href: `https://qbo.intuit.com/app/customerdetail?nameId=${customer.qb_id}`,
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
        await api.delete(`/customers/${removed.id}`);
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
        :subtitle="customer ? `#${customer.id} · ${customer.unique_id ?? ''}` : ''"
        @close="emit('close')"
    >
        <div v-if="customer" class="space-y-5">
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
        </div>
    </ActionsOverlay>

    <ConfirmDialog
        :show="Boolean(toDelete)"
        title="Delete customer?"
        :message="toDelete ? `${name} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
