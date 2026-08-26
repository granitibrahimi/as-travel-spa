<script setup>
import { onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';
import { todayApiDate } from '../../../helpers/date.js';
import { money } from '../../../helpers/money.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /customers/invoices/report?from=d.m.Y&to=d.m.Y →
// { data: { items: [...], totals: { sales, purchase, svc } } }; useReport's
// castResource() unwraps the `data` envelope, so `data.value` here is
// `{ items, totals }`. Row field names (product/agent/tkt_nr/… through to
// ticket_type) are still a best guess from a screenshot of the expected
// data, not a confirmed item shape — adjust as needed once real rows come
// back.
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
            fallbackName: 'customer-invoices.xlsx',
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
    <AppLayout title="Customer Invoices Report" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Customer Invoices Report</h1>

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
                <Loader v-if="loading" />

                <template v-else>
                    <p class="mb-3 text-sm font-medium text-gray-700">
                        Sales: {{ money(data.totals?.sales) }}
                        <span class="mx-2 text-gray-300">|</span>
                        Purchase: {{ money(data.totals?.purchase) }}
                        <span class="mx-2 text-gray-300">|</span>
                        SVC: {{ money(data.totals?.svc) }}
                    </p>

                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="whitespace-nowrap text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">NR</th>
                                    <th class="border border-gray-300 px-2 py-2">Product</th>
                                    <th class="border border-gray-300 px-2 py-2">Agent</th>
                                    <th class="border border-gray-300 px-2 py-2">TKT NR</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">SVC incl</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Fare incl</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Payment</th>
                                    <th class="border border-gray-300 px-2 py-2">Name</th>
                                    <th class="border border-gray-300 px-2 py-2">Client</th>
                                    <th class="border border-gray-300 px-2 py-2">Date</th>
                                    <th class="border border-gray-300 px-2 py-2">FOP</th>
                                    <th class="border border-gray-300 px-2 py-2">Vendor</th>
                                    <th class="border border-gray-300 px-2 py-2">INV CODE</th>
                                    <th class="border border-gray-300 px-2 py-2">Destination</th>
                                    <th class="border border-gray-300 px-2 py-2">Departure Date</th>
                                    <th class="border border-gray-300 px-2 py-2">Arrival Date</th>
                                    <th class="border border-gray-300 px-2 py-2 text-right">Staying nights</th>
                                    <th class="border border-gray-300 px-2 py-2">Comment</th>
                                    <th class="border border-gray-300 px-2 py-2">Parent Destination</th>
                                    <th class="border border-gray-300 px-2 py-2">Client Type</th>
                                    <th class="border border-gray-300 px-2 py-2">Ticket/Arrangement</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, i) in data.items ?? []" :key="i" class="whitespace-nowrap hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2 text-center">{{ i + 1 }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.product }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.agent }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.tkt_nr }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.amount) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.svc_incl) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.fare_incl) }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.payment) }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.name }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.client }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.date }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.fop }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.vendor }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.inv_code }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.destination }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.departure_date }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.arrival_date }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.staying_nights }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.comment }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.parent_destination }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.client_type }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ row.ticket_type }}</td>
                                </tr>
                                <tr v-if="! (data.items ?? []).length">
                                    <td colspan="21" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No data for this range.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
