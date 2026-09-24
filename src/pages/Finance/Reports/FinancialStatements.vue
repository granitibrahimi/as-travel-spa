<script setup>
import { computed, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';
import { money } from '../../../helpers/money.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/financial-statements?year_end=d.m.Y
//   { meta: { company, year_end, compare_year_end, sources: { current, compare }, checks_passed },
//     sheets: { BS, IS, EQ, CF, 5 … 18, TB, Checks } }
// Every sheet is a table { title, subtitle, columns: [{ label, type: text|money }],
// rows: [{ cells, kind: header|line|subtotal|total|blank }] } — the same tables
// the Excel download lays out one per sheet. A closed year's figures come from
// the trial balance stored at its closing ("stored"), an open year's are live.
const { loading, error, errors, data, load } = useReport('/finance/reports/financial-statements');
const notifications = useNotificationsStore();

const yearEnd = ref(`31.12.${new Date().getFullYear() - 1}`);
const activeSheet = ref('BS');
const downloading = ref(false);

const sheetNames = computed(() => Object.keys(data.value?.sheets ?? {}));
const sheet = computed(() => data.value?.sheets?.[activeSheet.value] ?? null);

const failedChecks = computed(() => (data.value?.sheets?.Checks?.rows ?? []).filter((row) => row.cells[2] !== 'OK').length);

function sheetLabel(name) {
    return /^\d+$/.test(name) ? `Note ${name}` : name;
}

function preview() {
    load({ year_end: yearEnd.value || undefined });
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    errors.value = {};

    try {
        await downloadFile('/finance/reports/financial-statements/excel', {
            fallbackName: 'financial-statements.xlsx',
            config: { params: { year_end: yearEnd.value || undefined } },
        });
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
            notifications.push({ type: 'error', message: e.response.data.message ?? 'Please fix the errors below.' });
        } else {
            notifications.push({ type: 'error', message: 'Could not export the financial statements.' });
        }
    } finally {
        downloading.value = false;
    }
}

function rowClass(kind) {
    return {
        header: 'bg-gray-50 font-semibold italic text-gray-700',
        subtotal: 'font-semibold',
        total: 'bg-gray-50 font-bold',
    }[kind] ?? '';
}

function cell(value, column) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    return column?.type === 'money' && typeof value === 'number' ? money(value) : value;
}

function sourceLabel(source) {
    return source === 'stored' ? 'closed — stored trial balance' : 'open — live from the ledger';
}
</script>

<template>
    <AppLayout title="Financial Statements" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Financial Statements</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-start gap-4">
                    <DateInput v-model="yearEnd" label="Year end" :error="errors.year_end" />

                    <div class="flex items-end gap-3 self-stretch pt-6">
                        <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                        <Button type="button" :loading="downloading" @click="downloadExcel">
                            {{ downloading ? 'Preparing…' : 'Download Excel' }}
                        </Button>
                    </div>
                </div>
                <p class="mt-3 text-xs text-gray-500">
                    Balance Sheet, Income Statement, changes in equity, cash flow, notes 5–18 and the trial balance, with the prior year as comparative.
                </p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data || loading" :collapsible="false">
                <Loader v-if="loading" />

                <template v-else>
                    <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
                        <span class="font-medium text-gray-700">{{ data.meta.company }}</span>
                        <span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{{ data.meta.year_end }}: {{ sourceLabel(data.meta.sources.current) }}</span>
                        <span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{{ data.meta.compare_year_end }}: {{ sourceLabel(data.meta.sources.compare) }}</span>
                        <button
                            type="button"
                            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            :class="data.meta.checks_passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'"
                            @click="activeSheet = 'Checks'"
                        >
                            {{ data.meta.checks_passed ? 'All checks passed' : `${failedChecks} check(s) to review` }}
                        </button>
                    </div>

                    <div class="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
                        <button
                            v-for="name in sheetNames"
                            :key="name"
                            type="button"
                            class="-mb-px rounded-t border px-3 py-1.5 text-sm"
                            :class="activeSheet === name
                                ? 'border-gray-200 border-b-white bg-white font-semibold text-red-700'
                                : 'border-transparent text-gray-600 hover:text-gray-900'"
                            @click="activeSheet = name"
                        >{{ sheetLabel(name) }}</button>
                    </div>

                    <div v-if="sheet">
                        <h2 class="text-lg font-semibold">{{ sheet.title }}</h2>
                        <p v-if="sheet.subtitle" class="mb-3 text-sm italic text-gray-500">{{ sheet.subtitle }}</p>

                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse border border-gray-300 text-sm">
                                <thead>
                                    <tr class="text-left text-xs uppercase text-gray-500">
                                        <th
                                            v-for="(column, index) in sheet.columns"
                                            :key="index"
                                            class="border border-gray-300 px-2 py-2"
                                            :class="column.type === 'money' ? 'text-right' : ''"
                                            :style="column.type === 'money' ? 'width: 150px;' : ''"
                                        >{{ column.label }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(row, rowIndex) in sheet.rows" :key="rowIndex" :class="rowClass(row.kind)">
                                        <template v-if="row.kind === 'blank'">
                                            <td :colspan="sheet.columns.length" class="border-x border-gray-300 py-1.5"></td>
                                        </template>
                                        <template v-else>
                                            <td
                                                v-for="(column, index) in sheet.columns"
                                                :key="index"
                                                class="border border-gray-300 px-2 py-1.5"
                                                :class="[
                                                    column.type === 'money' ? 'text-right tabular-nums' : '',
                                                    typeof row.cells[index] === 'number' && row.cells[index] < 0 ? 'text-red-700' : '',
                                                    activeSheet === 'Checks' && index === 2 ? (row.cells[2] === 'OK' ? 'text-green-700' : 'font-semibold text-amber-700') : '',
                                                ]"
                                            >{{ cell(row.cells[index], column) }}</td>
                                        </template>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
