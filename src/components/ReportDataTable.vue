<script setup>
import { money } from '../helpers/money.js';

// Renders a self-describing report table as returned by the finance report
// endpoints (Accounts Receivable / Accounts Payable):
//   columns: [{ key, label, type: 'text' | 'date' | 'number' | 'money' }]
//   rows:    [{ <key>: value, … }]
//   footer:  { <key>: value, … }   — the grand-total row (optional)
// Cell formatting is driven entirely by each column's `type`, so the same
// component covers every grouping (flat list, one row per party, year matrix).
// For a report whose columns aren't described by the server, use the simpler
// key-deriving ReportTable instead.
defineProps({
    columns: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    footer: { type: Object, default: null },
    emptyText: { type: String, default: 'No data.' },
});

const RIGHT_ALIGNED = new Set(['money', 'number']);

function display(value, type) {
    if (value === '') {
        return '';
    }

    if (value === null || value === undefined) {
        return RIGHT_ALIGNED.has(type) ? '' : '—';
    }

    return type === 'money' ? money(value) : value;
}
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300 text-sm">
            <thead>
                <tr class="text-left text-xs uppercase text-gray-500">
                    <th
                        v-for="col in columns"
                        :key="col.key"
                        class="border border-gray-300 px-2 py-2"
                        :class="RIGHT_ALIGNED.has(col.type) ? 'text-right' : ''"
                    >{{ col.label }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, i) in rows" :key="i" class="hover:bg-gray-50">
                    <td
                        v-for="col in columns"
                        :key="col.key"
                        class="border border-gray-300 px-2 py-2"
                        :class="[
                            RIGHT_ALIGNED.has(col.type) ? 'text-right tabular-nums' : '',
                            col.type === 'date' ? 'whitespace-nowrap' : '',
                        ]"
                    >{{ display(row[col.key], col.type) }}</td>
                </tr>
                <tr v-if="rows.length === 0">
                    <td :colspan="columns.length || 1" class="border border-gray-300 px-2 py-4 text-center text-gray-400">
                        {{ emptyText }}
                    </td>
                </tr>
            </tbody>
            <tfoot v-if="footer && rows.length > 0">
                <tr class="bg-gray-100 font-semibold">
                    <td
                        v-for="col in columns"
                        :key="col.key"
                        class="border border-gray-300 px-2 py-2"
                        :class="RIGHT_ALIGNED.has(col.type) ? 'text-right tabular-nums' : ''"
                    >{{ display(footer[col.key], col.type) }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</template>
