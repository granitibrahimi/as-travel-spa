<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';

// Reusable customer-gift-card actions side overlay (mirrors
// Customers/Payments/Actions.vue). Actions are defined here, not served by the
// API, and shown only when the user holds the action's permission.
//
// Verified against the backend source in
// /Users/granit.ibrahimi/Projects/as-travel-platform-api:
//   - Gift cards only expose list/show/create/update/delete
//     (modules/Customers/routes.php). There is no PDF/print endpoint and the
//     Show response carries no `qb_link`, so the "Receipt" and "QB" actions
//     from Payments have no gift-card equivalent and are omitted.
//   - Reconcile reuses the customer-level Reconcile page (no gift-card-specific
//     one exists), gated on `customers.reconcile` — same as Payments/Actions.vue.
//   - Journal slug is `customer-gift-card`
//     (AccountTransactionType::CUSTOMER_GIFT_CARD->slug()).
const props = defineProps({
    giftCard: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
    // Offer "Add document" — only the show page hosts the upload modal, so the
    // list view (Index.vue) leaves this off.
    showAddDocument: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'deleted', 'addDocument']);

const auth = useAuthStore();

const groups = computed(() => {
    const giftCard = props.giftCard;

    if (!giftCard) {
        return [];
    }

    const customerId = giftCard.customer?.id ?? null;
    const result = [];

    const record = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('customerGiftCards.show', giftCard.id), can: 'customerGiftCards.show' }]
            : []),
        ...(customerId
            ? [{ label: 'Reconcile', to: routeUrl('customers.reconcile', customerId), can: 'customers.reconcile' }]
            : []),
        { label: 'Edit', to: routeUrl('customerGiftCards.edit', giftCard.id), can: 'customerGiftCards.edit' },
        ...(props.showAddDocument
            ? [{ label: 'Add document', action: () => emit('addDocument'), can: 'customerGiftCards.edit' }]
            : []),
        { label: 'Delete', danger: true, action: () => (toDelete.value = giftCard), can: 'customerGiftCards.delete' },
    ].filter((action) => auth.can(action.can));

    if (record.length) {
        result.push({ label: null, items: record });
    }

    const links = [
        { label: 'Journal', to: `/finance/account-transactions/journal/customer-gift-card/${giftCard.id}`, can: 'accountTransactions.journal' },
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
        await api.delete(`/customers/gift-cards/${removed.id}`);
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
        title="Customer Gift Card"
        :subtitle="giftCard?.gen_id ?? ''"
        @close="emit('close')"
    >
        <div v-if="giftCard" class="divide-y divide-gray-200">
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
        title="Delete gift card?"
        :message="toDelete ? `Gift card ${toDelete.gen_id} will be permanently deleted.` : ''"
        confirm-label="Yes, delete"
        confirm-variant="danger"
        :processing="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
    />
</template>
