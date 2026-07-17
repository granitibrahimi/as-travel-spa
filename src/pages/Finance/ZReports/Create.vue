<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';

const router = useRouter();

const form = reactive({
    report_id: '',
    date: '',
    notes: '',
    included: [],
});
const errors = ref({});
const processing = ref(false);

const sales = ref([]);
const loadingSales = ref(false);
const dateFilter = ref('');

// Load the day's aggregated sales (and the suggested report id) from the
// platform preview endpoint, then default to including every sale.
async function loadSales(date) {
    loadingSales.value = true;

    try {
        const { data } = await api.get('/z-reports/sales-for-date', { params: { date: date || undefined } });
        sales.value = data.sales ?? [];
        form.included = sales.value.map((sale) => sale.id);

        if (data.date) {
            dateFilter.value = data.date;
            form.date = data.date;
        }

        if (! form.report_id && data.report_id) {
            form.report_id = data.report_id;
        }
    } finally {
        loadingSales.value = false;
    }
}

onMounted(() => loadSales());

// Changing the date refetches that day's sales without leaving the page.
watch(dateFilter, (value) => {
    if (value && value !== form.date) {
        form.date = value;
        loadSales(value);
    }
});

const includedSet = computed(() => new Set(form.included));
const amount = computed(() => sales.value.filter((s) => includedSet.value.has(s.id)).reduce((sum, s) => sum + s.amount, 0));
const difference = computed(() => sales.value.filter((s) => !includedSet.value.has(s.id)).reduce((sum, s) => sum + s.amount, 0));

const allSelected = computed(() => sales.value.length > 0 && form.included.length === sales.value.length);

function toggleAll(checked) {
    form.included = checked ? sales.value.map((s) => s.id) : [];
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        const { data } = await api.post('/z-reports', form);
        router.push(`/z-reports/${data.id}`);
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="New Z-Report">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Z-Report" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputText v-model="form.report_id" label="Report ID *" :error="errors.report_id" />
                    <DateInput v-model="dateFilter" label="Date *" :error="errors.date" />
                    <InputText v-model="form.notes" label="Notes" :error="errors.notes" />
                </div>

                <div class="mt-4 flex items-center gap-6 text-sm">
                    <span class="text-gray-500">Included <span class="font-semibold tabular-nums text-green-700">{{ money(amount) }}</span></span>
                    <span class="text-gray-500">Excluded <span class="font-semibold tabular-nums text-gray-800">{{ money(difference) }}</span></span>
                </div>
            </FullWidthBox>

            <FullWidthBox :title="`Cash sales on ${dateFilter}`" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 50px;">
                                    <input type="checkbox" :checked="allSelected" @change="toggleAll($event.target.checked)">
                                </th>
                                <th class="border border-gray-300 px-2 py-2">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loadingSales">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">Loading…</td>
                            </tr>
                            <tr v-else-if="sales.length === 0">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No cash sales for this date.</td>
                            </tr>
                            <tr v-for="sale in (loadingSales ? [] : sales)" :key="sale.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <input v-model="form.included" type="checkbox" :value="sale.id">
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ sale.gen_id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ sale.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(sale.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/z-reports" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create Z-Report' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
