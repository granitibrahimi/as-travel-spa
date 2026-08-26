<script setup>
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { downloadFile } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import PaymentLinkModal from './PaymentLinkModal.vue';

// Reusable pro-invoice actions side overlay (mirrors
// Customers/Payments/Actions.vue and Customers/Invoices/Actions.vue).
// Actions are defined here, not served by the API, and shown only when the
// user holds the action's permission. Used by Index.vue and Show.vue.
//
// "Print" downloads GET /customers/pro-invoices/{id}/print (confirmed
// endpoint) as a file rather than opening it in a new tab.
//
// TODO: "Convert to Invoice" (POST .../convert), "Delete", and "Generate
// Payment Link" (see PaymentLinkModal.vue) — plus every permission slug
// below — still have no confirmed backend endpoint/permission anywhere
// else in the SPA to mirror; all are best-effort guesses pending
// confirmation.
const props = defineProps({
    proInvoice: { type: Object, default: null },
    show: { type: Boolean, default: false },
    // Hide the "View" link (e.g. when already on the show page).
    showViewAction: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'deleted']);

const auth = useAuthStore();
const router = useRouter();

const allowed = (action) => (action.canAny ? auth.canAny(action.canAny) : auth.can(action.can));

const groups = computed(() => {
    const proInvoice = props.proInvoice;

    if (!proInvoice) {
        return [];
    }

    const result = [];

    const record = [
        ...(props.showViewAction
            ? [{ label: 'View', to: routeUrl('customerProInvoices.show', proInvoice.id), can: 'customerProInvoices.show' }]
            : []),
        { label: 'Convert to Invoice', success: true, action: () => convertToInvoice(proInvoice), can: 'customerProInvoices.convert' },
        {
            label: 'Print',
            action: () => downloadFile(`/customers/pro-invoices/${proInvoice.id}/print`, { fallbackName: `pro-invoice-${proInvoice.gen_id ?? proInvoice.id}.pdf` }),
            can: 'customerProInvoices.print',
        },
        { label: 'Edit', to: routeUrl('customerProInvoices.edit', proInvoice.id), can: 'customerProInvoices.edit' },
        { label: 'Delete', danger: true, action: () => (toDelete.value = proInvoice), can: 'customerProInvoices.delete' },
    ].filter(allowed);

    if (record.length) {
        result.push({ label: null, items: record });
    }

    const links = [
        { label: 'Generate Payment Link', action: () => (paymentLinkOpen.value = true), can: 'customerProInvoices.generatePaymentLink' },
    ].filter(allowed);

    if (links.length) {
        result.push({ label: null, items: links });
    }

    return result;
});

// Modal open state.
const paymentLinkOpen = ref(false);

async function convertToInvoice(proInvoice) {
    const { data } = await api.post(`/customers/pro-invoices/${proInvoice.id}/convert`);
    emit('close');
    router.push(routeUrl('customerInvoices.show', castMutation(data).id));
}

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
const successClass = 'block w-full rounded border border-green-200 px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50';
</script>

<template>
    <ActionsOverlay
        :show="show"
        :title="proInvoice ? `Customer ProInvoice` : ''"
        :subtitle="proInvoice?.gen_id ?? ''"
        @close="emit('close')"
    >
        <div v-if="proInvoice" class="divide-y divide-gray-200">
            <div v-for="(group, i) in groups" :key="i" class="py-4 first:pt-0 last:pb-0">
                <div class="space-y-1.5">
                    <template v-for="action in group.items" :key="action.label">
                        <button
                            v-if="action.action"
                            type="button"
                            :class="action.danger ? dangerClass : (action.success ? successClass : linkClass) + ' text-left'"
                            @click="action.action"
                        >
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

    <PaymentLinkModal :pro-invoice="proInvoice" :show="paymentLinkOpen" @close="paymentLinkOpen = false" />
</template>
