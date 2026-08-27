<script setup>
import { computed, onMounted, ref } from 'vue';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Loader from '../../../components/Loader.vue';
import { money } from '../../../helpers/money.js';
import { startOfMonthApiDate, todayApiDate } from '../../../helpers/date.js';
import { useReport } from '../../../composables/useReport.js';
import { downloadFile } from '../../../helpers/download.js';
import { useNotificationsStore } from '../../../stores/notifications.js';

// GET /finance/reports/purchases-book?from=d.m.Y&to=d.m.Y — no `group` param
// (unlike the sales book; suppliers have no private/company split). Both
// this and the excel endpoint validate from/to — useReport surfaces that as
// field-level `errors` (from.errors, to.errors) shown under the inputs.
// Response shape: { data: { items: [
//   { nr, date, gen_id, customer, unique_nr, vat_nr, price } ] } } — supplier
// bills (positive price) and supplier credit notes (negative), merged; no
// server-side total, so it's summed client-side below.
const { loading, error, errors, data, load } = useReport('/finance/reports/purchases-book');
const notifications = useNotificationsStore();

const from = ref(startOfMonthApiDate());
const to = ref(todayApiDate());

const downloading = ref(false);

const items = computed(() => data.value?.items ?? []);
const total = computed(() => items.value.reduce((sum, row) => sum + Number(row.price ?? 0), 0));

function filters() {
    return {
        from: from.value || undefined,
        to: to.value || undefined,
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
        await downloadFile('/finance/reports/purchases-book/excel', {
            fallbackName: 'purchases-book.xlsx',
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
    <AppLayout title="Purchases Book" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Purchases Book <span class="text-gray-400">(Libri i Blerjeve)</span></h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="flex flex-wrap items-end gap-3">
                    <DateInput v-model="from" label="From" :error="errors.from" />
                    <DateInput v-model="to" label="To" :error="errors.to" />
                    <Button type="button" variant="primary" :loading="loading" @click="preview">Preview</Button>
                    <Button type="button" :loading="downloading" @click="downloadExcel">
                        {{ downloading ? 'Preparing…' : 'Download Excel' }}
                    </Button>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" title="Results" :collapsible="false">
                <Loader v-if="loading" />

                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 130px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Supplier</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Unique Nr</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">VAT Nr</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, i) in items" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ row.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">{{ row.gen_id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.unique_nr || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.vat_nr || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.price) }}</td>
                            </tr>
                            <tr v-if="items.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No data for this range.</td>
                            </tr>
                            <tr v-if="items.length > 0" class="bg-gray-50 font-semibold">
                                <td colspan="5" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(total) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
