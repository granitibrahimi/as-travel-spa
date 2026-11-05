<script setup>
import { computed, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import DatePicker from '../../../components/Form/DatePicker.vue';
import Loader from '../../../components/Loader.vue';
import { money } from '../../../helpers/money.js';
import { startOfMonthApiDate, todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/aqp-cutoff?customer_id=&from=d.m.Y&to=d.m.Y — one row
// per person on every invoice of the customer dated in the range:
// { data: { customer: { id, name }, columns: [{ key, label, type }],
//   rows: [{ id (order person), invoice_id, invoice_reference, invoice_date, description,
//   destination, fare, svc, total }], footer: { fare, svc, total } } }
// The /excel sibling takes the same params and renders the same table.
const { loading, error, errors, data, load } = useReport('/finance/reports/aqp-cutoff');
const notifications = useNotificationsStore();

const customerId = ref(null);
const from = ref(startOfMonthApiDate());
const to = ref(todayApiDate());

const downloading = ref(false);

const rows = computed(() => data.value?.rows ?? []);
const footer = computed(() => data.value?.footer ?? {});

function filters() {
    return {
        customer_id: customerId.value || undefined,
        from: from.value || undefined,
        to: to.value || undefined,
    };
}

function generate() {
    load(filters());
}

async function downloadExcel() {
    if (downloading.value) {
        return;
    }

    downloading.value = true;
    errors.value = {};

    try {
        await downloadFile('/finance/reports/aqp-cutoff/excel', {
            fallbackName: 'aqp-cutoff.xlsx',
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
</script>

<template>
    <AppLayout title="AQP CutOff Report" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">AQP CutOff Report</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <form class="flex flex-wrap items-end gap-3" @submit.prevent="generate">
                    <AsyncSelect
                        v-model="customerId"
                        url="customers/customers/autosuggest"
                        label="Customer"
                        placeholder="Search customers…"
                        :error="errors.customer_id"
                        class="min-w-[280px]"
                    />
                    <DatePicker v-model="from" label="From" :error="errors.from" />
                    <DatePicker v-model="to" label="To" :error="errors.to" />
                    <Button type="submit" variant="primary" :loading="loading">Generate</Button>
                    <Button type="button" :loading="downloading" @click="downloadExcel">
                        {{ downloading ? 'Preparing…' : 'Download Excel' }}
                    </Button>
                </form>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" :title="data.customer?.name ?? 'Results'" :collapsible="false">
                <Loader v-if="loading" />

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 90px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2">Destination</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Fare</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 100px;">SVC</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rows" :key="row.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ row.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.description }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.destination || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.fare) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.svc) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.total) }}</td>
                            </tr>
                            <tr v-if="rows.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No invoices for this customer in this range.</td>
                            </tr>
                            <tr v-if="rows.length > 0" class="bg-gray-50 font-semibold">
                                <td colspan="3" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(footer.fare) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(footer.svc) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(footer.total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
