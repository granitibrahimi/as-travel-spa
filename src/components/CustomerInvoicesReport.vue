<script setup>
import { computed, ref } from 'vue';
import Loader from './Loader.vue';
import InputText from './Form/InputText.vue';
import { money } from '../helpers/money.js';
import { useAuthStore } from '../stores/auth';

// Results view for the customer-invoices report, shared by the Finance report
// (all agents) and the CRM "My Invoices" report (scoped to the current agent by
// the backend). `data` is the `{ items, totals }` payload from
// GET /customers/invoices/report; the search box filters the already-loaded
// rows client-side — no re-fetch.
const props = defineProps({
    data: { type: Object, default: null },
    loading: { type: Boolean, default: false },
});

const auth = useAuthStore();

// Sales / Purchase / SVC totals are only for the full company report — an agent
// who can see just their own invoices (`customerInvoices.reportsOwn` without
// `customerInvoices.reports`) doesn't get the totals line.
const showTotals = computed(() => auth.can('customerInvoices.reports'));

const search = ref('');

const rows = computed(() => props.data?.items ?? []);

// One lowercased haystack per row, built once per filter pass.
function haystack(row) {
    return [
        row.nr,
        row.product,
        row.agent,
        row.tkt_number,
        row.amount,
        row.svc_incl,
        row.fare_incl,
        row.payment,
        row.name,
        row.client,
        row.date,
        row.fop,
        row.vendor,
        row.inv_code,
        row.destination,
        row.departure_date,
        row.arrival_date,
        row.staying_nights,
        row.comment,
        row.parent_destination,
        row.client_type,
        row.ticket_arrangement,
    ].join(' ').toLowerCase();
}

const filteredRows = computed(() => {
    const q = search.value.trim().toLowerCase();

    if (! q) {
        return rows.value;
    }

    return rows.value.filter((row) => haystack(row).includes(q));
});
</script>

<template>
    <Loader v-if="loading" />

    <template v-else>
        <div class="mb-3 flex flex-wrap items-center gap-3" :class="showTotals ? 'justify-between' : 'justify-end'">
            <p v-if="showTotals" class="text-sm font-medium text-gray-700">
                Sales: {{ money(data?.totals?.sales) }}
                <span class="mx-2 text-gray-300">|</span>
                Purchase: {{ money(data?.totals?.purchase) }}
                <span class="mx-2 text-gray-300">|</span>
                SVC: {{ money(data?.totals?.svc) }}
            </p>

            <div class="w-full sm:w-72">
                <InputText v-model="search" placeholder="Search results…" />
            </div>
        </div>

        <p v-if="search && rows.length" class="mb-2 text-xs text-gray-400">
            {{ filteredRows.length }} of {{ rows.length }} rows
        </p>

        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="whitespace-nowrap text-left text-xs uppercase text-gray-500">
                        <th class="border border-gray-300 px-2 py-2">NR</th>
                        <th class="border border-gray-300 px-2 py-2">Product</th>
                        <th class="border border-gray-300 px-2 py-2">Agent</th>
                        <th class="border border-gray-300 px-2 py-2">TKT NR</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">SVC incl</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Fare incl</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Payment</th>
                        <th class="border border-gray-300 px-2 py-2">Name</th>
                        <th class="border border-gray-300 px-2 py-2">Client</th>
                        <th class="border border-gray-300 px-2 py-2">Date</th>
                        <th class="border border-gray-300 px-2 py-2">FOP</th>
                        <th class="border border-gray-300 px-2 py-2">Vendor</th>
                        <th class="border border-gray-300 px-2 py-2">INV CODE</th>
                        <th class="border border-gray-300 px-2 py-2">Destination</th>
                        <th class="border border-gray-300 px-2 py-2">Departure Date</th>
                        <th class="border border-gray-300 px-2 py-2">Arrival Date</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Staying nights</th>
                        <th class="border border-gray-300 px-2 py-2">Comment</th>
                        <th class="border border-gray-300 px-2 py-2">Parent Destination</th>
                        <th class="border border-gray-300 px-2 py-2">Client Type</th>
                        <th class="border border-gray-300 px-2 py-2">Ticket/Arrangement</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, i) in filteredRows" :key="row.nr ?? i" class="whitespace-nowrap hover:bg-gray-50">
                        <td class="border border-gray-300 px-2 py-2 text-center">{{ row.nr ?? i + 1 }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.product }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.agent }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.tkt_number }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.svc_incl) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.fare_incl) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.payment) }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.name }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.client }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.date }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.fop }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.vendor }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.inv_code }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.destination }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.departure_date }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.arrival_date }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.staying_nights }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.comment }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.parent_destination }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.client_type }}</td>
                        <td class="border border-gray-300 px-2 py-2">{{ row.ticket_arrangement }}</td>
                    </tr>
                    <tr v-if="! rows.length">
                        <td colspan="22" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No data for this range.</td>
                    </tr>
                    <tr v-else-if="! filteredRows.length">
                        <td colspan="22" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No rows match “{{ search }}”.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </template>
</template>
