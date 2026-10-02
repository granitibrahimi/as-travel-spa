<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { payrollSummary, taxationLabels } from '../../../helpers/payroll.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { downloadFile } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import BonusBreakdown from '../../../components/BonusBreakdown.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

// GET /users/payrolls/:year/:month — the month live or, once finalized, as
// stored (`source: 'stored'`). Vacation days are the approved paid vacation
// days in the month, counted by the API.
// POST …/:year/:month saves the draft; POST …/finalize, …/reopen and DELETE …
// change its state; GET …/excel and (finalized only) …/pcb-csv download it.
// A finalized month's journals (`saved.journals`): finalizing books the one
// obligation journal (reopening deletes it; POST …/obligation-journal rebooks
// it in place, or brings it back if it was deleted — the way to correct it
// once payment journals keep the month from being reopened); payment journals are made on the journal
// form (?payroll=<year>-<month>, pre-filled from `payment_journal`). Deleting
// a payment journal (DELETE /finance/journals/:id) marks its salaries unpaid;
// a month can only be reopened once it has none. A salary is paid once a payment journal covers it
// (`row.paid`, `row.payment_journal`) — chosen on the journal form.
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const year = Number(route.params.year);
const month = Number(route.params.month);
const base = `/users/payrolls/${year}/${month}`;

const data = ref(null);
const error = ref('');
const loading = ref(false);
const busy = ref('');
const confirming = ref(null);
const breakdown = ref(null);

const saved = computed(() => data.value?.saved ?? null);
const finalized = computed(() => saved.value?.status.id === 1);
const rows = computed(() => data.value?.employees ?? []);
const totals = computed(() => data.value?.totals ?? {});
const summary = computed(() => payrollSummary(data.value?.payroll));
// The PCB payment CSV leaves out employees without a bank account number.
const withoutBankAccount = computed(() => rows.value.filter((row) => ! String(row.bank_account_number ?? '').trim()));

async function load() {
    loading.value = true;
    error.value = '';

    try {
        data.value = castResource((await api.get(base)).data);
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not load the payroll.';
    } finally {
        loading.value = false;
    }
}

async function run(action, request, message) {
    if (busy.value) {
        return;
    }

    busy.value = action;

    try {
        await request();
        notifications.push({ type: 'success', message });
        confirming.value = null;
        await load();
    } catch (e) {
        const errors = e.response?.data?.errors;
        notifications.push({ type: 'error', message: (errors && Object.values(errors)[0]?.[0]) ?? e.response?.data?.message ?? 'Something went wrong.' });
        confirming.value = null;
    } finally {
        busy.value = '';
    }
}

const saveDraft = () => run('save', () => api.post(base), `Payroll for ${data.value.period} saved as a draft.`);
const finalize = () => run('finalize', () => api.post(`${base}/finalize`), `Payroll for ${data.value.period} finalized.`);
const reopen = () => run('reopen', () => api.post(`${base}/reopen`), `Payroll for ${data.value.period} reopened as a draft.`);
const deleteDraft = () => run('delete', () => api.delete(base), `Draft for ${data.value.period} deleted.`);
const createObligationJournal = () => run('journal', () => api.post(`${base}/obligation-journal`), `Obligation journal for ${data.value.period} booked.`);
const journals = computed(() => saved.value?.journals ?? []);
const hasObligationJournal = computed(() => journals.value.some((journal) => journal.type.id === 1));
const paymentToDelete = ref(null);
const deletePaymentJournal = () => run('deletePayment', () => api.delete(`/finance/journals/${paymentToDelete.value.id}`), `Payment journal ${paymentToDelete.value.gen_id} deleted.`);

function askDeletePayment(journal) {
    paymentToDelete.value = journal;
    confirming.value = 'deletePayment';
}
const canPostJournals = computed(() => auth.can('payrolls.finalize') && auth.can('journals.create'));
const unpaid = computed(() => rows.value.filter((row) => row.paid === false).length);

async function download(action, path, fallbackName) {
    if (busy.value) {
        return;
    }

    busy.value = action;

    try {
        await downloadFile(`${base}/${path}`, { fallbackName });
    } catch (e) {
        notifications.push({ type: 'error', message: e.response?.data?.message ?? 'Could not download the file.' });
    } finally {
        busy.value = '';
    }
}

const dialogs = {
    finalize: { title: 'Finalize payroll?', message: () => `${data.value.period} becomes read-only: its figures no longer change with contracts, vacations or factors, and its obligation journal is booked. Only the last finalized month can be reopened.`, confirm: finalize },
    reopen: { title: 'Reopen payroll?', message: () => `${data.value.period} goes back to a draft and is recalculated from the current contracts, vacations and factors. Its obligation journal is deleted and booked again when it's finalized.`, confirm: reopen },
    journal: {
        get title() {
            return hasObligationJournal.value ? 'Rebook obligation journal?' : 'Create obligation journal?';
        },
        message: () => `${hasObligationJournal.value ? 'Replaces the lines of the obligation journal (it keeps its number) and b' : 'B'}ooks ${data.value.period} on its last day: debit gross salaries and the employer's pension contribution; credit pension contributions, tax on personal income and net salaries. The company's health insurance (in the gross) and the employees' (debited to net salaries) are credited to insurance expenses.`,
        confirm: createObligationJournal,
    },
    delete: { title: 'Delete draft?', message: () => `The saved draft for ${data.value.period} will be deleted.`, confirm: deleteDraft },
    deletePayment: { title: 'Delete payment journal?', message: () => `${paymentToDelete.value?.gen_id} will be permanently deleted and its salaries marked as not paid.`, confirm: deletePaymentJournal },
};

onMounted(() => {
    if (! Number.isInteger(year) || month < 1 || month > 12) {
        router.replace(routeUrl('payrolls.list'));

        return;
    }

    load();
});
</script>

<template>
    <AppLayout :title="data ? `Payroll ${data.period}` : 'Payroll'" fluid>
        <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <RouterLink :to="routeUrl('payrolls.list')" class="text-sm text-gray-500 hover:underline">← Payroll</RouterLink>
                    <h1 class="text-2xl font-bold">
                        Payroll {{ data?.period ?? '' }}
                        <span v-if="saved" class="ml-2 inline-block rounded px-2 py-0.5 align-middle text-xs font-medium" :class="saved.status.id === 1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'">{{ saved.status.name }}</span>
                        <span v-else-if="data" class="ml-2 inline-block rounded bg-gray-100 px-2 py-0.5 align-middle text-xs font-medium text-gray-600">Not saved</span>
                    </h1>
                    <p v-if="saved" class="text-xs text-gray-500">
                        Saved {{ saved.saved_at }}<span v-if="saved.saved_by"> by {{ saved.saved_by.name }}</span><template v-if="saved.finalized_at"> · finalized {{ saved.finalized_at }}<span v-if="saved.finalized_by"> by {{ saved.finalized_by.name }}</span></template>
                    </p>
                </div>

                <div v-if="data" class="flex flex-wrap gap-2">
                    <Button type="button" :loading="busy === 'excel'" @click="download('excel', 'excel', 'payroll.xlsx')">Download Excel</Button>
                    <Button v-if="finalized && auth.can('payrolls.paymentFile')" type="button" :loading="busy === 'pcb'" @click="download('pcb', 'pcb-csv', 'pagat_pcb.csv')">PCB Payment CSV</Button>
                    <Button v-if="saved?.can_delete && auth.can('payrolls.delete')" type="button" @click="confirming = 'delete'">Delete draft</Button>
                    <template v-if="finalized && auth.can('payrolls.reopen')">
                        <Button v-if="saved.can_reopen" type="button" @click="confirming = 'reopen'">Reopen</Button>
                        <!-- Disabled buttons swallow hover, so the reason sits on a wrapper. -->
                        <span v-else :title="saved.reopen_blocker"><Button type="button" disabled>Reopen</Button></span>
                    </template>
                    <Button v-if="! finalized && auth.can('payrolls.create')" type="button" :variant="saved ? 'secondary' : 'primary'" :loading="busy === 'save'" @click="saveDraft">
                        {{ saved ? 'Save draft again' : 'Save draft' }}
                    </Button>
                    <Button
                        v-if="saved?.can_finalize && auth.can('payrolls.finalize')"
                        type="button"
                        variant="primary"
                        @click="confirming = 'finalize'"
                    >
                        Finalize
                    </Button>
                </div>
            </div>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-if="! error && saved" title="Journals" :collapsible="false">
                <template v-if="canPostJournals && (saved.can_create_obligation_journal || saved.can_add_payment_journal)" #actions>
                    <div class="flex gap-2">
                        <Button v-if="saved.can_create_obligation_journal" type="button" size="sm" :loading="busy === 'journal'" @click="confirming = 'journal'">{{ hasObligationJournal ? 'Rebook Obligation Journal' : 'Create Obligation Journal' }}</Button>
                        <Button v-if="saved.can_add_payment_journal" size="sm" :href="routeUrl('journals.create', { payroll: `${year}-${month}` })" @click.prevent="router.push(routeUrl('journals.create', { payroll: `${year}-${month}` }))">Add Payment Journal</Button>
                    </div>
                </template>

                <p v-if="! journals.length" class="text-sm text-gray-500">No journals. The obligation journal is created when the payroll is finalized; then add a payment journal for each salary payment.</p>

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Journal</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                                <th v-if="auth.can('journals.delete')" class="border border-gray-300 px-2 py-2" style="width: 80px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="journal in journals" :key="journal.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-1.5">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="journal.type.id === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'">{{ journal.type.name }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5">
                                    <RouterLink :to="routeUrl('journals.show', journal.id)" class="font-medium text-blue-600 hover:underline">{{ journal.gen_id }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-1.5 tabular-nums">{{ journal.on_date }}</td>
                                <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(journal.amount) }}</td>
                                <td v-if="auth.can('journals.delete')" class="border border-gray-300 px-2 py-1.5 text-center">
                                    <button v-if="journal.type.id === 2" type="button" class="text-xs text-red-600 hover:underline" @click="askDeletePayment(journal)">Delete</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="! error" :title="data ? `${data.date_from} – ${data.date_to}` : 'Payroll'" :collapsible="false">
                <Loader v-if="loading || ! data" />

                <template v-else>
                    <p v-if="saved && ! finalized" class="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">A draft shows the figures as they are now; save it again after changing contracts, vacations or factors, then finalize (that books its obligation journal).</p>

                    <div v-if="withoutBankAccount.length" class="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {{ withoutBankAccount.length === 1 ? '1 employee has' : `${withoutBankAccount.length} employees have` }} no bank account number and will not be included in the PCB Payment CSV:
                        <span class="font-medium">{{ withoutBankAccount.map((row) => row.employee.name).join(', ') }}</span>.
                    </div>

                    <p v-if="finalized && unpaid" class="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {{ unpaid === 1 ? '1 salary is' : `${unpaid} salaries are` }} not paid yet — add a payment journal to pay them.
                    </p>

                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Employee</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Base salary</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Bonus amount</th>
                                    <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Vacation days</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Extra</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Bonus</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Net salary</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Employer pension</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Employee pension</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Income tax</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Gross salary</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;" title="Taken off the net salary">Health ins. employee</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;" title="Paid by the company on top">Health ins. company</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;" title="Net salary less the employee's health insurance">To pay</th>
                                    <th v-if="finalized" class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="rows.length === 0">
                                    <td :colspan="finalized ? 15 : 14" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No employee has a contract in this month.</td>
                                </tr>
                                <tr v-for="row in rows" :key="row.employee.id" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-1.5">
                                        <RouterLink v-if="auth.can('employees.show')" :to="routeUrl('employees.edit', row.employee.id)" class="font-medium hover:underline">{{ row.employee.name }}</RouterLink>
                                        <span v-else class="font-medium">{{ row.employee.name }}</span>
                                        <span class="block text-xs text-gray-500">
                                            {{ [row.bank, row.bank_account_number].filter(Boolean).join(' · ') || 'No bank details' }}
                                        </span>
                                        <span v-for="label in taxationLabels(row)" :key="label" class="mr-1 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">{{ label }}</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.base_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                        <button v-if="row.with_bonuses" type="button" class="text-blue-600 hover:underline" :title="`${row.employee.name}: bonus per category`" @click="breakdown = { row, title: row.employee.name, userIds: [row.user?.id].filter(Boolean) }">{{ money(row.total_amount) }}</button>
                                        <span v-else class="text-xs text-gray-400">No bonuses</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{{ row.vacation_days || '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.extra_amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.bonus) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right font-semibold tabular-nums">{{ money(row.net_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.employer_pension) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.pension) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.income_tax) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.gross_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.health_insurance) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(row.employer_health_insurance) }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right font-semibold tabular-nums">{{ money(row.net_pay) }}</td>
                                    <td v-if="finalized" class="border border-gray-300 px-2 py-1.5 text-center">
                                        <RouterLink
                                            v-if="row.payment_journal"
                                            :to="routeUrl('journals.show', row.payment_journal.id)"
                                            class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200"
                                            :title="`Paid by ${row.payment_journal.gen_id}`"
                                        >Paid</RouterLink>
                                        <span v-else class="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Not paid</span>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot v-if="rows.length">
                                <tr class="bg-gray-50 font-semibold">
                                    <td class="border border-gray-300 px-2 py-2">Total ({{ rows.length }})</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.base_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                        <button type="button" class="text-blue-600 hover:underline" @click="breakdown = { row: totals, title: 'All employees', userIds: rows.filter((employee) => employee.user && employee.with_bonuses).map((employee) => employee.user.id) }">{{ money(totals.total_amount) }}</button>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ totals.vacation_days }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.extra_amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.bonus) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.net_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.employer_pension) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.pension) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.income_tax) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.gross_salary) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.health_insurance) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.employer_health_insurance) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.net_pay) }}</td>
                                    <td v-if="finalized" class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ rows.length - unpaid }} / {{ rows.length }}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <p class="mt-3 text-xs text-gray-500">
                        Employees with a contract in the month (the latest one when it changed mid-month). Bonus amount = every person on the linked user's invoices × the rate of its category (click it for the breakdown; see Employee Bonus Calculation);
                        approved paid vacation days in the month add bonus amount / {{ data.working_days }} × days. Net salary = base salary + bonus; gross, pension and income tax as the Tax Administration's calculator ({{ summary }}); the employer adds its own pension on top, except for employees in pension.
                        Health insurance comes from the contract: the employee's share is taken off the net salary (To pay = net salary − employee health insurance, what the PCB CSV pays); the company's is a taxable benefit added to the gross salary, which is grossed up so the company bears its pension and tax.
                    </p>
                </template>
            </FullWidthBox>
        </div>

        <BonusBreakdown
            :show="Boolean(breakdown)"
            :title="breakdown ? `Bonus — ${breakdown.title}` : ''"
            :subtitle="data?.period ?? ''"
            :row="breakdown?.row ?? null"
            :categories="data?.categories ?? []"
            :working-days="data?.working_days ?? 22"
            :date-from="data?.date_from ?? ''"
            :date-to="data?.date_to ?? ''"
            :user-ids="breakdown?.userIds ?? []"
            @close="breakdown = null"
        />

        <ConfirmDialog
            :show="Boolean(confirming)"
            :title="confirming ? dialogs[confirming].title : ''"
            :message="confirming && data ? dialogs[confirming].message() : ''"
            confirm-label="Yes"
            :processing="Boolean(busy)"
            @confirm="dialogs[confirming].confirm()"
            @cancel="confirming = null"
        />
    </AppLayout>
</template>
