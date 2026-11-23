<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castMutation } from '../../../types/responses.js';
import { downloadFile } from '../../../helpers/download.js';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore } from '../../../stores/formOptions.js';
import { bankAccountOptions } from './types.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Alert from '../../../components/Alert.vue';
import InputText from '../../../components/Form/InputText.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';

const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();
const bankAccounts = computed(() => bankAccountOptions(formOptions.paymentMethods));

const form = reactive({
    payment_method_id: route.query.payment_method_id ? Number(route.query.payment_method_id) : null,
    note: '',
});
const receivedInput = ref(null);
const listInput = ref(null);
const errors = ref({});
const processing = ref(false);
const fileClass = 'block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50';

function firstErrors(response) {
    return Object.fromEntries(Object.entries(response.data.errors ?? {}).map(([field, messages]) => [field, Array.isArray(messages) ? messages.join(' ') : messages]));
}

async function downloadTemplate() {
    await downloadFile('/finance/bank-statements/template', { fallbackName: 'bank_statement_template.xlsx' });
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = new FormData();
    payload.append('payment_method_id', form.payment_method_id ?? '');
    payload.append('note', form.note ?? '');

    const received = receivedInput.value?.files?.[0];
    const list = listInput.value?.files?.[0];

    if (received) {
        payload.append('received_file', received);
    }

    payload.append('list_file', list ?? '');

    try {
        const { data } = await api.post('/finance/bank-statements', payload);
        const { id, message } = castMutation(data);
        router.push(routeUrl('bankStatements.show', { id, message }));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = firstErrors(error.response);
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Import Bank Statement" fluid>
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Import Bank Statement" :collapsible="false">
                <template #actions>
                    <Button type="button" size="sm" @click="downloadTemplate">Download Excel template</Button>
                </template>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SearchSelect v-model="form.payment_method_id" :options="bankAccounts" label="Bank account *" placeholder="Bank account…" :error="errors.payment_method_id" />
                    <InputText v-model="form.note" label="Note" placeholder="e.g. November statement" :error="errors.note" />

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Received File (PDF or Excel from the bank)</label>
                        <input ref="receivedInput" type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" :class="fileClass">
                        <p class="mt-1 text-xs text-gray-500">The statement as the bank sent it. Kept with the import for reference.</p>
                        <p v-if="errors.received_file" class="mt-1 text-sm text-red-600">{{ errors.received_file }}</p>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Excel list *</label>
                        <input ref="listInput" type="file" accept=".xlsx,.xls,.csv" :class="fileClass">
                        <p class="mt-1 text-xs text-gray-500">The prepared list, one row per transaction: Date, Description, Reference, Counterparty, Money in, Money out.</p>
                        <p v-if="errors.list_file" class="mt-1 text-sm text-red-600">{{ errors.list_file }}</p>
                    </div>
                </div>

                <Alert type="info" class="mt-4">
                    After the import each row is matched automatically to a customer or supplier payment, refund, bank deposit, expense or account transfer
                    on this bank account with the same amount, within 7 days (the customer or supplier named in the row decides between equal ones).
                    Rows that can't be matched are matched by hand on the next page. Rows imported before are skipped.
                </Alert>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('bankStatements.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :loading="processing">Import and match</Button>
            </footer>
        </form>
    </AppLayout>
</template>
