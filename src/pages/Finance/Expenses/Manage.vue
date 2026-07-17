<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate } from '../../../helpers/date';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const formOptions = useFormOptionsStore();
const paymentMethods = computed(() => toOptions(formOptions.paymentMethods));
const accounts = computed(() => toOptions(formOptions.accounts));
const taxTypes = computed(() => toOptions(formOptions.taxTypes));
const errors = ref({});
const processing = ref(false);
const ready = ref(false);
const genId = ref(null);

const blankLine = () => ({ account: null, amount: null, description: '', tax_type: null });

const form = reactive({
    payment_method_id: null,
    date: todayApiDate(),
    notes: '',
    entries: [blankLine(), blankLine(), blankLine()],
});

onMounted(async () => {
    const expense = isEdit
        ? await api.get(`/expenses/${id}`).then((r) => r.data.data ?? r.data)
        : null;

    if (expense) {
        genId.value = expense.gen_id;
        form.payment_method_id = expense.payment_method_id;
        form.date = expense.on_date;
        form.notes = expense.notes ?? '';
        form.entries = expense.lines?.length
            ? expense.lines.map((line) => ({
                account: line.account_id,
                amount: line.amount || null,
                description: line.description ?? '',
                tax_type: line.tax_type_id,
            }))
            : [blankLine(), blankLine(), blankLine()];
    }

    ready.value = true;
});

function addRow() {
    form.entries.push(blankLine());
}

function removeRow(index) {
    form.entries.splice(index, 1);
}

const filledEntries = computed(() => form.entries.filter((e) => e.account || e.amount || e.description));
const total = computed(() => filledEntries.value.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0));

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = {
        payment_method_id: form.payment_method_id,
        date: form.date,
        notes: form.notes,
        entries: filledEntries.value.map((e) => ({
            account_id: e.account,
            amount: e.amount,
            description: e.description,
            tax_type_id: e.tax_type,
        })),
    };

    try {
        const { data } = await (isEdit
            ? api.put(`/expenses/${id}`, payload)
            : api.post('/expenses', payload));
        router.push(`/expenses/${data.id}`);
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
    <AppLayout :title="isEdit ? `Edit ${genId ?? 'expense'}` : 'New expense'" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Expense" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SearchSelect v-model="form.payment_method_id" :options="paymentMethods" placeholder="Payment method…" label="Payment method *" :error="errors.payment_method_id" />
                    <DateInput v-model="form.date" label="Date *" :error="errors.date" />
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
                        <div class="lg:col-span-4">
                            <SearchSelect v-model="entry.account" :options="accounts" placeholder="Category account…" :error="errors[`entries.${i}.account_id`]" />
                        </div>
                        <div class="lg:col-span-4">
                            <InputText v-model="entry.description" placeholder="Description" :error="errors[`entries.${i}.description`]" />
                        </div>
                        <div class="lg:col-span-2">
                            <SearchSelect v-model="entry.tax_type" :options="taxTypes" placeholder="Tax" :error="errors[`entries.${i}.tax_type_id`]" />
                        </div>
                        <div class="flex items-start gap-1 lg:col-span-2">
                            <InputText v-model="entry.amount" type="number" step="0.01" placeholder="Amount" :error="errors[`entries.${i}.amount`]" />
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
                    <span class="text-sm text-gray-500">Total <span class="font-semibold tabular-nums text-gray-800">{{ money(total) }}</span></span>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/expenses" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update expense' : 'Create expense') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
