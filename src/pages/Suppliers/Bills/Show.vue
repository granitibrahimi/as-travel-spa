<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';
import SupplierTransactionLinks from '../../../components/SupplierTransactionLinks.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';
import Alert from '../../../components/Alert.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const bill = ref(null);
const showDelete = ref(false);
const deleting = ref(false);
const documentsBox = ref(null);

// Reconcile/Delete/QB/Journal — the ⋯ dropdown. Edit is left out for now: its
// SPA page doesn't exist yet (see conversation). Reconcile reuses the
// supplier-level Reconcile page (no bill-specific one exists) — same link/
// permission as SupplierDetails' own "Reconcile" and Suppliers/Show.vue.
// Bills created from a customer invoice can't be deleted here (same rule as
// the Alert below). QB uses `qb_link` (confirmed on the backend, same field
// name convention as Customers/Payments/Actions.vue). Journal slug confirmed
// against the backend (AccountTransactionType::SUPPLIER_BILL->slug() === 'supplier-bill').
const actions = computed(() => (bill.value ? [
    ...(auth.can('suppliers.reconcile') && bill.value.supplier?.id
        ? [{ label: 'Reconcile', to: routeUrl('suppliers.reconcile', bill.value.supplier.id) }]
        : []),
    ...(auth.can('supplierBills.delete') && !bill.value.customer_invoice
        ? [{ label: 'Delete', danger: true, action: () => (showDelete.value = true) }]
        : []),
    ...(bill.value.qb_link ? [{ label: 'QB', href: bill.value.qb_link }] : []),
    ...(auth.can('accountTransactions.journal')
        ? [{ label: 'Journal', to: `/finance/account-transactions/journal/supplier-bill/${bill.value.id}` }]
        : []),
    ...(auth.can('supplierBills.edit')
        ? [{ label: 'Add document', action: () => documentsBox.value?.openUpload() }]
        : []),
] : []));

async function load() {
    const { data } = await api.get(`/suppliers/bills/${route.params.id}`);
    bill.value = castResource(data);
}
onMounted(load);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/suppliers/bills/${route.params.id}`);
        router.push(routeUrl('supplierBills.list'));
    } finally {
        deleting.value = false;
    }
}

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this bill and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/suppliers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="bill ? `Bill ${bill.gen_id}` : 'Bill'" fluid>
        <Loader v-if="! bill" />

        <template v-else>
            <Alert v-if="bill.customer_invoice" type="info" class="mb-6">
                This Bill is created from an Invoice (<RouterLink :to="routeUrl('customerInvoices.show', bill.customer_invoice.id)" class="font-medium underline">{{ bill.customer_invoice.gen_id }}</RouterLink>). It cannot be Edited or Deleted. Changes on the Customer Invoice will be reflected here as well.
            </Alert>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails :supplier="bill.supplier" />

                <FullWidthBox :title="`Bill ${bill.gen_id}`" :collapsible="false">
                    <template v-if="actions.length" #actions>
                        <DropdownMenu :items="actions" />
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                                <td class="border border-gray-300 px-2 py-2">{{ bill.id }} | {{ bill.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Status</th>
                                <td class="border border-gray-300 px-2 py-2">{{ bill.status ?? '-' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Agent</th>
                                <td class="border border-gray-300 px-2 py-2">{{ bill.agent ?? '-' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ bill.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Due date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ bill.due_date ?? '-' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(bill.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Paid</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(bill.paid_amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums" :class="bill.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(bill.open_amount) }}</td>
                            </tr>
                            <tr v-if="bill.customer_invoice">
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Customer invoice</th>
                                <td class="border border-gray-300 px-2 py-2"><RouterLink :to="routeUrl('customerInvoices.show', bill.customer_invoice.id)" class="text-red-600 hover:underline">{{ bill.customer_invoice.gen_id }}</RouterLink></td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Notes</th>
                                <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ bill.notes ?? '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="bill.lines.length" title="Line items" :collapsible="false" class="mt-6">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">ID</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Category</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Description</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-right">Amount</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Tax Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in bill.lines" :key="line.id" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ line.id}}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ line.category }}</td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ line.description }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ line.tax ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="bill.links.length" title="Connected transactions" :collapsible="false" class="mt-6">
                <SupplierTransactionLinks :links="bill.links" :total="bill.links_amount" @unlink="toUnlink = $event" />
            </FullWidthBox>

            <DocumentsBox
                ref="documentsBox"
                :entity="DOCUMENT_ENTITY.SUPPLIER_BILL"
                :id="bill.id"
                :can-manage="auth.can('supplierBills.edit')"
                :can-view="auth.can('supplierBills.show')"
                :show-add-button="false"
            />
        </template>

        <ConfirmDialog
            :show="showDelete"
            title="Delete bill?"
            :message="bill ? `Bill ${bill.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />

        <ConfirmDialog
            :show="Boolean(toUnlink)"
            title="Unlink transaction?"
            :message="unlinkMessage"
            confirm-label="Yes, unlink"
            confirm-variant="danger"
            :processing="unlinking"
            @confirm="confirmUnlink"
            @cancel="toUnlink = null"
        />
    </AppLayout>
</template>
