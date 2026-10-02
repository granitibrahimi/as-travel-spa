<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource, castMutation } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate } from '../../../helpers/date';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);
// "Clone" opens this create form pre-filled from an existing journal
// (?clone=<id>). `isEdit` stays false, so submit still POSTs a brand-new
// journal — only the field values carry over, not the identity/number.
const cloneId = ! isEdit ? (route.query.clone ?? null) : null;
// "Add payment journal" on a finalized payroll opens this form with
// ?payroll=<year>-<month>: pre-filled from the payroll's `payment_journal`,
// listing the employees not paid yet. The checked ones are paid by it
// (`payroll_item_ids`) and the two pre-filled lines follow their total; once
// saved it's linked to the payroll as a payment journal (`payroll_id`).
const payrollKey = ! isEdit && ! cloneId ? (route.query.payroll ?? null) : null;
const payroll = ref(null);
const payrollItems = ref([]);
const selectedItems = ref([]);
const selectedTotal = computed(() => Math.round(payrollItems.value
    .filter((item) => selectedItems.value.includes(item.id))
    .reduce((sum, item) => sum + item.net_pay, 0) * 100) / 100);
const allSelected = computed({
    get: () => payrollItems.value.length > 0 && selectedItems.value.length === payrollItems.value.length,
    set: (value) => { selectedItems.value = value ? payrollItems.value.map((item) => item.id) : []; },
});
// The pre-filled lines (debit, credit) carry the checked employees' total.
let paymentLines = [];

watch(selectedTotal, (total) => {
    const [debit, credit] = paymentLines;

    if (debit && form.entries.includes(debit)) {
        debit.debit = total || null;
    }
    if (credit && form.entries.includes(credit)) {
        credit.credit = total || null;
    }
});

const formOptions = useFormOptionsStore();
const accounts = computed(() => toOptions(formOptions.accounts));
const taxTypes = computed(() => toOptions(formOptions.taxTypes));
const errors = ref({});
const processing = ref(false);
const ready = ref(false);
const genId = ref(null);

const blankLine = () => ({
    account: null,
    debit: null,
    credit: null,
    description: '',
    tax_type: null,
    customer_supplier: null,
    relation_label: null,
});

const form = reactive({
    date: todayApiDate(),
    reference: '',
    notes: '',
    entries: [blankLine(), blankLine(), blankLine(), blankLine()],
});

onMounted(async () => {
    const sourceId = id ?? cloneId;
    const journal = sourceId
        ? await api.get(`/finance/journals/${sourceId}`).then((r) => castResource(r.data))
        : null;

    if (payrollKey) {
        const [payrollYear, payrollMonth] = String(payrollKey).split('-');
        const data = castResource((await api.get(`/users/payrolls/${payrollYear}/${payrollMonth}`)).data);
        const draft = data.payment_journal;

        if (draft) {
            payroll.value = { id: draft.payroll_id, year: payrollYear, month: payrollMonth, period: data.period };
            form.date = draft.date;
            form.reference = draft.reference;
            form.notes = draft.notes;
            form.entries = [
                { ...blankLine(), account: draft.debit_account_id, debit: draft.amount || null, description: draft.notes },
                { ...blankLine(), account: draft.credit_account_id, credit: draft.amount || null, description: draft.notes },
            ];
            paymentLines = form.entries;
            payrollItems.value = draft.items;
            selectedItems.value = draft.items.map((item) => item.id);
        }
    }

    if (journal) {
        // A clone copies the field values but not the journal number.
        if (isEdit) {
            genId.value = journal.gen_id;
        }
        form.date = journal.on_date;
        form.reference = journal.reference ?? '';
        form.notes = journal.notes ?? '';
        form.entries = journal.lines?.length
            ? journal.lines.map((line) => ({
                account: line.account_id,
                debit: line.debit || null,
                credit: line.credit || null,
                description: line.description ?? '',
                tax_type: line.tax_type_id,
                customer_supplier: line.customer_supplier,
                relation_label: line.relation,
            }))
            : [blankLine(), blankLine(), blankLine(), blankLine()];
    }

    ready.value = true;
});

// Only lines with at least one input filled are sent — blank rows (the
// default 4, or ones the user never got to) shouldn't trigger validation.
function hasContent(entry) {
    return Boolean(
        entry.account
        || entry.debit
        || entry.credit
        || entry.description?.trim()
        || entry.tax_type
        || entry.customer_supplier,
    );
}

function addRow() {
    form.entries.push(blankLine());
}

function removeRow(index) {
    form.entries.splice(index, 1);
}

// Debit and credit are mutually exclusive per line.
function onDebit(entry) {
    if (entry.debit) {
        entry.credit = null;
    }
}

function onCredit(entry) {
    if (entry.credit) {
        entry.debit = null;
    }
}

const totalDebit = computed(() => form.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0));
const totalCredit = computed(() => form.entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0));
const balanced = computed(() => Math.round(totalDebit.value * 100) === Math.round(totalCredit.value * 100));

async function submit() {
    if (processing.value || ! balanced.value || (payroll.value && ! selectedItems.value.length)) {
        return;
    }

    processing.value = true;
    errors.value = {};

    // Filter out blank rows, but remember each kept row's original index so
    // a 422's `entries.<n>.*` keys (indexed into the filtered list) can be
    // mapped back to the row actually shown on screen.
    const originalIndices = [];
    const entries = form.entries.filter((entry, index) => {
        if (! hasContent(entry)) {
            return false;
        }
        originalIndices.push(index);
        return true;
    });

    const payload = {
        date: form.date,
        reference: form.reference,
        notes: form.notes,
        entries,
        ...(payroll.value ? { payroll_id: payroll.value.id, payroll_item_ids: selectedItems.value } : {}),
    };

    try {
        const { data } = await (isEdit
            ? api.put(`/finance/journals/${id}`, payload)
            : api.post('/finance/journals', payload));
        router.push(payroll.value
            ? routeUrl('payrolls.show', payroll.value.year, payroll.value.month)
            : routeUrl('journals.show', castMutation(data).id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => {
                    const match = field.match(/^entries\.(\d+)\.(.+)$/);
                    if (! match) {
                        return [field, messages[0]];
                    }
                    const originalIndex = originalIndices[Number(match[1])] ?? match[1];
                    return [`entries.${originalIndex}.${match[2]}`, messages[0]];
                }),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? `Edit ${genId ?? 'journal'}` : 'New journal'" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <p v-if="cloneId" class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Pre-filled from journal #{{ cloneId }}. Saving will create a new journal.
            </p>

            <p v-if="payroll" class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Payment journal for the {{ payroll.period }} payroll. Saving links it to the payroll.
            </p>

            <FullWidthBox v-if="payroll" title="Employees paid" :collapsible="false">
                <p v-if="! payrollItems.length" class="text-sm text-gray-500">Every salary of this payroll is already paid.</p>
                <template v-else>
                    <p v-if="errors.payroll_item_ids" class="mb-3 text-sm text-red-600">{{ errors.payroll_item_ids }}</p>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2 text-center" style="width: 48px;">
                                        <input v-model="allSelected" type="checkbox" class="h-4 w-4 cursor-pointer" title="Select all">
                                    </th>
                                    <th class="border border-gray-300 px-2 py-2">Employee</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">To pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in payrollItems" :key="item.id" class="cursor-pointer hover:bg-gray-50" @click="selectedItems = selectedItems.includes(item.id) ? selectedItems.filter((id) => id !== item.id) : [...selectedItems, item.id]">
                                    <td class="border border-gray-300 px-2 py-1.5 text-center">
                                        <input :checked="selectedItems.includes(item.id)" type="checkbox" class="pointer-events-none h-4 w-4">
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1.5">{{ item.name }}</td>
                                    <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">{{ money(item.net_pay) }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="bg-gray-50 font-semibold">
                                    <td class="border border-gray-300 px-2 py-2"></td>
                                    <td class="border border-gray-300 px-2 py-2">{{ selectedItems.length }} of {{ payrollItems.length }} selected</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(selectedTotal) }}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <p class="mt-2 text-xs text-gray-500">The checked employees are marked paid by this journal; the next payment journal only offers the rest.</p>
                </template>
            </FullWidthBox>

            <FullWidthBox title="Journal" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DateInput v-model="form.date" label="Date *" :error="errors.date" />
                    <InputText v-model="form.reference" label="Reference" maxlength="21" :error="errors.reference" />
                    <InputText v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Lines" :collapsible="false">
                <p v-if="errors.entries" class="mb-3 text-sm text-red-600">{{ errors.entries }}</p>

                <div class="space-y-2">
                    <div
                        v-for="(entry, i) in form.entries"
                        :key="i"
                        class="grid grid-cols-1 gap-2 rounded border border-gray-100 p-2 lg:grid-cols-12"
                    >
                        <div class="lg:col-span-3">
                            <SearchSelect v-model="entry.account" :options="accounts" placeholder="Account…" :error="errors[`entries.${i}.account`]" />
                        </div>
                        <div class="lg:col-span-3">
                            <InputText v-model="entry.description" placeholder="Description" :error="errors[`entries.${i}.description`]" />
                        </div>
                        <div class="lg:col-span-2">
                            <AsyncSelect
                                v-model="entry.customer_supplier"
                                url="/finance/journals/relations"
                                placeholder="Customer / supplier"
                                :initial-option="entry.customer_supplier ? { id: entry.customer_supplier, name: entry.relation_label } : null"
                            />
                        </div>
                        <div class="lg:col-span-2">
                            <SearchSelect v-model="entry.tax_type" :options="taxTypes" placeholder="Tax" />
                        </div>
                        <div>
                            <InputNumber v-model="entry.debit" placeholder="Debit" :disabled="Boolean(entry.credit)" @input="onDebit(entry)" />
                        </div>
                        <div class="flex items-start gap-1">
                            <InputNumber v-model="entry.credit" placeholder="Credit" :disabled="Boolean(entry.debit)" @input="onCredit(entry)" />
                            <button
                                type="button"
                                class="mt-1 shrink-0 rounded px-1.5 text-gray-400 hover:text-red-600"
                                title="Remove line"
                                @click="removeRow(i)"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <div class="mt-3 flex items-center justify-between">
                    <Button type="button" size="sm" @click="addRow">+ Add line</Button>
                    <div class="flex items-center gap-4 text-sm">
                        <span class="text-gray-500">Debit <span class="font-semibold tabular-nums text-gray-800">{{ money(totalDebit) }}</span></span>
                        <span class="text-gray-500">Credit <span class="font-semibold tabular-nums text-gray-800">{{ money(totalCredit) }}</span></span>
                        <span
                            class="rounded px-2 py-0.5 text-xs font-medium"
                            :class="balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                        >
                            {{ balanced ? 'Balanced' : 'Out of balance' }}
                        </span>
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('journals.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! balanced || (payroll && ! selectedItems.length)">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update journal' : 'Create journal') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
