<script setup>
import { computed, onMounted, ref } from 'vue';
import { money } from '../../../helpers/money.js';
import { payrollSummary, taxationLabels } from '../../../helpers/payroll.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import BonusBreakdown from '../../../components/BonusBreakdown.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';

// GET /users/bonuses?date_from=d.m.Y&date_to=d.m.Y
//   { working_days: 22, categories: [{ key, label, rate }], payroll: { rates },
//     employees: [{ employee: { id, name }, user, base_salary, persons: { key: n }, amounts: { key: € },
//                   total_amount, vacation_days, extra_amount, bonus, net_salary, gross_salary, … }], totals }
// Every employee whose contract in the period is "with bonuses": each person on their
// user's invoices earns the rate of its category (BILETË by customer type, ARANZHMAN by
// parent destination — the rates are set in the API's users.bonuses config).
// Paid vacation days add total / 22 × days. Click a bonus to see it per category.
const notifications = useNotificationsStore();
const { loading, error, errors, data, load } = useReport('/users/bonuses');

// Default period: the previous calendar month.
const pad = (n) => String(n).padStart(2, '0');
const today = new Date();
const firstOfPrevious = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const lastOfPrevious = new Date(today.getFullYear(), today.getMonth(), 0);
const format = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;

const dateFrom = ref(format(firstOfPrevious));
const dateTo = ref(format(lastOfPrevious));
const downloading = ref(false);
const breakdown = ref(null);

const rows = computed(() => data.value?.employees ?? []);
const totals = computed(() => data.value?.totals ?? {});
const summary = computed(() => payrollSummary(data.value?.payroll));
const ratedCategories = computed(() => (data.value?.categories ?? []).filter((category) => category.key !== 'not_rated'));

function calculate() {
    load({ date_from: dateFrom.value || undefined, date_to: dateTo.value || undefined });
}

function showBreakdown(row, title) {
    breakdown.value = { row, title, subtitle: `${data.value.date_from} – ${data.value.date_to}` };
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;

    try {
        await downloadFile('/users/bonuses/excel', {
            fallbackName: 'bonuses.xlsx',
            config: { params: { date_from: dateFrom.value, date_to: dateTo.value } },
        });
    } catch (e) {
        notifications.push({ type: 'error', message: e.response?.data?.message ?? 'Could not export the bonuses.' });
    } finally {
        downloading.value = false;
    }
}

onMounted(calculate);
</script>

<template>
    <AppLayout title="Employee Bonus Calculation" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Employee Bonus Calculation</h1>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FullWidthBox title="Period" :collapsible="false">
                    <div class="flex flex-wrap items-start gap-4">
                        <DateInput v-model="dateFrom" label="From" :error="errors.date_from" />
                        <DateInput v-model="dateTo" label="To" :error="errors.date_to" />

                        <div class="flex items-end gap-3 self-stretch pt-6">
                            <Button type="button" variant="primary" :loading="loading" @click="calculate">Calculate</Button>
                            <Button type="button" :loading="downloading" :disabled="! data" @click="downloadExcel">
                                {{ downloading ? 'Preparing…' : 'Download Excel' }}
                            </Button>
                        </div>
                    </div>
                    <p class="mt-3 text-xs text-gray-500">
                        Employees whose contract in the period is with bonuses: every person on their user's invoices dated in the period earns the rate of its category.
                        Ghost invoices, ignored persons and credit notes don't count. Approved paid vacation days add total / {{ data?.working_days ?? 22 }} × days.
                        Net salary = the contract's base salary + bonus (both net); gross salary is the Kosovo gross that pays it ({{ summary }}).
                    </p>
                </FullWidthBox>

                <FullWidthBox title="Rates per person" :collapsible="false">
                    <table v-if="ratedCategories.length" class="w-full border-collapse text-sm">
                        <tbody>
                            <tr v-for="category in ratedCategories" :key="category.key" class="odd:bg-gray-50">
                                <td class="border border-gray-200 px-3 py-1.5 text-gray-700">{{ category.label }}</td>
                                <td class="border border-gray-200 px-3 py-1.5 text-right font-medium tabular-nums">{{ money(category.rate) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <Loader v-else-if="loading" />
                    <p class="mt-2 text-xs text-gray-500">BILETË = invoices without a hotel order (by customer type); ARANZHMAN = invoices with a hotel order (by parent destination).</p>
                </FullWidthBox>
            </div>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else title="Bonuses" :collapsible="false">
                <Loader v-if="loading || ! data" />

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Employee</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Base salary</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Bonus amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Vacation days</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Extra amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Bonus</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Net salary</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Gross salary</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="rows.length === 0">
                                <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No employee has a contract with bonuses in this period.</td>
                            </tr>
                            <tr v-for="row in rows" :key="row.employee.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-1.5 font-medium">
                                    {{ row.employee.name }}
                                    <span v-if="! row.user" class="block text-xs font-normal text-amber-600">Not linked to a user</span>
                                    <span v-for="label in taxationLabels(row)" :key="label" class="mr-1 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">{{ label }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.base_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                    <button type="button" class="text-blue-600 hover:underline" :title="`${row.employee.name}: bonus per category`" @click="showBreakdown(row, row.employee.name)">
                                        {{ money(row.total_amount) }}
                                    </button>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{{ row.vacation_days || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.extra_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                    <button type="button" class="font-semibold text-blue-600 hover:underline" :title="`${row.employee.name}: bonus per category`" @click="showBreakdown(row, row.employee.name)">
                                        {{ money(row.bonus) }}
                                    </button>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right font-semibold tabular-nums">{{ money(row.net_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.gross_salary) }}</td>
                            </tr>
                        </tbody>
                        <tfoot v-if="rows.length">
                            <tr class="bg-gray-50 font-semibold">
                                <td class="border border-gray-300 px-2 py-2">Total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.base_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                    <button type="button" class="text-blue-600 hover:underline" @click="showBreakdown(totals, 'All employees')">{{ money(totals.total_amount) }}</button>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ totals.vacation_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.extra_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                    <button type="button" class="text-blue-600 hover:underline" @click="showBreakdown(totals, 'All employees')">{{ money(totals.bonus) }}</button>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.net_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.gross_salary) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </FullWidthBox>
        </div>

        <BonusBreakdown
            :show="Boolean(breakdown)"
            :title="breakdown ? `Bonus — ${breakdown.title}` : ''"
            :subtitle="breakdown?.subtitle ?? ''"
            :row="breakdown?.row ?? null"
            :categories="data?.categories ?? []"
            :working-days="data?.working_days ?? 22"
            @close="breakdown = null"
        />
    </AppLayout>
</template>
