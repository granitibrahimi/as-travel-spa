<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../helpers/money.js';
import { routeUrl } from '../helpers/route.js';

// Renders a trial balance — the live report (GET /finance/reports/trial-balance)
// or a closed fiscal year's stored one (GET /finance/fiscal-years/:year/trial-balance);
// both return the same shape:
//   { source: 'ledger' | 'stored', date_from, date_to, compare_date,
//     accounts: [{ account_id, number, path, classification: { name },
//       opening_balance, debit, credit, closing_debit, closing_credit,
//       compare_closing_balance? }],
//     totals: { opening_balance, debit, credit, closing_debit, closing_credit, compare_closing_balance? },
//     balanced, difference }
// The synthetic "prior years' profit" row has account_id null.
const props = defineProps({
    report: { type: Object, required: true },
});

const comparing = computed(() => Boolean(props.report.compare_date));
const columns = computed(() => (comparing.value ? 9 : 8));
</script>

<template>
    <div>
        <div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span class="font-medium text-gray-700">{{ report.date_from }} – {{ report.date_to }}</span>
            <span v-if="comparing" class="text-gray-500">vs {{ report.compare_date }}</span>
            <span
                class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="report.balanced ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'"
            >
                {{ report.balanced ? 'Balanced' : `Out of balance by ${money(report.difference)}` }}
            </span>
            <span
                class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="report.source === 'stored' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
            >
                {{ report.source === 'stored' ? 'Stored at year closing' : 'Live from the ledger — not saved' }}
            </span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                    <tr class="text-left text-xs uppercase text-gray-500">
                        <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Account</th>
                        <th class="border border-gray-300 px-2 py-2">Name</th>
                        <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Classification</th>
                        <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Opening {{ report.date_from }}</th>
                        <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Debit</th>
                        <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Credit</th>
                        <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Closing debit</th>
                        <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Closing credit</th>
                        <th v-if="comparing" class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Balance {{ report.compare_date }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="report.accounts.length === 0">
                        <td :colspan="columns" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No postings in this period.</td>
                    </tr>
                    <tr v-for="account in report.accounts" :key="account.account_id ?? account.key" class="hover:bg-gray-50">
                        <td class="border border-gray-300 px-2 py-1.5 font-mono text-xs">{{ account.number }}</td>
                        <td class="border border-gray-300 px-2 py-1.5">
                            <RouterLink
                                v-if="account.account_id"
                                :to="routeUrl('accounts.history', account.account_id)"
                                class="hover:text-red-700 hover:underline"
                            >{{ account.path }}</RouterLink>
                            <span v-else class="italic text-gray-600">{{ account.path }}</span>
                        </td>
                        <td class="border border-gray-300 px-2 py-1.5 text-gray-600">{{ account.classification?.name }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(account.opening_balance) }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(account.debit) }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(account.credit) }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ account.closing_debit ? money(account.closing_debit) : '' }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ account.closing_credit ? money(account.closing_credit) : '' }}</td>
                        <td v-if="comparing" class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(account.compare_closing_balance) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="bg-gray-50 font-semibold">
                        <td class="border border-gray-300 px-2 py-2" colspan="3">Total</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.opening_balance) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.debit) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.credit) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.closing_debit) }}</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.closing_credit) }}</td>
                        <td v-if="comparing" class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(report.totals.compare_closing_balance) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>
