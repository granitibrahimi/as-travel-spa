<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { money } from '../../../helpers/money.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputNumber from '../../../components/Form/InputNumber.vue';

// Step 1 of the BSP bill sync: upload the settlement statement (Excel) plus the
// amount actually deposited, then review how it matches the open BSP bills and
// credit notes. A full match unlocks the "Pay & Reconcile" step.

const form = ref({ amount: null });
const fileName = ref('');
const fileInput = ref(null);

const preview = ref(null);
const processing = ref(false);
const errors = ref({});
const error = ref('');

const billRows = computed(() => Object.entries(preview.value?.bills ?? {})
    .map(([reference, row]) => ({ reference, ...row })));
const creditRows = computed(() => Object.entries(preview.value?.credits ?? {})
    .map(([reference, row]) => ({ reference, ...row })));

function onFilePicked(event) {
    fileName.value = event.target.files?.[0]?.name ?? '';
}

function reset() {
    preview.value = null;
    form.value = { amount: null };
    fileName.value = '';
    errors.value = {};
    error.value = '';

    if (fileInput.value) {
        fileInput.value.value = '';
    }
}

async function uploadPreview() {
    const file = fileInput.value?.files?.[0];

    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};
    error.value = '';

    try {
        const payload = new FormData();
        payload.append('amount', form.value.amount ?? '');
        payload.append('file', file ?? '');

        const { data } = await api.post('/finance/bsp-sync/preview', payload);
        preview.value = castResource(data);
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            error.value = e.response?.data?.message ?? 'Could not process the BSP statement.';
        }
    } finally {
        processing.value = false;
    }
}

async function refresh() {
    if (! preview.value?.hash || processing.value) {
        return;
    }

    processing.value = true;
    error.value = '';

    try {
        const { data } = await api.get(`/finance/bsp-sync/preview/${preview.value.hash}`);
        preview.value = castResource(data);
    } catch (e) {
        error.value = e.response?.status === 404
            ? 'This BSP statement is no longer cached. Please upload it again.'
            : (e.response?.data?.message ?? 'Could not refresh the match.');
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="BSP Sync" fluid>
        <div class="space-y-6">
            <p v-if="error" class="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-if="! preview" title="Upload BSP statement" :collapsible="false">
                <form class="space-y-4" @submit.prevent="uploadPreview">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InputNumber v-model="form.amount" label="Deposited amount *" :error="errors.amount" />
                        <div>
                            <label class="mb-1 block text-sm text-gray-600">BSP statement (Excel) *</label>
                            <input
                                ref="fileInput"
                                type="file"
                                accept=".xls,.xlsx"
                                class="block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-50"
                                @change="onFilePicked"
                            >
                            <p v-if="errors.file" class="mt-1 text-sm text-red-600">{{ errors.file }}</p>
                        </div>
                    </div>

                    <div class="flex justify-end">
                        <Button type="submit" variant="primary" :loading="processing" :disabled="processing">
                            {{ processing ? 'Processing…' : 'Match statement' }}
                        </Button>
                    </div>
                </form>
            </FullWidthBox>

            <template v-else>
                <FullWidthBox title="Summary" :collapsible="false">
                    <div class="mb-4 flex flex-wrap items-center gap-3">
                        <span
                            class="rounded px-2 py-0.5 text-xs font-medium"
                            :class="preview.amountMatched ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                        >
                            {{ preview.amountMatched ? 'Amounts match' : 'Amounts do not match' }}
                        </span>
                        <span
                            class="rounded px-2 py-0.5 text-xs font-medium"
                            :class="preview.fullMatch ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                        >
                            {{ preview.fullMatch ? 'Full match' : 'Not a full match' }}
                        </span>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Source</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Bills</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Credit notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-2">BSP statement</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(preview.expectedAmount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ billRows.length }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ creditRows.length }}</td>
                                </tr>
                                <tr>
                                    <td class="border border-gray-300 px-2 py-2">Matched in AS</td>
                                    <td
                                        class="border border-gray-300 px-2 py-2 text-right tabular-nums"
                                        :class="preview.amountMatched ? 'bg-green-50' : 'bg-amber-50'"
                                    >{{ money(preview.amount) }}</td>
                                    <td
                                        class="border border-gray-300 px-2 py-2 text-right tabular-nums"
                                        :class="preview.matchedBills === billRows.length ? 'bg-green-50' : 'bg-amber-50'"
                                    >{{ preview.matchedBills }}</td>
                                    <td
                                        class="border border-gray-300 px-2 py-2 text-right tabular-nums"
                                        :class="preview.matchedCredits === creditRows.length ? 'bg-green-50' : 'bg-amber-50'"
                                    >{{ preview.matchedCredits }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
                        <Button type="button" size="sm" :disabled="processing" @click="reset">New file</Button>
                        <Button type="button" size="sm" :loading="processing" :disabled="processing" @click="refresh">Refresh</Button>
                        <Button
                            v-if="preview.fullMatch"
                            :href="routeUrl('bspSync.pay', preview.hash)"
                            variant="primary"
                            size="sm"
                        >Pay &amp; Reconcile</Button>
                    </div>
                </FullWidthBox>

                <FullWidthBox title="Statement lines" :collapsible="false">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Type</th>
                                    <th class="border border-gray-300 px-2 py-2">Reference</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Statement amount</th>
                                    <th class="border border-gray-300 px-2 py-2">Matched record</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Record amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="row in billRows"
                                    :key="`bill-${row.reference}`"
                                    :class="row.found && row.amountMatched ? 'bg-green-50' : 'bg-amber-50'"
                                >
                                    <td class="border border-gray-300 px-2 py-2">Bill</td>
                                    <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.reference }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2">
                                        <RouterLink
                                            v-if="row.found"
                                            :to="routeUrl('supplierBills.show', row.foundId)"
                                            class="text-blue-600 hover:underline"
                                            target="_blank"
                                        >#{{ row.foundId }}</RouterLink>
                                        <span v-else class="text-gray-400">Not found</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                        {{ row.found ? money(row.foundAmount) : '—' }}
                                    </td>
                                </tr>
                                <tr
                                    v-for="row in creditRows"
                                    :key="`credit-${row.reference}`"
                                    :class="row.found && row.amountMatched ? 'bg-green-50' : 'bg-amber-50'"
                                >
                                    <td class="border border-gray-300 px-2 py-2">Credit note</td>
                                    <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.reference }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2">
                                        <RouterLink
                                            v-if="row.found"
                                            :to="routeUrl('supplierCreditNotes.show', row.foundId)"
                                            class="text-blue-600 hover:underline"
                                            target="_blank"
                                        >#{{ row.foundId }}</RouterLink>
                                        <span v-else class="text-gray-400">Not found</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                        {{ row.found ? money(row.foundAmount) : '—' }}
                                    </td>
                                </tr>
                                <tr v-if="billRows.length === 0 && creditRows.length === 0">
                                    <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">
                                        No usable lines in the statement.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </template>
        </div>
    </AppLayout>
</template>
