<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import ReportDataTable from '../../../components/ReportDataTable.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useFormOptionsStore } from '../../../stores/formOptions.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/accounts-receivable?date=d.m.Y&customer_types[]=…&group_by=none|customer|customer_year
// — every still-open customer transaction as of `date`, optionally narrowed to
// one or more customer types and rolled up. Both this and the /excel endpoint
// validate the same params; useReport surfaces a 422 as field-level `errors`.
// Response (data-unwrapped by useReport) is a self-describing table:
//   { as_of, group_by,
//     columns: [{ key, label, type: 'text'|'date'|'number'|'money' }],
//     header:  { <key>: label },
//     rows:    [{ <key>: value, … }],
//     footer:  { <key>: value, … } }   // grand-total row
// The column set depends on the grouping (flat list / one row per customer /
// one row per customer with a money column per year); ReportDataTable renders any
// of them off `columns` + `rows` + `footer`.
const { loading, error, errors, data, load } = useReport('/finance/reports/accounts-receivable');
const formOptions = useFormOptionsStore();
const notifications = useNotificationsStore();

// Fixed CustomerTypeEnum values (Company=1, Private=2, Agency=3, AQP=5), used
// until the shared customer-types form options have synced in.
const FALLBACK_TYPES = [
    { value: 1, label: 'Company' },
    { value: 2, label: 'Private' },
    { value: 3, label: 'Agency' },
    { value: 5, label: 'AQP' },
];

const typeOptions = computed(() => {
    const types = formOptions.customerTypes;

    if (! types.length) {
        return FALLBACK_TYPES;
    }

    return types.map((type) => ({ value: type.value ?? type.id, label: type.label ?? type.name }));
});

const asOf = ref(todayApiDate());
// Every customer type is checked by default; re-seed once if the shared
// form-options list syncs in after mount (but never stomp a user edit).
const selectedTypes = ref(typeOptions.value.map((type) => type.value));
let typesTouched = false;
watch(typeOptions, (options) => {
    if (! typesTouched) {
        selectedTypes.value = options.map((type) => type.value);
    }
});

const groupBy = ref('none');
const groupByOptions = [
    { value: 'none', label: 'Transactions List' },
    { value: 'customer', label: 'Group by Customer' },
    { value: 'customer_year', label: 'Customer and Year' },
];

const downloading = ref(false);

function toggleType(value) {
    typesTouched = true;
    const next = new Set(selectedTypes.value);
    next.has(value) ? next.delete(value) : next.add(value);
    selectedTypes.value = [...next];
}

function filters() {
    return {
        date: asOf.value || undefined,
        customer_types: selectedTypes.value.length ? selectedTypes.value : undefined,
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
        await downloadFile('/finance/reports/accounts-receivable/excel', {
            fallbackName: 'accounts-receivable.xlsx',
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
    <AppLayout title="Accounts Receivable" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Accounts Receivable</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-start gap-4">
                    <DateInput v-model="asOf" label="As of Date" :error="errors.date" />

                    <div>
                        <span class="mb-1 block text-sm font-medium text-gray-700">Customer types</span>
                        <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                            <NiceCheckbox
                                v-for="type in typeOptions"
                                :key="type.value"
                                :model-value="selectedTypes.includes(type.value)"
                                :label="type.label"
                                @update:model-value="toggleType(type.value)"
                            />
                        </div>
                        <p v-if="errors.customer_types" class="mt-1 text-xs text-red-600">{{ errors.customer_types }}</p>
                    </div>

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
