<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
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
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate } from '../../../helpers/date';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

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
    const journal = isEdit
        ? await api.get(`/journals/${id}`).then((r) => castResource(r.data))
        : null;

    if (journal) {
        genId.value = journal.gen_id;
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
    if (processing.value || ! balanced.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {
        date: form.date,
        reference: form.reference,
        notes: form.notes,
        entries: form.entries,
    };

    try {
        const { data } = await (isEdit
            ? api.put(`/journals/${id}`, payload)
            : api.post('/journals', payload));
        router.push(routeUrl('journals.show', castMutation(data).id));
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
</script>

<template>
    <AppLayout :title="isEdit ? `Edit ${genId ?? 'journal'}` : 'New journal'" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
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
                                url="/journals/relations"
                                placeholder="Customer / supplier"
                                :initial-option="entry.customer_supplier ? { id: entry.customer_supplier, name: entry.relation_label } : null"
                            />
                        </div>
                        <div class="lg:col-span-2">
                            <SearchSelect v-model="entry.tax_type" :options="taxTypes" placeholder="Tax" />
                        </div>
                        <div>
                            <InputText v-model="entry.debit" type="number" step="0.01" placeholder="Debit" @input="onDebit(entry)" />
                        </div>
                        <div class="flex items-start gap-1">
                            <InputText v-model="entry.credit" type="number" step="0.01" placeholder="Credit" @input="onCredit(entry)" />
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
                <Button type="submit" variant="primary" :disabled="processing || ! balanced">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update journal' : 'Create journal') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
