<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import CreditNoteActions from './Actions.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const creditNote = ref(null);
const actionsOpen = ref(false);
const documentsBox = ref(null);

// Sum of the connected payments' amounts, shown in the table's total row.
const connectedTotal = computed(() =>
    (creditNote.value?.connected ?? []).reduce((sum, link) => sum + (Number(link.amount) || 0), 0),
);

async function load() {
    const { data } = await api.get(`/customers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
}

onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this credit note and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="creditNote ? `Credit Note: ${creditNote.gen_id}` : 'Credit Note'" fluid>
        <Loader v-if="! creditNote" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <CustomerDetails :customer="creditNote.customer" />

                <FullWidthBox :title="creditNote.gen_id" :collapsible="false">
                    <template #actions>
                        <RouterLink
                            v-if="creditNote.related_invoice"
                            :to="routeUrl('customerInvoices.show', creditNote.related_invoice.id)"
                            class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                        >
                            Related invoice {{ creditNote.related_invoice.gen_id }}
                        </RouterLink>
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            aria-label="Credit note actions"
                            @click="actionsOpen = true"
                        >
                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="12" cy="19" r="1.8" />
                            </svg>
                        </button>
                    </template>

                    <div class="space-y-6">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Agent</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Date</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.agent ?? '—' }}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.on_date }}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.due_date ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Credit Note Total</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">SVC</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Paid value</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Debt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="tabular-nums">
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.total_svc) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.paid_amount) }}</td>
                                    <td
                                        class="border border-gray-300 px-3 py-2 font-bold"
                                        :class="creditNote.has_debt ? 'text-amber-600' : 'text-green-600'"
                                    >{{ money(creditNote.debt) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </div>

            <!-- Every credit note created natively (not imported from QuickBooks) only
                 has orders/persons — "Line items" below stays empty for those and only
                 applies to QB-imported ones. Mirrors Invoices/Show.vue's "Items" box. -->
            <FullWidthBox v-if="creditNote.orders.length" :title="`Items: (${creditNote.orders.length})`" :collapsible="false" class="mb-6">
                <div class="space-y-4">
                    <div v-for="order in creditNote.orders" :key="order.id" class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <table class="w-full self-start border-collapse bg-white text-sm lg:col-span-4">
                                <tbody>
                                    <tr class="border border-gray-200">
                                        <td class="px-3 py-2"><span class="text-gray-500">Vendor:</span> <span class="font-semibold">{{ order.supplier?.name ?? '—' }}</span></td>
                                    </tr>
                                    <tr class="border border-gray-200">
                                        <td class="px-3 py-2"><span class="text-gray-500">Product:</span> <span class="font-semibold">{{ order.product?.name ?? '—' }}</span></td>
                                    </tr>
                                    <tr class="border border-gray-200">
                                        <td class="px-3 py-2"><span class="text-gray-500">Destination:</span> <span class="font-semibold">{{ order.destination?.name ?? '—' }}</span></td>
                                    </tr>
                                    <tr class="border border-gray-200">
                                        <td class="px-3 py-2"><span class="text-gray-500">Date:</span> <span class="font-semibold">{{ order.from_date }}<template v-if="order.to_date"> - {{ order.to_date }}</template></span></td>
                                    </tr>
                                    <tr class="border border-gray-200">
                                        <td class="px-3 py-2"><span class="text-gray-500">Extra comments:</span> <span class="font-semibold">{{ order.extra_info ?? '—' }}</span></td>
                                    </tr>
                                </tbody>
                            </table>

                            <div class="overflow-x-auto lg:col-span-8">
                                <table class="w-full border-collapse border border-gray-300 bg-white text-sm">
                                    <thead>
                                        <tr class="text-left text-gray-600">
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">ID</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Name and surname</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">TKT Number</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Sold value</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Buying value</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Credit Note</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">QB</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-if="order.persons.length === 0">
                                            <td colspan="7" class="border border-gray-300 px-3 py-4 text-center text-gray-400">No persons.</td>
                                        </tr>
                                        <tr v-for="person in order.persons" :key="person.id">
                                            <td class="border border-gray-300 px-3 py-2">{{ person.id }}</td>
                                            <td class="border border-gray-300 px-3 py-2">{{ person.name_surname }}</td>
                                            <td class="border border-gray-300 px-3 py-2">{{ person.tkt_number ?? '—' }}</td>
                                            <td class="border border-gray-300 px-3 py-2 tabular-nums">{{ money(person.sold_value) }}</td>
                                            <td class="border border-gray-300 px-3 py-2 tabular-nums">{{ money(person.buying_value) }}</td>
                                            <td class="border border-gray-300 px-3 py-2">
                                                <a
                                                    v-if="person.credit_note_id"
                                                    :href="routeUrl('supplierCreditNotes.show', person.credit_note_id)"
                                                    target="_blank"
                                                    rel="noopener"
                                                    class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                                                >
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <rect x="2.5" y="6" width="19" height="12" rx="2" />
                                                        <circle cx="12" cy="12" r="2.5" />
                                                    </svg>
                                                    Credit Note
                                                </a>
                                                <span v-else class="inline-flex items-center gap-1 rounded bg-gray-200 px-3 py-1 text-gray-400">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <rect x="2.5" y="6" width="19" height="12" rx="2" />
                                                        <circle cx="12" cy="12" r="2.5" />
                                                    </svg>
                                                    Credit Note
                                                </span>
                                            </td>
                                            <td class="border border-gray-300 px-3 py-2">
                                                <a
                                                    v-if="person.qb_link"
                                                    :href="person.qb_link"
                                                    target="_blank"
                                                    rel="noopener"
                                                    class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                                                >
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.5l1.5 12h13.5l1.5-9H5.25M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                                    </svg>
                                                    QB
                                                </a>
                                                <span v-else class="inline-flex items-center gap-1 rounded bg-gray-200 px-3 py-1 text-gray-400">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.5l1.5 12h13.5l1.5-9H5.25M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                                    </svg>
                                                    QB
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.lines.length" title="Line items" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Description</th>
                                <th class="py-2 pr-2">Destination</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in creditNote.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.destination ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.connected.length" title="Connected payments" :collapsible="false">
                <CustomerTransactionLinks
                    :links="creditNote.connected"
                    :total="connectedTotal"
                    @unlink="toUnlink = $event"
                />
            </FullWidthBox>

            <DocumentsBox
                ref="documentsBox"
                :entity="DOCUMENT_ENTITY.CUSTOMER_CREDIT_NOTE"
                :id="creditNote.id"
                :can-manage="auth.can('customerCreditNotes.edit')"
                :can-view="auth.can('customerCreditNotes.show')"
                :show-add-button="false"
            />

            <!-- Per-credit-note actions — defined locally and permission-gated (Actions.vue). -->
            <CreditNoteActions
                :credit-note="creditNote"
                :show="actionsOpen"
                :show-view-action="false"
                :show-add-document="true"
                @close="actionsOpen = false"
                @add-document="documentsBox?.openUpload()"
                @deleted="router.push(routeUrl('customers.show', creditNote.customer.id))"
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
        </template>
    </AppLayout>
</template>
