<script setup>
import { onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import TrialBalanceTable from '../../../components/TrialBalanceTable.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/trial-balance?date_from=d.m.Y&date_to=d.m.Y[&compare_date=d.m.Y][&include_zeros=1]
// Generated live from the ledger for any period (e.g. mid-year) — never saved.
// A closed fiscal year's frozen trial balance lives under Fiscal Years.
const { loading, error, errors, data, load } = useReport('/finance/reports/trial-balance');
const notifications = useNotificationsStore();

const dateFrom = ref(`01.01.${new Date().getFullYear()}`);
const dateTo = ref(todayApiDate());
const compareDate = ref('');
const includeZeros = ref(false);
const downloading = ref(false);

function filters() {
    return {
        date_from: dateFrom.value || undefined,
        date_to: dateTo.value || undefined,
        compare_date: compareDate.value || undefined,
        include_zeros: includeZeros.value ? 1 : undefined,
    };
}

function preview() {
    load(filters());
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    errors.value = {};

    try {
        await downloadFile('/finance/reports/trial-balance/excel', {
            fallbackName: 'trial-balance.xlsx',
            config: { params: filters() },
        });
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
            notifications.push({ type: 'error', message: e.response.data.message ?? 'Please fix the errors below.' });
        } else {
            notifications.push({ type: 'error', message: 'Could not export the report.' });
        }
    } finally {
        downloading.value = false;
    }
}

onMounted(preview);
</script>

<template>
    <AppLayout title="Trial Balance" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Trial Balance</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-start gap-4">
                    <DateInput v-model="dateFrom" label="From" :error="errors.date_from" />
                    <DateInput v-model="dateTo" label="To" :error="errors.date_to" />
                    <DateInput v-model="compareDate" label="Compare to (optional)" :error="errors.compare_date" />

                    <div class="self-stretch pt-6">
                        <NiceCheckbox v-model="includeZeros" label="Include zero balances" />
                    </div>

                    <div class="flex items-end gap-3 self-stretch pt-6">
                        <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                        <Button type="button" :loading="downloading" @click="downloadExcel">
                            {{ downloading ? 'Preparing…' : 'Download Excel' }}
                        </Button>
                    </div>
                </div>
                <p class="mt-3 text-xs text-gray-500">
                    Generated live from the ledger and not saved. Income and expense accounts start from the fiscal year that contains "To".
                </p>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <Loader v-if="loading" />
                <TrialBalanceTable v-else :report="data" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
