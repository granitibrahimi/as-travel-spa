<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { payrollSummary } from '../../../helpers/payroll.js';
import { castResource } from '../../../types/responses.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';

// GET /users/bonuses?date_from=d.m.Y&date_to=d.m.Y
//   { working_days: 22, customer_types: [{ id, name, factor }], payroll: { rates },
//     employees: [{ employee: { id, name }, user, base_salary, persons: { typeId: n }, amounts, total_amount, … }] }
// Every employee whose contract in the period is "with bonuses": persons on their
// user's invoices and credit notes per customer type × the type's factor = total amount.
// Vacation days are the approved paid vacation days in the period (from the
// vacation requests): extra = total / 22 × days, bonus = total + extra.
// GET/PUT /users/bonus-factors[/:customerType] — the factor per customer type.
const auth = useAuthStore();
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

const factors = ref([]);
const factorDrafts = reactive({});
const savingFactors = ref(false);
const canEditFactors = computed(() => auth.can('bonusFactors.edit'));
const factorsChanged = computed(() => factors.value.some((f) => Number(factorDrafts[f.customer_type.id]) !== Number(f.factor)));

const summary = computed(() => payrollSummary(data.value?.payroll));

const rows = computed(() => data.value?.employees ?? []);
const totals = computed(() => data.value?.totals ?? {});

function calculate() {
    load({ date_from: dateFrom.value || undefined, date_to: dateTo.value || undefined });
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

async function fetchFactors() {
    const { data: body } = await api.get('/users/bonus-factors');
    factors.value = castResource(body).factors;

    for (const factor of factors.value) {
        factorDrafts[factor.customer_type.id] = factor.factor;
    }
}

async function saveFactors() {
    if (savingFactors.value) {
        return;
    }

    savingFactors.value = true;

    try {
        for (const factor of factors.value) {
            const value = Number(factorDrafts[factor.customer_type.id]);

            if (value !== Number(factor.factor)) {
                await api.put(`/users/bonus-factors/${factor.customer_type.id}`, { factor: value });
            }
        }

        notifications.push({ type: 'success', message: 'Bonus factors saved.' });
        await fetchFactors();

        if (data.value) {
            calculate();
        }
    } catch (e) {
        notifications.push({ type: 'error', message: e.response?.data?.message ?? 'Could not save the bonus factors.' });
    } finally {
        savingFactors.value = false;
    }
}

onMounted(() => {
    fetchFactors();
    calculate();
});
</script>

<template>
    <AppLayout title="Employee Bonus Calculation" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Employee Bonus Calculation</h1>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <FullWidthBox title="Period" :collapsible="false" class="lg:col-span-2">
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
                        Employees whose contract in the period is with bonuses: persons on their user's invoices and credit notes dated in the period, per customer type, × the type's factor. Ghost documents and ignored persons are not counted.
                        Approved paid vacation days in the period add total / {{ data?.working_days ?? 22 }} × days.
                        Net salary = the contract's base salary + bonus (both net); gross salary is the Kosovo gross that pays it, as the Tax Administration's calculator
                        ({{ summary }}).
                    </p>
                </FullWidthBox>

                <FullWidthBox title="Factor per customer type" :collapsible="false">
                    <div class="space-y-2">
                        <div v-for="factor in factors" :key="factor.customer_type.id" class="flex items-center justify-between gap-3">
                            <label :for="`factor-${factor.customer_type.id}`" class="text-sm text-gray-700">{{ factor.customer_type.name }}</label>
                            <input
                                :id="`factor-${factor.customer_type.id}`"
                                v-model="factorDrafts[factor.customer_type.id]"
                                type="number"
                                min="0"
                                step="0.01"
                                :disabled="! canEditFactors"
                                class="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-gray-50"
                            >
                        </div>
                        <div v-if="canEditFactors" class="pt-2 text-right">
                            <Button type="button" size="sm" variant="primary" :loading="savingFactors" :disabled="! factorsChanged" @click="saveFactors">Save factors</Button>
                        </div>
                    </div>
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
                                <th v-for="type in data.customer_types" :key="type.id" class="border border-gray-300 px-2 py-2 text-right" style="width: 100px;">
                                    {{ type.name }}
                                    <span class="block normal-case text-gray-400">× {{ money(type.factor) }}</span>
                                </th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Total amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Vacation days</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Extra amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Bonus</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Net salary</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Gross salary</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="rows.length === 0">
                                <td :colspan="data.customer_types.length + 8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No employee has a contract with bonuses in this period.</td>
                            </tr>
                            <tr v-for="row in rows" :key="row.employee.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-1.5 font-medium">
                                    {{ row.employee.name }}
                                    <span v-if="! row.user" class="block text-xs font-normal text-amber-600">Not linked to a user</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.base_salary) }}</td>
                                <td v-for="type in data.customer_types" :key="type.id" class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ row.persons[type.id] ?? 0 }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.total_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{{ row.vacation_days || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.extra_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.bonus) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right font-semibold tabular-nums">{{ money(row.net_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.gross_salary) }}</td>
                            </tr>
                        </tbody>
                        <tfoot v-if="rows.length">
                            <tr class="bg-gray-50 font-semibold">
                                <td class="border border-gray-300 px-2 py-2">Total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.base_salary) }}</td>
                                <td v-for="type in data.customer_types" :key="type.id" class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ totals.persons[type.id] }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.total_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ totals.vacation_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.extra_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.bonus) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.net_salary) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.gross_salary) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
