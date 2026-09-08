<script setup>
// Create or edit a supplier credit note. Credit notes are 1-1 with supplier
// bills (mirrors Suppliers/Bills/Create.vue), minus the fields the credit-note
// endpoint doesn't take: no `gen_id` (auto-generated server-side) and no
// `due_date`.
//
//   create  -> route param `supplierId`, POST /suppliers/suppliers/{id}/credit-notes
//   edit    -> route param `id`,         PUT  /suppliers/credit-notes/{id}
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
import SearchSelect from '../../../components/Form/SearchSelect.vue';

const route = useRoute();
const router = useRouter();

const editId = route.params.id ?? null;
const isEdit = Boolean(editId);

// In edit mode the supplier id comes from the loaded credit note.
const supplierId = ref(route.params.supplierId ?? null);

// A blank line-item row. The credit note total is the sum of its entries.
const newEntry = () => ({account_id: null, amount: null, description: '', tax_type_id: null});

const form = reactive({
    reference: '',
    on_date: todayApiDate(),    // d.m.Y — defaults to today (create)
    notes: '',
    entries: [newEntry(), newEntry()],
});

const formOptions = useFormOptionsStore();
const accounts = computed(() => toOptions(formOptions.billAccounts));
const taxTypes = computed(() => toOptions(formOptions.taxTypes));
const supplierName = ref('');
const genId = ref('');
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

const pageTitle = computed(() => (isEdit
    ? `Edit Credit Note ${genId.value}`
    : `New Credit Note for ${supplierName.value}`));

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

onMounted(async () => {
    if (isEdit) {
        const {data} = await api.get(`/suppliers/credit-notes/${editId}`);
        const creditNote = castResource(data);

        supplierId.value = creditNote.supplier?.id ?? null;
        supplierName.value = creditNote.supplier?.name ?? '';
        genId.value = creditNote.gen_id ?? '';

        form.reference = creditNote.reference ?? '';
        form.on_date = creditNote.on_date;
        form.notes = creditNote.notes ?? '';
        form.entries = (creditNote.lines ?? []).map((line) => ({
            account_id: line.account_id ?? null,
            amount: line.amount ?? null,
            description: line.description ?? '',
            tax_type_id: line.tax_type_id ?? null,
        }));

        if (form.entries.length === 0) {
            form.entries = [newEntry(), newEntry()];
        }
    } else {
        const {data} = await api.get(`/suppliers/suppliers/${supplierId.value}`);
        supplierName.value = castResource(data)?.full_name ?? '';
    }

    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const payload = {...form};
        const {data} = isEdit
            ? await api.put(`/suppliers/credit-notes/${editId}`, payload)
            : await api.post(`/suppliers/suppliers/${supplierId.value}/credit-notes`, payload);

        router.push(routeUrl('supplierCreditNotes.show', isEdit ? editId : castMutation(data).id));
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
    ? routeUrl('supplierCreditNotes.show', editId)
    : routeUrl('suppliers.show', supplierId.value)));
</script>

<template>
    <AppLayout :title="pageTitle" fluid>
        <Loader v-if="! loaded"/>
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Credit note details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.reference" label="Reference (used for internal reference)"
                               :error="errors.reference"/>
                    <DateInput v-model="form.on_date" label="Date *" :error="errors.on_date"/>
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
                                <SearchSelect v-model="entry.account_id" :options="accounts" :error="entryError(i, 'account_id')"/>
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
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Save Credit Note' : 'Create Credit Note') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
