<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import { todayApiDate, apiDaysAfter } from '../../../helpers/date';
import Loader from '../../../components/Loader.vue';

const filters = reactive({
    from: todayApiDate(),
    to: apiDaysAfter(30),
    q: '',
});

const departures = ref(null);
const loading = ref(false);

let request = null;

async function fetchDepartures() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/departures', {
            signal: controller.signal,
            params: {
                from: filters.from || undefined,
                to: filters.to || undefined,
                q: filters.q || undefined,
            },
        });
        departures.value = data.data;
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(fetchDepartures);
</script>

<template>
    <AppLayout title="Departures" fluid>
        <div class="space-y-6">
            <FullWidthBox title="Filters" :collapsible="false">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="fetchDepartures">
                    <DateInput v-model="filters.from" label="From date" />
                    <DateInput v-model="filters.to" label="To date" />
                    <InputText v-model="filters.q" label="Name" placeholder="Customer name…" />
                    <div class="flex items-end gap-2">
                        <Button type="submit" variant="primary">View report</Button>
                    </div>
                </form>
            </FullWidthBox>

            <FullWidthBox title="Departures" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Start date</th>
                                <th class="border border-gray-300 px-2 py-2">Destination</th>
                                <th class="border border-gray-300 px-2 py-2">Client</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 180px;">Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! departures">
                                <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="departures.length === 0">
                                <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No departures found.</td>
                            </tr>
                            <tr v-for="departure in (loading ? [] : departures ?? [])" :key="`${departure.invoice_id}-${departure.start_date}`" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="routeUrl('customerInvoices.show', departure.invoice_id)" class="text-red-700 hover:underline">{{ departure.invoice_gen_id }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 font-medium whitespace-nowrap">{{ departure.start_date }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.destination }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ departure.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ departure.agent }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
