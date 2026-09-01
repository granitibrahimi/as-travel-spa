<script setup>
import {computed, onMounted, ref} from 'vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import {money} from '../../../helpers/money';
import api from '../../../helpers/api';
import {castResource} from '../../../types/responses.js';
import {routeUrl} from '../../../helpers/route.js';
import {useAuthStore} from '../../../stores/auth';
import {useNotificationsStore} from '../../../stores/notifications.js';
import {useFormOptionsStore, toOptions} from '../../../stores/formOptions.js';
import {DOCUMENT_ENTITY, CUSTOMER_INVOICE_DOCUMENT_CATEGORIES} from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import InvoiceActions from './Actions.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const formOptions = useFormOptionsStore();
const invoice = ref(null);
const actionsOpen = ref(false);
const documentsBox = ref(null);

const canManageDocuments = auth.can('invoiceDocuments.manageDocuments');
const documentTypeOptions = computed(() => toOptions(formOptions.customerInvoiceDocumentTypes));

// Agent / Date / Due Date, each editable via its change route (pencil button).
const changeLinks = computed(() => {
    if (!invoice.value) {
        return [];
    }

    return [
        {
            key: 'agent',
            label: 'Agent',
            value: invoice.value.user.id ?? '—',
            to: routeUrl('customerInvoices.changeAgent', invoice.value.id),
            can: 'customerInvoices.changeAgent'
        },
        {
            key: 'date',
            label: 'Date',
            value: invoice.value.on_date,
            to: routeUrl('customerInvoices.changeDate', invoice.value.id),
            can: 'customerInvoices.changeDate'
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            value: invoice.value.due_date ?? '—',
            to: routeUrl('customerInvoices.changeDueDate', invoice.value.id),
            can: 'customerInvoices.changeDueDate'
        },
    ];
});

// Sum of the connected payments' amounts, shown in the table's total row.
const connectedTotal = computed(() =>
    (invoice.value?.connected ?? []).reduce((sum, link) => sum + (Number(link.amount) || 0), 0),
);

async function load() {
    const {data} = await api.get(`/customers/invoices/${route.params.id}`);
    invoice.value = castResource(data);
}

onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this invoice and restores its open amount.`
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
    } catch (error) {
        notifications.push({
            type: 'error',
            message: error.response?.data?.errors?.link?.[0] ?? 'Could not unlink this transaction.',
        });
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="invoice ? `Customer Invoice: ${invoice.gen_id}` : 'Customer Invoice'" fluid>
        <Loader v-if="! invoice"/>

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <CustomerDetails :customer="invoice.customer" />

                <FullWidthBox :title="invoice.gen_id" :collapsible="false">
                    <template #actions>
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            aria-label="Invoice actions"
                            @click="actionsOpen = true"
                        >
                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.8"/>
                                <circle cx="12" cy="12" r="1.8"/>
                                <circle cx="12" cy="19" r="1.8"/>
                            </svg>
                        </button>
                    </template>

                    <div class="grid grid-cols-1">
                        <div class="space-y-6">
                            <table class="w-full border-collapse border border-gray-300 text-sm">
                                <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">
                                        Agent
                                    </th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">
                                        Date
                                    </th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">
                                        Due Date
                                    </th>
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
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
                                                 viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
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
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
                                                 viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
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
                                            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
                                                 viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
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
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                                        Invoice Total
                                    </th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                                        SVC
                                    </th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                                        Paid value
                                    </th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                                        Debt
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr class="tabular-nums">
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.total_svc) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(invoice.paid_amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2 font-bold"
                                        :class="invoice.has_debt ? 'text-amber-600' : 'text-green-600'">
                                        {{ money(invoice.debt) }}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="invoice.orders.length" :title="`Items: (${invoice.orders.length})`" :collapsible="false" class="mb-6">
                <div class="space-y-4">
                    <div v-for="order in invoice.orders" :key="order.id"
                         class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            <table class="w-full self-start border-collapse bg-white text-sm lg:col-span-4">
                                <tbody>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Vendor:</span> <span
                                        class="font-semibold">{{ order.supplier?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Product:</span> <span
                                        class="font-semibold">{{ order.product?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Destination:</span> <span
                                        class="font-semibold">{{ order.destination?.name ?? '—' }}</span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Date:</span> <span
                                        class="font-semibold">{{ order.from_date }}<template
                                        v-if="order.to_date"> - {{ order.to_date }}</template></span></td>
                                </tr>
                                <tr class="border border-gray-200">
                                    <td class="px-3 py-2"><span class="text-gray-500">Extra comments:</span> <span
                                        class="font-semibold">{{ order.extra_info ?? '—' }}</span></td>
                                </tr>
                                </tbody>
                            </table>

                            <div class="overflow-x-auto lg:col-span-8">
                                <table class="w-full border-collapse border border-gray-300 bg-white text-sm">
                                    <thead>
                                    <tr class="text-left text-gray-600">
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">ID</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Name and
                                            surname
                                        </th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">TKT Number
                                        </th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Sold value
                                        </th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Buying
                                            value
                                        </th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">Bill</th>
                                        <th class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium">QB</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr v-if="order.persons.length === 0">
                                        <td colspan="7"
                                            class="border border-gray-300 px-3 py-4 text-center text-gray-400">No
                                            persons.
                                        </td>
                                    </tr>
                                    <tr v-for="person in order.persons" :key="person.id">
                                        <td class="border border-gray-300 px-3 py-2">{{ person.id }}</td>
                                        <td class="border border-gray-300 px-3 py-2">{{ person.name_surname }}</td>
                                        <td class="border border-gray-300 px-3 py-2">{{ person.tkt_number ?? '—' }}</td>
                                        <td class="border border-gray-300 px-3 py-2 tabular-nums">
                                            {{ money(person.sold_value) }}
                                        </td>
                                        <td class="border border-gray-300 px-3 py-2 tabular-nums">
                                            {{ money(person.buying_value) }}
                                        </td>
                                        <td class="border border-gray-300 px-3 py-2">
                                            <a
                                                v-if="person.bill_id"
                                                :href="routeUrl('supplierBills.show', person.bill_id)"
                                                target="_blank"
                                                rel="noopener"
                                                class="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                                            >
                                                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
                                                     viewBox="0 0 24 24">
                                                    <rect x="2.5" y="6" width="19" height="12" rx="2"/>
                                                    <circle cx="12" cy="12" r="2.5"/>
                                                </svg>
                                                Bill
                                            </a>
                                            <span v-else
                                                  class="inline-flex items-center gap-1 rounded bg-gray-200 px-3 py-1 text-gray-400">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor"
                                                         stroke-width="2" viewBox="0 0 24 24"><rect x="2.5" y="6"
                                                                                                    width="19"
                                                                                                    height="12" rx="2"/><circle
                                                        cx="12" cy="12" r="2.5"/></svg>
                                                    Bill
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
                                                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
                                                     viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                          d="M2.25 3h1.5l1.5 12h13.5l1.5-9H5.25M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
                                                </svg>
                                                QB
                                            </a>
                                            <span v-else
                                                  class="inline-flex items-center gap-1 rounded bg-gray-200 px-3 py-1 text-gray-400">
                                                    <svg class="h-4 w-4" fill="none" stroke="currentColor"
                                                         stroke-width="2" viewBox="0 0 24 24"><path
                                                        stroke-linecap="round" stroke-linejoin="round"
                                                        d="M2.25 3h1.5l1.5 12h13.5l1.5-9H5.25M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/></svg>
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

            <FullWidthBox v-if="invoice.credit_notes.length" title="Related credit notes" :collapsible="false"
                          class="mb-6">
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
                        <tr v-for="creditNote in invoice.credit_notes" :key="creditNote.id"
                            class="border-b last:border-0">
                            <td class="py-2 pr-2">
                                <RouterLink :to="routeUrl('customerCreditNotes.show', creditNote.id)"
                                            class="text-red-600 hover:underline">{{ creditNote.gen_id }}
                                </RouterLink>
                            </td>
                            <td class="py-2 pr-2">{{ creditNote.on_date }}</td>
                            <td class="py-2 pl-2 text-right tabular-nums">{{ money(creditNote.amount) }}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.connected.length" title="Connected payments" :collapsible="false">
                <CustomerTransactionLinks
                    :links="invoice.connected"
                    :total="connectedTotal"
                    @unlink="toUnlink = $event"
                />
            </FullWidthBox>

            <DocumentsBox
                ref="documentsBox"
                :entity="DOCUMENT_ENTITY.CUSTOMER_INVOICE"
                :id="invoice.id"
                :can-manage="canManageDocuments"
                :can-view="canManageDocuments"
                :category-options="documentTypeOptions"
                :category-labels="CUSTOMER_INVOICE_DOCUMENT_CATEGORIES"
                :show-add-button="false"
            />

            <!-- Per-invoice actions — defined locally and permission-gated (Actions.vue). -->
            <InvoiceActions
                :invoice="invoice"
                :show="actionsOpen"
                :show-view-action="false"
                :show-add-document="true"
                @close="actionsOpen = false"
                @add-document="documentsBox?.openUpload()"
                @deleted="router.push(routeUrl('customers.show', invoice.customer.id))"
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
