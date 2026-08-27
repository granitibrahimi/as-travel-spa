<script setup>
import { onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';
import ReportDataTable from '../../../components/ReportDataTable.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/accounts-payable?date=d.m.Y&group_by=none|supplier|supplier_year
// — the supplier-side mirror of Accounts Receivable: every still-open supplier
// transaction as of `date`, rolled up by supplier, or by supplier and year
// (years laid out as columns). No customer-type-style filter. Both this and the
// /excel endpoint validate the same params.
// Response (data-unwrapped by useReport) is a self-describing table:
//   { as_of, group_by,
//     columns: [{ key, label, type: 'text'|'date'|'number'|'money' }],
//     header:  { <key>: label },
//     rows:    [{ <key>: value, … }],
//     footer:  { <key>: value, … } }   // grand-total row
// ReportDataTable renders any grouping off `columns` + `rows` + `footer`.
const { loading, error, errors, data, load } = useReport('/finance/reports/accounts-payable');
const notifications = useNotificationsStore();

const asOf = ref(todayApiDate());
const groupBy = ref('none');
const groupByOptions = [
    { value: 'none', label: 'Transactions List' },
    { value: 'supplier', label: 'Group by Supplier' },
    { value: 'supplier_year', label: 'Supplier and Year' },
];

const downloading = ref(false);

function filters() {
    return {
        date: asOf.value || undefined,
        group_by: groupBy.value,
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
        await downloadFile('/finance/reports/accounts-payable/excel', {
            fallbackName: 'accounts-payable.xlsx',
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
    <AppLayout title="Accounts Payable" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Accounts Payable</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-start gap-4">
                    <DateInput v-model="asOf" label="As of Date" :error="errors.date" />

                    <Select v-model="groupBy" :options="groupByOptions" label="View" :placeholder="null" class="min-w-[200px]" />

                    <div class="flex items-end gap-3 self-stretch pt-6">
                        <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                        <Button type="button" :loading="downloading" @click="downloadExcel">
                            {{ downloading ? 'Preparing…' : 'Download Excel' }}
                        </Button>
                    </div>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <Loader v-if="loading" />

                <template v-else>
                    <p class="mb-3 text-sm font-medium text-gray-700">As of {{ data.as_of }}</p>

                    <ReportDataTable
                        :columns="data.columns"
                        :rows="data.rows"
                        :footer="data.footer"
                        empty-text="No open transactions as of this date."
                    />
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
