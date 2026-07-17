<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const overview = ref(null);

onMounted(async () => {
    const { data } = await api.get('/departures/overview');
    overview.value = data.data;
});

const weeks = [
    { key: 'this_week', label: 'This week' },
    { key: 'next_week', label: 'Next week' },
];
</script>

<template>
    <AppLayout title="Departure Info" fluid>
        <Loader v-if="! overview" />

        <div v-else class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <FullWidthBox
                v-for="week in weeks"
                :key="week.key"
                :title="`${week.label} ${overview[week.key].from} - ${overview[week.key].to}`"
                :collapsible="false"
            >
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Start date</th>
                                <th class="border border-gray-300 px-2 py-2">Destination</th>
                                <th class="border border-gray-300 px-2 py-2">Client</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="overview[week.key].departures.length === 0">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No departures.</td>
                            </tr>
                            <tr v-for="departure in overview[week.key].departures" :key="`${departure.invoice_id}-${departure.start_date}`" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="`/customer-invoices/${departure.invoice_id}`" class="text-red-700 hover:underline">{{ departure.invoice_gen_id }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">{{ departure.start_date }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.destination }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.customer }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
