<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../helpers/money.js';
import { useAuthStore } from '../stores/auth';
import SideOverlay from './SideOverlay.vue';

/**
 * What a bonus is made of, per bonus category: persons × rate = earnings,
 * then the total, the paid-vacation extra and the bonus. `row` is an employee
 * row (or the totals) of the Employee Bonus Calculation / payroll — it reads
 * `persons` and `amounts` keyed by category key, `total_amount`,
 * `vacation_days`, `extra_amount` and `bonus`.
 *
 * With the period and the agents' user ids, each person count links to the
 * Customer Invoices Report (new tab) listing exactly those persons: the
 * agents, the period and the bonus category (plus its type, customer types
 * and parent destinations as editable filters).
 */
const props = defineProps({
    show: { type: Boolean, required: true },
    title: { type: String, default: 'Bonus' },
    subtitle: { type: String, default: '' },
    row: { type: Object, default: null },
    // [{ key, label, rate }] as the API returns them.
    categories: { type: Array, default: () => [] },
    workingDays: { type: Number, default: 22 },
    // Period (d.m.Y) and user ids of the agents behind `row`, for the links.
    dateFrom: { type: String, default: '' },
    dateTo: { type: String, default: '' },
    userIds: { type: Array, default: () => [] },
});

defineEmits(['close']);

const auth = useAuthStore();

const canLink = computed(() => auth.can('customerInvoices.reports') && props.dateFrom && props.dateTo && props.userIds.length > 0);

// The report's query for one category's persons, or all of them (no category).
function reportLink(category = null) {
    return {
        name: 'financeReports.customerInvoices',
        query: {
            from: props.dateFrom,
            to: props.dateTo,
            agents: props.userIds,
            bonus_only: 1,
            ...(category ? {
                bonus_category: category.key,
                bonus_label: category.label,
                ticket_arrangement: category.invoice_type || undefined,
                customer_types: category.customer_types?.length ? category.customer_types : undefined,
                parent_destinations: category.parent_destinations?.length ? category.parent_destinations : undefined,
            } : {}),
        },
    };
}

// Every rated category (zeros greyed out); "not rated" only when it has persons.
const lines = computed(() => props.categories
    .map((category) => ({
        ...category,
        persons: props.row?.persons?.[category.key] ?? 0,
        amount: props.row?.amounts?.[category.key] ?? 0,
    }))
    .filter((line) => line.key !== 'not_rated' || line.persons > 0));

const persons = computed(() => lines.value.reduce((sum, line) => sum + line.persons, 0));
</script>

<template>
    <SideOverlay :show="show" :title="title" :subtitle="subtitle" @close="$emit('close')">
        <div v-if="row" class="space-y-4">
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                    <tr class="text-left text-xs uppercase text-gray-500">
                        <th class="border border-gray-300 px-2 py-2">Category</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Rate</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Persons</th>
                        <th class="border border-gray-300 px-2 py-2 text-right">Earnings</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="line in lines" :key="line.key" :class="line.persons ? '' : 'text-gray-400'">
                        <td class="border border-gray-300 px-2 py-1.5">{{ line.label }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(line.rate) }}</td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                            <RouterLink
                                v-if="canLink && line.persons"
                                :to="reportLink(line)"
                                target="_blank"
                                class="text-blue-600 hover:underline"
                                :title="`List the ${line.persons} persons in the Customer Invoices Report`"
                            >{{ line.persons }}</RouterLink>
                            <template v-else>{{ line.persons }}</template>
                        </td>
                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums" :class="line.persons ? 'font-medium' : ''">{{ money(line.amount) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="bg-gray-50 font-semibold">
                        <td class="border border-gray-300 px-2 py-2" colspan="2">Total</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                            <RouterLink
                                v-if="canLink && persons"
                                :to="reportLink()"
                                target="_blank"
                                class="text-blue-600 hover:underline"
                                :title="`List all ${persons} persons in the Customer Invoices Report`"
                            >{{ persons }}</RouterLink>
                            <template v-else>{{ persons }}</template>
                        </td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.total_amount) }}</td>
                    </tr>
                    <tr>
                        <td class="border border-gray-300 px-2 py-2" colspan="3">
                            Vacation extra
                            <span class="block text-xs text-gray-500">{{ money(row.total_amount) }} / {{ workingDays }} × {{ row.vacation_days || 0 }} paid vacation days</span>
                        </td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.extra_amount) }}</td>
                    </tr>
                    <tr class="bg-gray-50 text-base font-bold">
                        <td class="border border-gray-300 px-2 py-2" colspan="3">Bonus</td>
                        <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.bonus) }}</td>
                    </tr>
                </tfoot>
            </table>

            <p class="text-xs text-gray-500">
                Every counted person on the agent's invoices in the period earns the rate of its category: BILETË invoices by the customer's type,
                ARANZHMAN invoices (with a hotel or package order) by the invoice's parent destination. An invoice's persons (editable on the invoice) are its ticket travellers
                (or its hotel persons when it has no ticket), each name once, with SVC above 0 and not ignored. TJERA invoices, ghost invoices and credit notes don't count.
                <template v-if="canLink">Click a person count to list those persons in the Customer Invoices Report.</template>
            </p>
        </div>
    </SideOverlay>
</template>
