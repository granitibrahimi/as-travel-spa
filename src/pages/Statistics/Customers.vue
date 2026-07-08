<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import Loader from '../../components/Loader.vue';
import { useReport } from '../../composables/useReport.js';
import { useFormOptionsStore } from '../../stores/formOptions.js';

const { loading, error, data, load } = useReport('/statistics/customers');

const formOptions = useFormOptionsStore();

// Fixed CustomerTypeEnum values (Company=1, Private=2, Agency=3, AQP=5), used
// until the shared customer-types form options have synced in.
const FALLBACK_TYPES = [
    { value: 1, label: 'Company' },
    { value: 2, label: 'Private' },
    { value: 3, label: 'Agency' },
    { value: 5, label: 'AQP' },
];

// Customer types (incl. their colors) come from the shared form-options store.
const typeOptions = computed(() => {
    const types = formOptions.customerTypes;

    if (! types.length) {
        return FALLBACK_TYPES;
    }

    return types.map((type) => ({
        value: type.value ?? type.id,
        label: type.label ?? type.name,
        color: type.color,
    }));
});

function isoMonthsAgo(months) {
    const date = new Date();
    date.setMonth(date.getMonth() - months, 1);

    return date.toISOString().slice(0, 10);
}

const from = ref(isoMonthsAgo(12));
const to = ref(new Date().toISOString().slice(0, 10));
const type = ref(null);

function apply() {
    load({
        from: from.value || undefined,
        to: to.value || undefined,
        type: type.value || undefined,
    });
}

onMounted(apply);
</script>

<template>
    <AppLayout title="Customers Report" fluid>
        <div class="space-y-4">
            <h1 class="text-2xl font-bold">Customers</h1>

            <FullWidthBox title="Filters" :collapsible="false">
                <div class="space-y-3">
                    <div class="flex flex-wrap items-end gap-3">
                        <InputText v-model="from" type="date" label="From" />
                        <InputText v-model="to" type="date" label="To" />
                        <Select v-model="type" :options="typeOptions" label="Type" placeholder="All types" class="min-w-[180px]" />
                        <Button type="button" variant="primary" :loading="loading" @click="apply">Apply</Button>
                    </div>
                </div>
            </FullWidthBox>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <FullWidthBox v-else-if="data" :title="`Top customers ${data.from} – ${data.to}`" :collapsible="false">
                <Loader v-if="loading" />
                <div class="overflow-x-auto" v-if="! loading && data.rows.length">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">SVC</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Invoices</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Credit Notes</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Payments</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Gift Cards</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Refunds</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Journals</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in data.rows" :key="row.customer_id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="`/customers/${row.customer_id}`" class="text-red-600 hover:underline">{{ row.customer_id }} | {{ row.customer }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ row.type }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.amount }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.svc }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.invoices_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.credit_notes_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.payments_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.gift_cards_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.refunds_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ row.journals_count }}</td>
                            </tr>
                            <tr v-if="! data.rows.length">
                                <td colspan="10" class="border border-gray-300 px-2 py-6 text-center text-gray-400">No data for this range.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
