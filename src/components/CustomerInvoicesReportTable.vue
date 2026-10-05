<script setup>
import { money } from '../helpers/money.js';

// The customer invoices report's table: one row per invoice order-person, as
// GET /customers/invoices/report returns `items` (and the customer analytical
// breakdown returns each invoice's `details`). The `empty` slot renders inside
// the body when `rows` is empty, given the column count.
defineProps({
    rows: { type: Array, default: () => [] },
});

const columns = 22;
</script>

<template>
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
            <tr v-for="(row, i) in rows" :key="row.nr ?? i" class="whitespace-nowrap hover:bg-gray-50">
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
            <slot v-if="! rows.length" name="empty" :columns="columns" />
        </tbody>
    </table>
</template>
