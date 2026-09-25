<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
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
//   { working_days: 22, customer_types: [{ id, name, factor }],
//     agents: [{ user: { id, name }, base_salary, persons: { typeId: n }, amounts, total_amount, … }] }
// Per agent (Agent, Super Agent and HR Agent roles only): persons on their invoices and
// credit notes per customer type × the type's factor = total amount.
// Weekend days are typed here and never saved: extra = total / 22 × days and
// bonus = total + extra are recalculated as you type (same formula as the API,
// which applies the days passed in `weekend_days` to the Excel download).
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
const weekendDays = reactive({});
const downloading = ref(false);

const factors = ref([]);
const factorDrafts = reactive({});
const savingFactors = ref(false);
const canEditFactors = computed(() => auth.can('bonusFactors.edit'));
const factorsChanged = computed(() => factors.value.some((f) => Number(factorDrafts[f.customer_type.id]) !== Number(f.factor)));

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// "5% pension, income tax 0% to 80 €, 4% to 250 €, 8% to 450 €, 10% above".
const payrollSummary = computed(() => {
    const payroll = data.value?.payroll;

    if (! payroll) {
        return '5% pension, income tax by band';
    }

    const percent = (rate) => `${Math.round(rate * 1000) / 10}%`;
    const bands = payroll.income_tax_bands
        .map(([upper, rate]) => (upper === null ? `${percent(rate)} above` : `${percent(rate)} to ${upper} €`))
        .join(', ');

    return `${percent(payroll.pension_rate)} pension, income tax ${bands}`;
});

// Kosovo gross that pays a net salary — the same calculation as the API's
// KosovoPayrollService::grossFromNet, with the rates it returns in `payroll`:
// pension off the gross, then income tax by band on gross − pension.
function grossFromNet(net, payroll) {
    if (! payroll || net <= 0) {
        return 0;
    }

    let lower = 0;
    let taxBelow = 0;
    let taxable = net;

    for (const [upper, rate] of payroll.income_tax_bands) {
        const netAtUpper = upper === null ? Infinity : upper - (taxBelow + rate * (upper - lower));

        if (net <= netAtUpper) {
            taxable = (net + taxBelow - rate * lower) / (1 - rate);
            break;
        }

        taxBelow += rate * (upper - lower);
        lower = upper;
    }

    return round(taxable / (1 - payroll.pension_rate));
}

function days(userId) {
    const value = Number(weekendDays[userId] ?? 0);

    return Number.isFinite(value) && value > 0 ? value : 0;
}

const rows = computed(() => (data.value?.agents ?? []).map((agent) => {
    const extra = round(agent.total_amount / (data.value.working_days || 22) * days(agent.user.id));
    const bonus = round(agent.total_amount + extra);
    // Base salary and bonus are both net; without a base salary only the bonus is paid.
    const net = round(Number(agent.base_salary ?? 0) + bonus);

    return {
        ...agent,
        extra_amount: extra,
        bonus,
        net_salary: net,
        gross_salary: grossFromNet(net, data.value.payroll),
    };
}));

const totals = computed(() => {
    const types = data.value?.customer_types ?? [];

    return {
        base_salary: round(rows.value.reduce((sum, row) => sum + (Number(row.base_salary) || 0), 0)),
        persons: Object.fromEntries(types.map((type) => [type.id, rows.value.reduce((sum, row) => sum + (row.persons[type.id] ?? 0), 0)])),
        total_amount: round(rows.value.reduce((sum, row) => sum + row.total_amount, 0)),
        weekend_days: rows.value.reduce((sum, row) => sum + days(row.user.id), 0),
        extra_amount: round(rows.value.reduce((sum, row) => sum + row.extra_amount, 0)),
        bonus: round(rows.value.reduce((sum, row) => sum + row.bonus, 0)),
        net_salary: round(rows.value.reduce((sum, row) => sum + row.net_salary, 0)),
        gross_salary: round(rows.value.reduce((sum, row) => sum + row.gross_salary, 0)),
    };
});

function calculate() {
    load({ date_from: dateFrom.value || undefined, date_to: dateTo.value || undefined });
}

function weekendParams() {
    return Object.fromEntries(
        Object.entries(weekendDays)
            .filter(([, value]) => Number(value) > 0)
            .map(([userId, value]) => [`weekend_days[${userId}]`, value]),
    );
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;

    try {
        await downloadFile('/users/bonuses/excel', {
            fallbackName: 'bonuses.xlsx',
            config: { params: { date_from: dateFrom.value, date_to: dateTo.value, ...weekendParams() } },
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
                        Agents, Super Agents and HR Agents: persons on their invoices and credit notes dated in the period, per customer type, × the type's factor. Ghost documents and ignored persons are not counted.
                        Weekend days add total / {{ data?.working_days ?? 22 }} × days.
                        Net salary = base salary + bonus (both net; the bonus alone when no base salary is set); gross salary is the Kosovo gross that pays it, as the Tax Administration's calculator
                        ({{ payrollSummary }}).
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
                                <th class="border border-gray-300 px-2 py-2">Agent</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Base salary</th>
                                <th v-for="type in data.customer_types" :key="type.id" class="border border-gray-300 px-2 py-2 text-right" style="width: 100px;">
                                    {{ type.name }}
                                    <span class="block normal-case text-gray-400">× {{ money(type.factor) }}</span>
                                </th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Total amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Weekend days</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Extra amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Bonus</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Net salary</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Gross salary</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="rows.length === 0">
                                <td :colspan="data.customer_types.length + 8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No invoiced persons in this period.</td>
                            </tr>
                            <tr v-for="row in rows" :key="row.user.id ?? 'unknown'" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-1.5 font-medium">{{ row.user.name }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                    <span v-if="row.base_salary !== null">{{ money(row.base_salary) }}</span>
                                    <span v-else class="text-gray-400" title="Not set on the user — net salary is the bonus only">—</span>
                                </td>
                                <td v-for="type in data.customer_types" :key="type.id" class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ row.persons[type.id] ?? 0 }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.total_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-1 text-center">
                                    <input
                                        v-model="weekendDays[row.user.id]"
                                        type="number"
                                        min="0"
                                        max="31"
                                        step="1"
                                        placeholder="0"
                                        :aria-label="`Weekend days worked by ${row.user.name}`"
                                        class="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    >
                                </td>
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
                                <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ totals.weekend_days }}</td>
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
