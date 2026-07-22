<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { downloadFile } from '../../../helpers/download';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import InvoiceActions from './Actions.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const invoice = ref(null);
const actionsOpen = ref(false);
const documents = ref([]);

const canManageDocuments = auth.can('invoiceDocuments.manageDocuments');

// Agent / Date / Due Date, each editable via its change route (pencil button).
const changeLinks = computed(() => {
    if (! invoice.value) {
        return [];
    }

    return [
        { key: 'agent', label: 'Agent', value: invoice.value.user.id ?? '—', to: routeUrl('customerInvoices.changeAgent', invoice.value.id), can: 'customerInvoices.changeAgent' },
        { key: 'date', label: 'Date', value: invoice.value.on_date, to: routeUrl('customerInvoices.changeDate', invoice.value.id), can: 'customerInvoices.changeDate' },
        { key: 'dueDate', label: 'Due Date', value: invoice.value.due_date ?? '—', to: routeUrl('customerInvoices.changeDueDate', invoice.value.id), can: 'customerInvoices.changeDueDate' },
    ];
});

async function load() {
    const { data } = await api.get(`/customers/invoices/${route.params.id}`);
    invoice.value = castResource(data);
}

async function fetchDocuments() {
    if (!canManageDocuments) {
        return;
    }

    const { data } = await api.get(`/customers/invoices/${route.params.id}/documents`);
    documents.value = data.data ?? [];
}

// TODO: wire to the real endpoints once their behaviour is defined
// (create/link a supplier bill for the person, and push to QuickBooks).
function billPerson(order, person) {
    // eslint-disable-next-line no-unused-vars
}

function qbPerson(order, person) {
    // eslint-disable-next-line no-unused-vars
}

async function downloadDocument(document) {
    await downloadFile(
        `/customers/invoices/${route.params.id}/documents/${document.id}`,
        { fallbackName: document.path ?? `document-${document.id}.pdf` },
    );
}

onMounted(() => {
    load();
    fetchDocuments();
});
</script>

<template>
    <AppLayout :title="invoice ? `Invoice ${invoice.gen_id}` : 'Invoice'" fluid>
        <Loader v-if="! invoice" />

        <template v-else>
            <FullWidthBox :title="invoice.gen_id" :collapsible="false" class="mb-6">
                <template #actions>
                    <button
                        type="button"
                        class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        aria-label="Invoice actions"
                        @click="actionsOpen = true"
                    >
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                        </svg>
                    </button>
                </template>

                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <CustomerDetails :customer="invoice.customer" title="Customer details" :boxed="false" />

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
                                    <td class="border border-gray-300 px-3 py-2 text-center">
                                        <RouterLink
                                            v-if="auth.can('customerInvoices.changeAgent')"
                                            :to="routeUrl('customerInvoices.changeAgent', invoice.id)"
                                            class="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                                        >
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                            </svg>
                                            {{ invoice.user.name }}
                                        </RouterLink>
                                        <span v-else>{{ invoice.user.name }}</span>
                                    </td>

                                    <td class="border border-gray-300 px-3 py-2 text-center">
                                        <RouterLink
                                            v-if="auth.can('customerInvoices.changeDate')"
                                            :to="routeUrl('customerInvoices.changeDate', invoice.id)"
                                            class="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                                        >
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                            </svg>
                                            {{ invoice.on_date }}
                                        </RouterLink>
                                        <span v-else>{{ invoice.on_date }}</span>
                                    </td>

                                    <td class="border border-gray-300 px-3 py-2 text-center">
                                        <RouterLink
                                            v-if="auth.can('customerInvoices.changeDueDate')"
                                            :to="routeUrl('customerInvoices.changeDueDate', invoice.id)"
                                            class="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                                        >
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                            </svg>
                                            {{ invoice.due_date }}
                                        </RouterLink>
                                        <span v-else>{{ invoice.due_date }}</span>
                                    </td>

                                </tr>
                            </tbody>
                        </table>

                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Invoice Total</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">SVC</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Paid value</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Debt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="tabular-nums">
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.total_svc) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.paid_amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2 font-bold" :class="invoice.has_debt ? 'text-amber-600' : 'text-green-600'">{{ money(invoice.debt) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.orders.length" :title="`Items: (${invoice.orders.length})`" :collapsible="false" class="mb-6">
                <div class="space-y-4">
                    <div v-for="order in invoice.orders" :key="order.id" class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <table class="w-full border-collapse bg-white text-sm">
                                <tbody>
                                    <tr class="border border-gray-200"><td class="px-3 py-2"><span class="text-gray-500">Vendor:</span> <span class="font-semibold">{{ order.supplier?.name ?? '—' }}</span></td></tr>
                                    <tr class="border border-gray-200"><td class="px-3 py-2"><span class="text-gray-500">Product:</span> <span class="font-semibold">{{ order.product?.name ?? '—' }}</span></td></tr>
                                    <tr class="border border-gray-200"><td class="px-3 py-2"><span class="text-gray-500">Destination:</span> <span class="font-semibold">{{ order.destination?.name ?? '—' }}</span></td></tr>
                                    <tr class="border border-gray-200"><td class="px-3 py-2"><span class="text-gray-500">Date:</span> <span class="font-semibold">{{ order.from_date }}<template v-if="order.to_date"> - {{ order.to_date }}</template></span></td></tr>
                                    <tr class="border border-gray-200"><td class="px-3 py-2"><span class="text-gray-500">Extra comments:</span> <span class="font-semibold">{{ order.extra_info ?? '—' }}</span></td></tr>
                                </tbody>
                            </table>

                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse border border-gray-300 bg-white text-sm">
                                    <thead>
                                        <tr class="text-left text-gray-600">
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">ID</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Name and surname</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">TKT Number</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Sold value</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Buying value</th>
                                            <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Bill</th>
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
                                                <button type="button" class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700" @click="billPerson(order, person)">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                                                    Bill
                                                </button>
                                            </td>
                                            <td class="border border-gray-300 px-3 py-2">
                                                <button type="button" class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700" @click="qbPerson(order, person)">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.5l1.5 12h13.5l1.5-9H5.25M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
                                                    QB
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.lines.length" title="Line items" :collapsible="false" class="mb-6">
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
                            <tr v-for="line in invoice.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.destination ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.credit_notes.length" title="Related credit notes" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Reference</th>
                                <th class="py-2 pr-2">Date</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="creditNote in invoice.credit_notes" :key="creditNote.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">
                                    <RouterLink :to="routeUrl('customerCreditNotes.show', creditNote.id)" class="text-red-600 hover:underline">{{ creditNote.gen_id }}</RouterLink>
                                </td>
                                <td class="py-2 pr-2">{{ creditNote.on_date }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(creditNote.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.connected.length" title="Connected payments" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 px-2 py-2">Date</th>
                                <th class="border border-gray-300 px-2 py-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in invoice.connected" :key="i" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ link.reference }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ link.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                        <tr>
                            <td colspan="2" class="border border-gray-300 px-2 py-2"></td>
                            <td class="border border-gray-300 px-2 py-2 text-right font-bold">150E</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="canManageDocuments" title="Documents" :collapsible="false" class="mb-6">
                <p v-if="documents.length === 0" class="py-2 text-sm text-gray-400">No documents uploaded.</p>
                <table v-else class="w-full text-sm">
                    <thead>
                        <tr class="border-b text-left text-gray-500">
                            <th class="py-2 pr-2">Type</th>
                            <th class="py-2 pr-2">Uploaded</th>
                            <th class="py-2 pl-2 text-right">File</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="document in documents" :key="document.id" class="border-b last:border-0">
                            <td class="py-2 pr-2">{{ document.type_name }}</td>
                            <td class="py-2 pr-2 text-gray-600">{{ document.created_at }}</td>
                            <td class="py-2 pl-2 text-right">
                                <button type="button" class="text-red-700 hover:underline" @click="downloadDocument(document)">Download</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </FullWidthBox>

            <!-- Per-invoice actions — defined locally and permission-gated (Actions.vue). -->
            <InvoiceActions
                :invoice="invoice"
                :show="actionsOpen"
                :show-view-action="false"
                @close="actionsOpen = false"
                @deleted="router.push(routeUrl('customers.show', invoice.customer.id))"
                @document-added="fetchDocuments"
            />
        </template>
    </AppLayout>
</template>
