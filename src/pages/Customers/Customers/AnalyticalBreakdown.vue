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
// { groups: [{ number, documents, totals }], previous_balance, totals, credit_breakdown }, newest first.
// With a from, previous_balance ({ date, open }) is what is still open from
// before it — in totals.open, so the open balance is the actual one.
// A group is one invoice / credit note (role "main", first) and what was
// applied to it (role "settlement": `applied` is the part of that payment /
// credit note / journal applied here, `via` the reconciliations it went
// through). Any other open document (a payment on account, an unapplied
// journal, …) is a group of just itself (role "unapplied"), among the
// invoices by its date. The date filter goes by each group's own document.
// With details=1 the invoices and credit notes also carry their
// customer invoices report rows (`details`).
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
// totals.credit split by what gave it (payments, of those bank / cash, credit
// notes, the rest); the parts add up to totals.credit.
const creditBreakdown = computed(() => data.value?.credit_breakdown ?? {
    payments: { total: 0, bank: 0, cash: 0 },
    credit_notes: 0,
    other: 0,
});
const canSeeDetails = computed(() => auth.can('customerInvoices.reports'));
const details = ref(route.query.details === '1' && canSeeDetails.value);
// The copy for the customer: the API leaves the internal columns out of the
// traveller rows (and the PDF), and the table hides them.
const customerView = ref(route.query.customer_view === '1');
const CUSTOMER_HIDDEN_COLUMNS = ['agent', 'svc_incl', 'fare_incl', 'client', 'client_type', 'ticket_arrangement', 'fop', 'vendor', 'staying_nights', 'comment'];
// Ticket numbers can be left out too, with or without the customer view.
const hideTktNumber = ref(route.query.hide_tkt_number === '1');
const hiddenColumns = computed(() => [
    ...(applied.value.customer_view ? CUSTOMER_HIDDEN_COLUMNS : []),
    ...(applied.value.hide_tkt_number ? ['tkt_number'] : []),
]);

const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'With an open amount' },
];

// The export being prepared: 'pdf', 'excel' or null.
const downloading = ref(null);

function apply() {
    const params = {
        from: from.value || undefined,
        to: to.value || undefined,
        status: status.value === 'all' ? undefined : status.value,
        details: details.value ? 1 : undefined,
        customer_view: details.value && customerView.value ? 1 : undefined,
        hide_tkt_number: details.value && hideTktNumber.value ? 1 : undefined,
    };

    // Kept as '' in the URL when cleared, so "all time" survives a reload.
    router.replace({ query: { ...params, from: from.value ?? '', to: to.value ?? '' } });
    applied.value = params;
    load(params);
}

// GET .../analytical-breakdown/pdf | excel: the same breakdown as this page,
// for the filters it is showing.
async function download(format) {
    if (downloading.value) {
        return;
    }
    downloading.value = format;

    try {
        await downloadFile(`/customers/customers/${id}/analytical-breakdown/${format}`, {
            fallbackName: `analytical-breakdown.${format === 'excel' ? 'xlsx' : 'pdf'}`,
            config: { params: applied.value },
        });
    } catch (e) {
        // A 422 says the breakdown is too big for a PDF and how to narrow it.
        const tooBig = e.response?.status === 422 ? e.response.data?.errors?.from?.[0] : null;
        notifications.push({ type: 'error', message: tooBig ?? 'Could not export the breakdown.' });
    } finally {
        downloading.value = null;
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

function toggleHideTktNumber(value) {
    hideTktNumber.value = value;
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

    // An open document not applied to an invoice is a grey group of just itself.
    return data.value.groups.map((group, i) => {
        const head = group.documents[0];
        const unapplied = head.role === 'unapplied';

        return {
            key: `group-${group.number}`,
            title: `${head.type.name} ${head.reference}`,
            summary: unapplied ? 'open, not applied to an invoice' : summary(group.documents.slice(1)) || 'nothing applied',
            documents: group.documents,
            totals: group.totals,
            colour: unapplied ? { bar: 'border-l-gray-300', head: 'bg-gray-100 text-gray-700' } : PALETTE[i % PALETTE.length],
        };
    });
});

function summary(documents) {
    const counts = {};

    for (const document of documents) {
        counts[document.type.name] = (counts[document.type.name] ?? 0) + 1;
    }

    return Object.entries(counts).map(([name, count]) => `${count} × ${name}`).join(' · ');
}

// A settlement row shows the part applied to its group's invoice / credit note.
const shownAmount = (document) => (document.role === 'settlement' ? document.applied : document.amount);
const debit = (document) => (shownAmount(document) > 0 ? shownAmount(document) : null);
const credit = (document) => (shownAmount(document) < 0 ? -shownAmount(document) : null);

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
                        <Button size="sm" :loading="downloading === 'pdf'" :disabled="loading || ! data || downloading !== null" @click="download('pdf')">
                            {{ downloading === 'pdf' ? 'Preparing…' : 'Download PDF' }}
                        </Button>
                        <Button size="sm" :loading="downloading === 'excel'" :disabled="loading || ! data || downloading !== null" @click="download('excel')">
                            {{ downloading === 'excel' ? 'Preparing…' : 'Download Excel' }}
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
                    <NiceCheckbox
                        :model-value="details && hideTktNumber"
                        :disabled="! details"
                        label="Hide TKT NR"
                        @update:model-value="toggleHideTktNumber"
                    />
                </div>

                <p class="mt-3 text-xs text-gray-500">
                    Each invoice and credit note is shown with what was applied to it — the payments, credit notes and journals, each with the part it settled here (a payment that paid several invoices shows under each of them). Open payments, credit notes and other transactions not applied to an invoice show as a grey group of their own, by their date. The date range goes by each group's own document. A credit note applied to an invoice shows under that invoice.
                </p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <template v-else-if="data">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" :class="creditBreakdown.other !== 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'">
                    <StatCard label="Debit (invoiced)" :value="data.totals.debit" :format="money" animate />
                    <StatCard
                        label="Payments"
                        :value="creditBreakdown.payments.total"
                        :format="money"
                        animate
                        :sub="`Bank ${money(creditBreakdown.payments.bank)} · Cash ${money(creditBreakdown.payments.cash)}`"
                    />
                    <StatCard label="Credit notes" :value="creditBreakdown.credit_notes" :format="money" animate />
                    <StatCard v-if="creditBreakdown.other !== 0" label="Other credits" :value="creditBreakdown.other" :format="money" animate sub="Journals, fin. credit notes" />
                    <StatCard
                        label="Open balance"
                        :value="data.totals.open"
                        :format="money"
                        animate
                        :accent="data.totals.open > 0"
                        :sub="data.previous_balance ? `Incl. ${money(data.previous_balance.open)} previous balance` : ''"
                    />
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
                                    <tr class="whitespace-nowrap hover:bg-gray-50">
                                        <td :class="[cell, 'border-l-4', section.colour.bar]">{{ document.date }}</td>
                                        <td :class="[cell, 'font-medium', document.role === 'settlement' ? 'pl-6' : '']">
                                            <RouterLink v-if="customerTransactionPath(document.type.id, document.id)" :to="customerTransactionPath(document.type.id, document.id)" class="text-red-600 hover:underline">
                                                {{ document.reference }}
                                            </RouterLink>
                                            <span v-else>{{ document.reference }}</span>
                                            <span v-if="document.external_reference" class="ml-1 text-xs text-gray-400">({{ document.external_reference }})</span>
                                            <span v-if="document.is_ghost" class="ml-1 rounded bg-gray-100 px-1 text-xs text-gray-500">ghost</span>
                                            <div v-if="document.role === 'settlement'" class="text-xs font-normal text-gray-400">
                                                {{ money(Math.abs(document.amount)) }} in total
                                                <span v-for="reconciliation in document.via" :key="reconciliation.id">
                                                    · via
                                                    <RouterLink :to="customerTransactionPath(9, reconciliation.id)" class="hover:underline">Reconciliation {{ reconciliation.reference }}</RouterLink>
                                                </span>
                                            </div>
                                        </td>
                                        <td :class="cell">{{ document.type.name }}</td>
                                        <td :class="cell">{{ document.payment_type }}</td>
                                        <td :class="[cell, 'text-right tabular-nums']">{{ debit(document) === null ? '' : money(debit(document)) }}</td>
                                        <td :class="[cell, 'text-right tabular-nums']">{{ credit(document) === null ? '' : money(credit(document)) }}</td>
                                        <td v-if="document.role === 'settlement'" :class="cell"></td>
                                        <td v-else :class="[cell, 'text-right tabular-nums', document.open_amount !== 0 ? 'font-semibold text-red-600' : 'text-gray-400']">{{ money(document.open_amount) }}</td>
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

                            <!-- Oldest last: what is still open from before the range, so
                                 the open balance is the customer's actual one. -->
                            <tbody v-if="data.previous_balance">
                                <tr class="whitespace-nowrap bg-gray-100 font-medium text-gray-700">
                                    <td :class="[cell, 'border-l-4 border-l-gray-400']">{{ data.previous_balance.date }}</td>
                                    <td :class="cell" colspan="5">
                                        Previous balance
                                        <span class="ml-1 text-xs font-normal text-gray-500">still open from before {{ applied.from }}</span>
                                    </td>
                                    <td :class="[cell, 'text-right tabular-nums', data.previous_balance.open !== 0 ? 'font-semibold text-red-600' : 'text-gray-400']">{{ money(data.previous_balance.open) }}</td>
                                    <td :class="cell" :colspan="columns - 7"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
