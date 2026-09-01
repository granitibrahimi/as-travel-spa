<script setup>
import { RouterLink } from 'vue-router';
import { money } from '../helpers/money.js';
import { supplierTransactionPathById } from '../helpers/supplierTransactions.js';

/**
 * Renders a supplier record's "linked transactions" table — shared by Bills,
 * Credit Notes, Payments and Reconciliations, wherever a `supplier_transaction
 * _links_new` row is shown. Every row already has the shape the backend's
 * SupplierTransactionLinkResource produces: `{ id, type: {id, name},
 * transaction_id, reference, amount, date }`, always describing the *other*
 * side of the link relative to whichever record's show page this is — a
 * bill/credit-note page gets the payment/reconciliation it was settled by, a
 * payment/reconciliation page gets the bill/credit-note/etc it settled — so
 * this component itself never needs to know which side it's looking at.
 */
defineProps({
    links: { type: Array, default: () => [] },
    // Footer total — callers compute it themselves since its meaning differs
    // (a payment's remaining unlinked balance vs. a bill's linked-so-far sum).
    total: { type: Number, default: null },
    totalLabel: { type: String, default: 'Total' },
    emptyText: { type: String, default: 'No linked transactions.' },
});
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300 text-sm">
            <thead>
                <tr class="border-b text-left text-gray-500">
                    <th class="border border-gray-300 px-2 py-2">ID</th>
                    <th class="border border-gray-300 px-2 py-2">Type</th>
                    <th class="border border-gray-300 px-2 py-2">Reference</th>
                    <th class="border border-gray-300 px-2 py-2">Date</th>
                    <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="link in links" :key="link.id" class="border-b last:border-0 hover:bg-gray-50">
                    <td class="border border-gray-300 px-2 py-2">{{ link.id }}</td>
                    <td class="border border-gray-300 px-2 py-2">{{ link.type?.name }}</td>
                    <td class="border border-gray-300 px-2 py-2">
                        <RouterLink
                            v-if="supplierTransactionPathById(link.type?.id, link.transaction_id)"
                            :to="supplierTransactionPathById(link.type?.id, link.transaction_id)"
                            class="text-red-600 hover:underline"
                        >{{ link.reference ?? link.transaction_id }}</RouterLink>
                        <span v-else>{{ link.reference ?? link.transaction_id }}</span>
                    </td>
                    <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ link.date ?? '—' }}</td>
                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                </tr>

                <tr v-if="links.length && total !== null" class="border-b last:border-0 bg-gray-50 font-semibold">
                    <th class="border border-gray-300 px-2 py-2 text-right" colspan="4">{{ totalLabel }}</th>
                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(total) }}</td>
                </tr>

                <tr v-if="links.length === 0">
                    <td colspan="5" class="border border-gray-300 px-2 py-6 text-center text-gray-500">{{ emptyText }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
