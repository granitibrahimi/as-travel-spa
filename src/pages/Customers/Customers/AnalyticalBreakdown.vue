<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import StatCard from '../../../components/StatCard.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import CustomerInvoicesReportTable from '../../../components/CustomerInvoicesReportTable.vue';
import api from '../../../helpers/api.js';
import { apiDaysAgo, todayApiDate } from '../../../helpers/date.js';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { customerTransactionPath } from '../../../helpers/customerTransactions.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /customers/customers/{id}/analytical-breakdown?from=&to=&status=all|open&details=1 →
// { groups: [{ number, documents, totals }], unlinked: { documents, totals }, totals }.
// A group is every document joined by links (a payment and the invoices it
// paid, or everything in a reconciliation); `unlinked` are the documents
// without any link that still have an open amount. Each document carries its
// `links` (counterpart + amount); with details=1 invoices and credit notes
// also carry their customer invoices report rows (`details`).
//
// The filters live in the URL query so Back from a document restores them.
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const id = route.params.id;

const { loading, error, errors, data, load } = useReport(`/customers/customers/${id}/analytical-breakdown`);

const customer = ref(null);
const from = ref(route.query.from ?? apiDaysAgo(365));
const to = ref(route.query.to ?? todayApiDate());
const status = ref(route.query.status || 'all');
// The filters the table is showing — what the PDF is built from.
const applied = ref({});
const canSeeDetails = computed(() => auth.can('customerInvoices.reports'));
const details = ref(route.query.details === '1' && canSeeDetails.value);
// The copy for the customer: the API leaves the internal columns out of the
// traveller rows (and the PDF), and the table hides them.
const customerView = ref(route.query.customer_view === '1');
const CUSTOMER_HIDDEN_COLUMNS = ['agent', 'svc_incl', 'fare_incl', 'client', 'client_type', 'ticket_arrangement', 'fop', 'vendor', 'staying_nights', 'comment'];
const hiddenColumns = computed(() => (applied.value.customer_view ? CUSTOMER_HIDDEN_COLUMNS : []));

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'With an open amount' },
];

const downloading = ref(false);

function apply() {
    const params = {
        from: from.value || undefined,
        to: to.value || undefined,
        status: status.value === 'all' ? undefined : status.value,
        details: details.value ? 1 : undefined,
        customer_view: details.value && customerView.value ? 1 : undefined,
    };

    // Kept as '' in the URL when cleared, so "all time" survives a reload.
    router.replace({ query: { ...params, from: from.value ?? '', to: to.value ?? '' } });
    applied.value = params;
    load(params);
}

// GET .../analytical-breakdown/pdf: the same breakdown, laid out like this page.
async function downloadPdf() {
    if (downloading.value) {
        return;
    }
    downloading.value = true;

    try {
        await downloadFile(`/customers/customers/${id}/analytical-breakdown/pdf`, {
            fallbackName: 'analytical-breakdown.pdf',
            config: { params: applied.value },
        });
    } catch (e) {
        // A 422 says the breakdown is too big for a PDF and how to narrow it.
        const tooBig = e.response?.status === 422 ? e.response.data?.errors?.from?.[0] : null;
        notifications.push({ type: 'error', message: tooBig ?? 'Could not export the breakdown.' });
    } finally {
        downloading.value = false;
    }
}

function toggleDetails(value) {
    details.value = value;
    apply();
}

function toggleCustomerView(value) {
    customerView.value = value;
    apply();
}

// Each group gets a colour, repeated on its rows' left edge.
const PALETTE = [
    { bar: 'border-l-sky-500', head: 'bg-sky-50 text-sky-900' },
    { bar: 'border-l-amber-500', head: 'bg-amber-50 text-amber-900' },
    { bar: 'border-l-emerald-500', head: 'bg-emerald-50 text-emerald-900' },
    { bar: 'border-l-violet-500', head: 'bg-violet-50 text-violet-900' },
    { bar: 'border-l-rose-500', head: 'bg-rose-50 text-rose-900' },
    { bar: 'border-l-teal-500', head: 'bg-teal-50 text-teal-900' },
];

const sections = computed(() => {
    if (! data.value) {
        return [];
    }

    const groups = data.value.groups.map((group, i) => ({
        key: `group-${group.number}`,
        title: `Group ${group.number}`,
        summary: summary(group.documents),
        documents: group.documents,
        totals: group.totals,
        colour: PALETTE[i % PALETTE.length],
    }));

    if (data.value.unlinked.documents.length) {
        groups.push({
            key: 'unlinked',
            title: 'Not linked',
            summary: 'open documents with no payment, credit or reconciliation linked',
            documents: data.value.unlinked.documents,
            totals: data.value.unlinked.totals,
            colour: { bar: 'border-l-gray-300', head: 'bg-gray-100 text-gray-700' },
        });
    }

    return groups;
});

function summary(documents) {
    const counts = {};

    for (const document of documents) {
        counts[document.type.name] = (counts[document.type.name] ?? 0) + 1;
    }

    return Object.entries(counts).map(([name, count]) => `${count} × ${name}`).join(' · ');
}

// Hovering a document highlights what it is linked to: its counterparts, and
// everything sharing one of its reconciliations.
const hovered = ref(null);

const highlighted = computed(() => {
    const document = hovered.value;

    if (! document) {
        return new Set();
    }

    const keys = new Set(document.links.map((link) => link.key));
    const reconciliations = document.links.filter((link) => link.key.startsWith('rec_')).map((link) => link.key);

    if (reconciliations.length) {
        for (const section of sections.value) {
            for (const other of section.documents) {
                if (other.links.some((link) => reconciliations.includes(link.key))) {
                    keys.add(other.key);
                }
            }
        }
    }

    keys.delete(document.key);

    return keys;
});

function rowClass(document) {
    if (hovered.value?.key === document.key) {
        return 'bg-yellow-100';
    }

    return highlighted.value.has(document.key) ? 'bg-yellow-50' : 'hover:bg-gray-50';
}

const debit = (document) => (document.amount > 0 ? document.amount : null);
const credit = (document) => (document.amount < 0 ? -document.amount : null);

const columns = 12;
const cell = 'border border-gray-200 px-2 py-1.5';

async function fetchCustomer() {
    const { data: payload } = await api.get(`/customers/customers/${id}`);
    customer.value = payload.data;
}

onMounted(() => {
    fetchCustomer();
    apply();
});
</script>

<template>
    <AppLayout :title="customer ? `Analytical Breakdown: ${customer.full_name}` : 'Analytical Breakdown'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="customer ? `Analytical Breakdown: ${customer.full_name}` : 'Analytical Breakdown'" :collapsible="false">
                <template #actions>
                    <div class="flex flex-wrap items-center gap-2">
                        <Button size="sm" :loading="downloading" :disabled="loading || ! data" @click="downloadPdf">
                            {{ downloading ? 'Preparing…' : 'Download PDF' }}
                        </Button>
                        <RouterLink :to="routeUrl('customers.show', id)" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                            Back to customer
                        </RouterLink>
                    </div>
                </template>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <DateInput v-model="from" label="From date" :error="errors.from" />
                    <DateInput v-model="to" label="To date" :error="errors.to" />
                    <Select v-model="status" :options="statusOptions" label="Show" :placeholder="null" :error="errors.status" />
                    <div class="flex items-end">
                        <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                    </div>
                </div>

                <div v-if="canSeeDetails" class="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
                    <NiceCheckbox :model-value="details" label="Show invoice details (one row per traveller, as in the Customer Invoices Report)" @update:model-value="toggleDetails" />
                    <NiceCheckbox
                        :model-value="details && customerView"
                        :disabled="! details"
                        label="Customer view (hide Agent, SVC, Fare, Client, Client Type, Ticket/Arrangement, FOP, Vendor, Staying nights, Comment)"
                        @update:model-value="toggleCustomerView"
                    />
                </div>

                <p class="mt-3 text-xs text-gray-500">
                    Documents linked to each other — a payment and the invoices it paid, or everything in one reconciliation — form a group. A group is shown whole when any of its documents falls in the date range. Hover a row to highlight what it is linked to.
                </p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard label="Debit (invoiced)" :value="data.totals.debit" :format="money" animate />
                    <StatCard label="Credit (paid / credited)" :value="data.totals.credit" :format="money" animate />
                    <StatCard label="Open balance" :value="data.totals.open" :format="money" animate :accent="data.totals.open > 0" />
                </div>

                <FullWidthBox title="Invoices & payments" :collapsible="false">
                    <Loader v-if="loading" />

                    <div v-else class="overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="whitespace-nowrap text-left text-xs uppercase text-gray-500">
                                    <th :class="cell">Date</th>
                                    <th :class="cell">Document</th>
                                    <th :class="cell">Type</th>
                                    <th :class="cell">Payment type</th>
                                    <th :class="[cell, 'text-right']">Debit</th>
                                    <th :class="[cell, 'text-right']">Credit</th>
                                    <th :class="[cell, 'text-right']">Open</th>
                                    <th :class="cell">Status</th>
                                    <th :class="cell">Parent destination</th>
                                    <th :class="[cell, 'text-right']">Travelers</th>
                                    <th :class="cell">Travel date</th>
                                    <th :class="cell">Invoice type</th>
                                </tr>
                            </thead>

                            <tbody v-if="! sections.length">
                                <tr>
                                    <td :colspan="columns" :class="[cell, 'py-6 text-center text-gray-400']">Nothing for this range.</td>
                                </tr>
                            </tbody>

                            <tbody v-for="section in sections" :key="section.key">
                                <tr :class="section.colour.head">
                                    <td :colspan="columns" :class="[cell, 'border-l-4', section.colour.bar]">
                                        <div class="sticky left-0 flex w-max flex-wrap items-baseline gap-x-6 gap-y-1">
                                            <span>
                                                <span class="font-semibold">{{ section.title }}</span>
                                                <span class="ml-2 text-xs opacity-75">{{ section.summary }}</span>
                                            </span>
                                            <span class="text-xs tabular-nums">
                                                Debit {{ money(section.totals.debit) }}
                                                <span class="mx-1 opacity-40">|</span>
                                                Credit {{ money(section.totals.credit) }}
                                                <span class="mx-1 opacity-40">|</span>
                                                <span :class="section.totals.open !== 0 ? 'font-semibold text-red-600' : ''">Open {{ money(section.totals.open) }}</span>
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                <template v-for="document in section.documents" :key="document.key">
                                    <tr
                                        class="whitespace-nowrap transition-colors"
                                        :class="rowClass(document)"
                                        @mouseenter="hovered = document"
                                        @mouseleave="hovered = null"
                                    >
                                        <td :class="[cell, 'border-l-4', section.colour.bar]">{{ document.date }}</td>
                                        <td :class="[cell, 'font-medium']">
                                            <RouterLink v-if="customerTransactionPath(document.type.id, document.id)" :to="customerTransactionPath(document.type.id, document.id)" class="text-red-600 hover:underline">
                                                {{ document.reference }}
                                            </RouterLink>
                                            <span v-else>{{ document.reference }}</span>
                                            <span v-if="document.external_reference" class="ml-1 text-xs text-gray-400">({{ document.external_reference }})</span>
                                            <span v-if="document.is_ghost" class="ml-1 rounded bg-gray-100 px-1 text-xs text-gray-500">ghost</span>
                                        </td>
                                        <td :class="cell">{{ document.type.name }}</td>
                                        <td :class="cell">{{ document.payment_type }}</td>
                                        <td :class="[cell, 'text-right tabular-nums']">{{ debit(document) === null ? '' : money(debit(document)) }}</td>
                                        <td :class="[cell, 'text-right tabular-nums']">{{ credit(document) === null ? '' : money(credit(document)) }}</td>
                                        <td :class="[cell, 'text-right tabular-nums', document.open_amount !== 0 ? 'font-semibold text-red-600' : 'text-gray-400']">{{ money(document.open_amount) }}</td>
                                        <td :class="cell">{{ document.status }}</td>
                                        <td :class="cell">{{ document.parent_destination }}</td>
                                        <td :class="[cell, 'text-right tabular-nums']">{{ document.travelers }}</td>
                                        <td :class="cell">{{ document.travel_date }}</td>
                                        <td :class="cell">{{ document.invoice_type }}</td>
                                    </tr>

                                    <tr v-if="details && Array.isArray(document.details)">
                                        <td :colspan="columns" :class="[cell, 'border-l-4 bg-gray-50 py-2 pl-6', section.colour.bar]">
                                            <!-- w-0 + min-w-full: scrolls inside the row instead of widening the table. -->
                                            <div class="w-0 min-w-full overflow-x-auto">
                                                <CustomerInvoicesReportTable :rows="document.details ?? []" :hide="hiddenColumns">
                                                    <template #empty="{ columns: span }">
                                                        <tr>
                                                            <td :colspan="span" class="border border-gray-300 px-2 py-3 text-center text-gray-400">No travellers on this document.</td>
                                                        </tr>
                                                    </template>
                                                </CustomerInvoicesReportTable>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
