<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { downloadFile } from '../../../helpers/download.js';
import { routeUrl } from '../../../helpers/route.js';
import { useFormOptionsStore, toAccountOptions } from '../../../stores/formOptions.js';
import { KINDS, kindOf, shownBalance } from './types.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Alert from '../../../components/Alert.vue';
import Loader from '../../../components/Loader.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';

const props = defineProps({
    kind: { type: Number, default: 1 },
});

const route = useRoute();
const router = useRouter();
const formOptions = useFormOptionsStore();
const accounts = computed(() => toAccountOptions(formOptions.accounts));
const tool = computed(() => kindOf(props.kind));
const isCard = computed(() => props.kind === 2);

const form = reactive({
    account_id: route.query.account_id ? Number(route.query.account_id) : null,
    from_date: '',
    to_date: '',
    // As shown: a bank balance, or for a card the debt (positive).
    opening_balance: '',
    closing_balance: '',
    note: '',
});
const fileInput = ref(null);
const receivedInput = ref(null);
const preview = ref(null);
const previewing = ref(false);
const errors = ref({});
const processing = ref(false);
const fileClass = 'block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50';

const otherTool = computed(() => (preview.value && preview.value.kind !== props.kind ? KINDS[preview.value.kind] : null));
const shown = (value) => (value === null || value === undefined || value === '' ? '' : String(shownBalance(props.kind, Number(value))));
const toLedger = (value) => (value === '' || value === null ? '' : String(shownBalance(props.kind, Number(value))));

function firstErrors(response) {
    return Object.fromEntries(Object.entries(response.data.errors ?? {}).map(([field, messages]) => [field, Array.isArray(messages) ? messages.join(' ') : messages]));
}

async function downloadTemplate() {
    await downloadFile('/finance/bank-statements/template', { fallbackName: 'bank_statement_template.xlsx' });
}

// Reads the file right away: format, period, balances and whether it adds up.
async function readFile() {
    const file = fileInput.value?.files?.[0];
    preview.value = null;
    errors.value = {};

    if (! file) {
        return;
    }

    previewing.value = true;

    const payload = new FormData();
    payload.append('file', file);

    if (form.account_id) {
        payload.append('account_id', form.account_id);
    }

    try {
        const data = castResource((await api.post('/finance/bank-statements/preview', payload)).data);
        preview.value = data;
        form.from_date = data.from_date ?? '';
        form.to_date = data.to_date ?? '';
        form.opening_balance = shown(data.opening_balance);
        form.closing_balance = shown(data.closing_balance);

        if (! form.account_id && data.account) {
            form.account_id = data.account.id;
        }
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = firstErrors(error.response);
        } else {
            throw error;
        }
    } finally {
        previewing.value = false;
    }
}

// The count of rows imported before depends on the account.
watch(() => form.account_id, (value, old) => {
    if (preview.value && value && value !== old && value !== preview.value.account?.id) {
        readFile();
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    const payload = new FormData();
    payload.append('kind', props.kind);
    payload.append('account_id', form.account_id ?? '');
    payload.append('file', fileInput.value?.files?.[0] ?? '');
    payload.append('from_date', form.from_date ?? '');
    payload.append('to_date', form.to_date ?? '');
    payload.append('opening_balance', toLedger(form.opening_balance));
    payload.append('closing_balance', toLedger(form.closing_balance));
    payload.append('note', form.note ?? '');

    const received = receivedInput.value?.files?.[0];

    if (received) {
        payload.append('received_file', received);
    }

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
    <AppLayout :title="`${tool.title}: import`" fluid>
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox :title="`${tool.title}: import ${tool.noun}`" :collapsible="false">
                <template #actions>
                    <Button v-if="! isCard" type="button" size="sm" @click="downloadTemplate">Download Excel template</Button>
                </template>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <SearchSelect v-model="form.account_id" :options="accounts" label="Account *" placeholder="Search account by number or name…" :error="errors.account_id" />
                        <p class="mt-1 text-xs text-gray-500">{{ tool.accountHint }} Picked for you when this account's statements were imported before.</p>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Statement file *</label>
                        <input ref="fileInput" type="file" accept=".pdf,.xlsx,.xls,.csv" :class="fileClass" @change="readFile">
                        <p class="mt-1 text-xs text-gray-500">{{ tool.hint }}</p>
                        <p v-if="errors.file" class="mt-1 text-sm text-red-600">{{ errors.file }}</p>
                    </div>
                </div>

                <p v-if="previewing" class="mt-4"><Loader /></p>

                <template v-if="preview">
                    <Alert v-if="otherTool" type="warning" class="mt-4">
                        This looks like a {{ otherTool.noun }}. It belongs in
                        <RouterLink :to="routeUrl(otherTool.create)" class="font-medium underline">{{ otherTool.title }}</RouterLink>.
                        You can still import it here.
                    </Alert>

                    <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                        <p>
                            <span class="font-medium">{{ preview.format_name }}</span>
                            <span v-if="preview.account_number"> · {{ preview.account_number }}</span>
                            <span v-if="preview.account_name"> · {{ preview.account_name }}</span>
                        </p>
                        <p class="mt-1 text-gray-700">
                            {{ preview.lines_count }} rows ·
                            {{ tool.inLabel }} {{ money(preview.money_in) }} ·
                            {{ tool.outLabel }} {{ money(preview.money_out) }}
                        </p>
                        <p v-if="preview.adds_up === true" class="mt-1 text-green-700">The balance before plus the rows gives the balance after.</p>
                        <p v-else-if="preview.adds_up === false" class="mt-1 text-amber-800">The balance before plus the rows does not give the balance after. Check the balances below.</p>
                        <p v-if="preview.already_imported" class="mt-1 text-amber-800">{{ preview.already_imported }} of these rows were imported before on this account and will be skipped.</p>
                    </div>

                    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <DateInput v-model="form.from_date" label="From date" :error="errors.from_date" />
                        <DateInput v-model="form.to_date" label="To date" :error="errors.to_date" />
                        <InputText v-model="form.opening_balance" type="number" step="0.01" :label="`${tool.balanceLabel} before`" :error="errors.opening_balance" />
                        <InputText v-model="form.closing_balance" type="number" step="0.01" :label="`${tool.balanceLabel} after`" :error="errors.closing_balance" />
                    </div>
                    <p v-if="isCard" class="mt-1 text-xs text-gray-500">Debt on the card as printed on the statement (what is owed to the bank).</p>

                    <div class="mt-4 overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-1" style="width: 100px;">Date</th>
                                    <th class="border border-gray-300 px-2 py-1">Description</th>
                                    <th class="border border-gray-300 px-2 py-1 text-right" style="width: 120px;">{{ tool.inLabel }}</th>
                                    <th class="border border-gray-300 px-2 py-1 text-right" style="width: 120px;">{{ tool.outLabel }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(line, index) in preview.lines" :key="index">
                                    <td class="border border-gray-300 px-2 py-1">{{ line.date }}</td>
                                    <td class="border border-gray-300 px-2 py-1">
                                        {{ line.description ?? '—' }}
                                        <span v-if="line.counterparty || line.reference" class="block text-xs text-gray-500">{{ [line.counterparty, line.reference].filter(Boolean).join(' · ') }}</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-1 text-right tabular-nums">{{ line.amount > 0 ? money(line.amount) : '' }}</td>
                                    <td class="border border-gray-300 px-2 py-1 text-right tabular-nums">{{ line.amount < 0 ? money(-line.amount) : '' }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p v-if="preview.lines_count > preview.lines.length" class="mt-1 text-xs text-gray-500">First {{ preview.lines.length }} of {{ preview.lines_count }} rows.</p>
                    </div>
                </template>

                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.note" label="Note" placeholder="e.g. November" :error="errors.note" />
                    <div>
                        <label class="mb-1 block text-sm font-medium text-gray-700">Received File (optional)</label>
                        <input ref="receivedInput" type="file" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" :class="fileClass">
                        <p class="mt-1 text-xs text-gray-500">Another copy to keep with the import, e.g. the bank's PDF when you imported the Excel template.</p>
                        <p v-if="errors.received_file" class="mt-1 text-sm text-red-600">{{ errors.received_file }}</p>
                    </div>
                </div>

                <Alert type="info" class="mt-4">
                    Each row is matched to a posting on the chosen account with the same amount within 7 days
                    (when several fit, the one named in the row wins). Rows with nothing in the app can be created from the next page,
                    then Refresh matches them. Rows imported before are skipped.
                </Alert>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl(tool.list)" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :loading="processing" :disabled="! preview">Import and reconcile</Button>
            </footer>
        </form>
    </AppLayout>
</template>
