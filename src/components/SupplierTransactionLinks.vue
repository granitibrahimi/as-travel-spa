<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../helpers/money.js';
import { supplierTransactionPathById } from '../helpers/supplierTransactions.js';
import { routeUrl } from '../helpers/route.js';

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
 *
 * Stays presentational: when a row carries `can_unlink` an unlink button is
 * shown and a click emits `unlink` with that row — the parent owns the
 * confirm/delete/reload. Payloads without `can_unlink` (Bills, Credit Notes,
 * Reconciliations) render exactly as before, with no extra column.
 */
const props = defineProps({
    links: { type: Array, default: () => [] },
    // Footer total — callers compute it themselves since its meaning differs
    // (a payment's remaining unlinked balance vs. a bill's linked-so-far sum).
    total: { type: Number, default: null },
    totalLabel: { type: String, default: 'Total' },
    emptyText: { type: String, default: 'No linked transactions.' },
    // Opt-in "Supplier" column, shown where rows span multiple suppliers (the
    // Journal show page). Each row must then carry `party: { id, name }`.
    // Redundant on a single supplier's own show page, so off by default.
    showParty: { type: Boolean, default: false },
});

const emit = defineEmits(['unlink']);

const hasUnlink = computed(() => props.links.some((l) => l.can_unlink));

// Columns left of "Amount" (ID, Type, [Supplier], Reference, Date) — drives the
// footer total's label colspan; the empty-state cell spans one more (Amount)
// plus the unlink column when present.
const leadingCols = computed(() => 4 + (props.showParty ? 1 : 0));
const spanAllCols = computed(() => leadingCols.value + 1 + (hasUnlink.value ? 1 : 0));
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300 text-sm">
            <thead>
                <tr class="border-b text-left text-gray-500">
                    <th class="border border-gray-300 px-2 py-2">ID</th>
                    <th class="border border-gray-300 px-2 py-2">Type</th>
                    <th v-if="showParty" class="border border-gray-300 px-2 py-2">Supplier</th>
                    <th class="border border-gray-300 px-2 py-2">Reference</th>
                    <th class="border border-gray-300 px-2 py-2">Date</th>
                    <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                    <th v-if="hasUnlink" class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;"></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="link in links" :key="link.id" class="border-b last:border-0 hover:bg-gray-50">
                    <td class="border border-gray-300 px-2 py-2">{{ link.id }}</td>
                    <td class="border border-gray-300 px-2 py-2">{{ link.type?.name }}</td>
                    <td v-if="showParty" class="border border-gray-300 px-2 py-2">
                        <RouterLink
                            v-if="link.party?.id"
                            :to="routeUrl('suppliers.show', link.party.id)"
                            class="text-red-600 hover:underline"
                        >{{ link.party.name }}</RouterLink>
                        <span v-else>{{ link.party?.name ?? '—' }}</span>
                    </td>
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
                    <td v-if="hasUnlink" class="border border-gray-300 px-2 py-2 text-center">
                        <button
                            v-if="link.can_unlink"
                            type="button"
                            aria-label="Unlink"
                            class="inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-50"
                            @click="emit('unlink', link)"
                        >
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.364l3.129-3.129m5.614-5.614l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-3.129 3.13m-4.54 4.538L3 3m0 0l18 18" />
                            </svg>
                        </button>
                    </td>
                </tr>

                <tr v-if="links.length && total !== null" class="border-b last:border-0 bg-gray-50 font-semibold">
                    <th class="border border-gray-300 px-2 py-2 text-right" :colspan="leadingCols">{{ totalLabel }}</th>
                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(total) }}</td>
                    <td v-if="hasUnlink" class="border border-gray-300 px-2 py-2"></td>
                </tr>

                <tr v-if="links.length === 0">
                    <td :colspan="spanAllCols" class="border border-gray-300 px-2 py-6 text-center text-gray-500">{{ emptyText }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
