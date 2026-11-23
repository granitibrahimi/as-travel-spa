<script setup>
import {computed, onMounted, reactive, ref} from 'vue';
import DateInput from '../../../components/Form/DateInput.vue';
import {RouterLink, useRoute, useRouter} from 'vue-router';
import api from '../../../helpers/api';
import {routeUrl} from '../../../helpers/route.js';
import {todayApiDate} from '../../../helpers/date.js';
import {money} from '../../../helpers/money';
import {castResource, castMutation} from '../../../types/responses.js';
import {useFormOptionsStore, toOptions} from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';
import SearchSelect from "../../../components/Form/SearchSelect.vue";

const route = useRoute();
const router = useRouter();

// /suppliers/bills/:id/edit edits that bill; /suppliers/bills/:supplierId/create makes a new one.
const editId = route.params.id ?? null;
const isEdit = Boolean(editId);
const supplierId = ref(route.params.supplierId ?? null);
// ?copy=<bill id>: pre-fill the form from that bill (Copy Bill on the bill page).
const copyFrom = isEdit ? null : route.query.copy;

// A blank line-item row. The bill total is the sum of its entries.
const newEntry = () => ({account_id: null, amount: null, description: '', tax_type_id: null});

const form = reactive({
    gen_id: '',
    reference: '',
    on_date: todayApiDate(),    // d.m.Y — defaults to today
    due_date: '',
    notes: '',
    entries: [newEntry(), newEntry()],
});

const formOptions = useFormOptionsStore();
const accounts = computed(() => toOptions(formOptions.billAccounts));
const taxTypes = computed(() => toOptions(formOptions.taxTypes));
const supplier = ref(null);
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);
const copiedFrom = ref(null);
// Edit only: why the backend will refuse the save (bill from an invoice, or with payments).
const editBlocked = ref(null);
const invoice = ref(null);

const total = computed(() =>
    form.entries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
);

// Per-row validation errors come back keyed as `entries.<i>.<field>`.
const entryError = (index, field) => errors.value[`entries.${index}.${field}`];

function addRow() {
    form.entries.push(newEntry());
}

function removeRow(index) {
    form.entries.splice(index, 1);

    if (form.entries.length === 0) {
        form.entries.push(newEntry());
    }
}

async function loadForEdit() {
    const {data} = await api.get(`/suppliers/bills/${editId}`);
    const bill = castResource(data);
    supplierId.value = bill.supplier?.id;
    supplier.value = bill.supplier;
    invoice.value = bill.customer_invoice;

    if (!bill.can_edit) {
        editBlocked.value = 'This bill was created from an invoice. Edit it from the invoice instead.';
    } else if (bill.edit_blocked_reason) {
        editBlocked.value = bill.edit_blocked_reason;
    }

    Object.assign(form, {
        gen_id: bill.gen_id ?? '',
        reference: bill.reference ?? '',
        on_date: bill.on_date ?? form.on_date,
        due_date: bill.due_date ?? '',
        notes: bill.notes ?? '',
        entries: bill.lines.length
            ? bill.lines.map((line) => ({
                account_id: line.account_id,
                amount: line.amount,
                description: line.description ?? '',
                tax_type_id: line.tax_type_id,
            }))
            : [newEntry()],
    });
}

onMounted(async () => {
    if (isEdit) {
        await loadForEdit();
        loaded.value = true;
        return;
    }

    const [{data}, copy] = await Promise.all([
        api.get(`/suppliers/suppliers/${supplierId.value}`),
        copyFrom ? api.get(`/suppliers/bills/${copyFrom}/copy`) : null,
    ]);
    supplier.value = castResource(data);

    if (copy) {
        const bill = castResource(copy.data);
        Object.assign(form, {
            gen_id: bill.gen_id ?? '',
            on_date: bill.on_date ?? form.on_date,
            due_date: bill.due_date ?? '',
            notes: bill.notes ?? '',
            entries: bill.entries.length ? bill.entries.map((entry) => ({...newEntry(), ...entry})) : [newEntry()],
        });
        copiedFrom.value = copyFrom;
    }

    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {...form};

    try {
        const {data} = isEdit
            ? await api.put(`/suppliers/bills/${editId}`, payload)
            : await api.post(`/suppliers/suppliers/${supplierId.value}/bills`, payload);
        router.push(routeUrl('supplierBills.show', castMutation(data).id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}

const cancelTo = computed(() => (isEdit
    ? routeUrl('supplierBills.show', editId)
    : routeUrl('suppliers.show', supplierId.value)));

const pageTitle = computed(() => (isEdit
    ? `Edit Bill ${form.gen_id}`
    : 'New Bill for ' + (supplier.value?.full_name ?? '')));
</script>

<template>
    <AppLayout :title="pageTitle" fluid>
        <Loader v-if="! loaded"/>
        <form v-else class="space-y-6" @submit.prevent="submit">
            <p v-if="copiedFrom" class="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Copied from
                <RouterLink :to="routeUrl('supplierBills.show', copiedFrom)" class="font-medium underline">bill #{{ copiedFrom }}</RouterLink>
                — review the details, then create the bill. Payments and reconciliation aren't copied.
            </p>
            <p v-if="editBlocked" class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {{ editBlocked }}
                <RouterLink v-if="invoice" :to="routeUrl('customerInvoices.show', invoice.id)" class="font-medium underline">Open invoice {{ invoice.gen_id }}</RouterLink>
            </p>
            <p v-if="errors.bill" class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {{ errors.bill }}
            </p>
            <p v-if="isEdit && supplier" class="text-sm text-gray-600">
                Supplier: <RouterLink :to="routeUrl('suppliers.show', supplier.id)" class="font-medium text-red-600 hover:underline">{{ supplier.full_name ?? supplier.name }}</RouterLink>
            </p>
            <FullWidthBox title="Bill details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.gen_id" label="Identifier *" :error="errors.gen_id"/>
                    <InputText v-model="form.reference" label="Reference (used for internal reference)"
                               :error="errors.reference"/>
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date"/>
                    <DateInput v-model="form.due_date" label="Due Date *" :error="errors.due_date"/>
                </div>
                <div class="mt-4">
                    <Textarea v-model="form.notes" label="Notes" :error="errors.notes"/>
                </div>

                <p v-if="errors.empty_entries || errors.entries" class="mt-4 text-xs text-red-600">
                    {{ errors.empty_entries ?? errors.entries }}
                </p>

                <div class="mt-6 overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                        <tr class="border-b text-left text-gray-500">
                            <th class="w-10 py-2 pr-2">ID</th>
                            <th class="py-2 pr-2">Account</th>
                            <th class="w-32 py-2 pr-2">Amount</th>
                            <th class="py-2 pr-2">Description</th>
                            <th class="w-56 py-2 pr-2">VAT</th>
                            <th class="w-12 py-2"></th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="(entry, i) in form.entries" :key="i" class="border-b align-top last:border-0">
                            <td class="py-2 pr-2 text-gray-500">{{ i + 1 }}</td>
                            <td class="py-2 pr-2">
                                <SearchSelect v-model="entry.account_id" :options="accounts"  :error="entryError(i, 'account_id')"/>
                            </td>
                            <td class="py-2 pr-2">
                                <InputNumber v-model="entry.amount" step="0.01" :error="entryError(i, 'amount')"/>
                            </td>
                            <td class="py-2 pr-2">
                                <Textarea v-model="entry.description" :error="entryError(i, 'description')"/>
                            </td>
                            <td class="py-2 pr-2">
                                <Select v-model="entry.tax_type_id" :options="taxTypes"
                                        :error="entryError(i, 'tax_type_id')"/>
                            </td>
                            <td class="py-2 text-center">
                                <button
                                    type="button"
                                    class="text-gray-400 hover:text-red-600"
                                    title="Remove row"
                                    @click="removeRow(i)"
                                >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5"
                                         viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                              d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                        </tbody>
                        <tfoot>
                        <tr class="border-t font-medium">
                            <td class="py-2 pr-2"></td>
                            <td class="py-2 pr-2 text-right text-gray-500">Total</td>
                            <td class="py-2 pr-2 tabular-nums">{{ money(total) }}</td>
                            <td colspan="3"></td>
                        </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="mt-4">
                    <Button type="button" variant="primary" @click="addRow">+ Add row</Button>
                </div>
            </FullWidthBox>

            <footer
                class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="cancelTo" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded || !! editBlocked">
                    {{ processing ? 'Saving…' : (isEdit ? 'Save Bill' : 'Create Bill') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
