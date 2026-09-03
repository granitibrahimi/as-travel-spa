<script setup>
import { onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import CustomerInvoicesReport from '../../../components/CustomerInvoicesReport.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// CRM agent view of the customer-invoices report. Hits the same endpoints as
// the Finance report (GET /customers/invoices/report[/excel]); the backend
// scopes the rows to the current agent when they only hold
// `customerInvoices.reportsOwn`. Table + client-side search are the shared
// CustomerInvoicesReport component.
const { loading, error, data, load } = useReport('/customers/invoices/report');
const notifications = useNotificationsStore();

const from = ref(todayApiDate());
const to = ref(todayApiDate());
const downloading = ref(false);

function filters() {
    return {
        from: from.value || undefined,
        to: to.value || undefined,
    };
}

function apply() {
    load(filters());
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }
    downloading.value = true;

    try {
        await downloadFile('/customers/invoices/report/excel', {
            fallbackName: 'my-customer-invoices.xlsx',
            config: { params: filters() },
        });
    } catch {
        notifications.push({ type: 'error', message: 'Could not export the report.' });
    } finally {
        downloading.value = false;
    }
}

onMounted(apply);
</script>

<template>
    <AppLayout title="My Invoices Report" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">My Invoices Report</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-end gap-3">
                    <DateInput v-model="from" label="From" />
                    <DateInput v-model="to" label="To" />
                    <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                    <Button type="button" :loading="downloading" @click="downloadExcel">
                        {{ downloading ? 'Preparing…' : 'Download Excel' }}
                    </Button>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <CustomerInvoicesReport :data="data" :loading="loading" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
