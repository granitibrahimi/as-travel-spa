<script setup>
import { computed } from 'vue';
import { money } from '../helpers/money.js';

// The customer invoices report's table: one row per invoice order-person, as
// GET /customers/invoices/report returns `items` (and the customer analytical
// breakdown returns each invoice's `details`). `hide` drops columns by key
// (the breakdown's customer view). The `empty` slot renders inside the body
// when `rows` is empty, given the column count.
const props = defineProps({
    rows: { type: Array, default: () => [] },
    hide: { type: Array, default: () => [] },
});

const COLUMNS = [
    { key: 'nr', label: 'NR', class: 'text-center' },
    { key: 'product', label: 'Product' },
    { key: 'agent', label: 'Agent' },
    { key: 'tkt_number', label: 'TKT NR' },
    { key: 'amount', label: 'Amount', money: true },
    { key: 'svc_incl', label: 'SVC incl', money: true },
    { key: 'fare_incl', label: 'Fare incl', money: true },
    { key: 'payment', label: 'Payment', money: true },
    { key: 'name', label: 'Name' },
    { key: 'client', label: 'Client' },
    { key: 'date', label: 'Date' },
    { key: 'fop', label: 'FOP' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'inv_code', label: 'INV CODE' },
    { key: 'destination', label: 'Destination' },
    { key: 'departure_date', label: 'Departure Date' },
    { key: 'arrival_date', label: 'Arrival Date' },
    { key: 'staying_nights', label: 'Staying nights', class: 'text-right tabular-nums' },
    { key: 'comment', label: 'Comment' },
    { key: 'parent_destination', label: 'Parent Destination' },
    { key: 'client_type', label: 'Client Type' },
    { key: 'ticket_arrangement', label: 'Ticket/Arrangement' },
].map((column) => (column.money ? { ...column, class: 'text-right tabular-nums' } : column));

const columns = computed(() => COLUMNS.filter((column) => ! props.hide.includes(column.key)));

function value(row, column, i) {
    if (column.key === 'nr') {
        return row.nr ?? i + 1;
    }

    return column.money ? money(row[column.key]) : row[column.key];
}
</script>

<template>
    <table class="w-full text-sm">
        <thead>
            <tr class="whitespace-nowrap text-left text-xs uppercase text-gray-500">
                <th
                    v-for="column in columns"
                    :key="column.key"
                    class="border border-gray-300 px-2 py-2"
                    :class="{ 'text-right': column.money || column.key === 'staying_nights' }"
                >
                    {{ column.label }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(row, i) in rows" :key="row.nr ?? i" class="whitespace-nowrap hover:bg-gray-50">
                <td v-for="column in columns" :key="column.key" class="border border-gray-300 px-2 py-2" :class="column.class">
                    {{ value(row, column, i) }}
                </td>
            </tr>
            <slot v-if="! rows.length" name="empty" :columns="columns.length" />
        </tbody>
    </table>
</template>
