<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const payment = ref(null);

async function load() {
    const { data } = await api.get(`/customer-payments/${route.params.id}`);
    payment.value = data.data ?? data;
}
onMounted(load);
</script>

<template>
    <AppLayout :title="payment ? `Payment ${payment.gen_id}` : 'Payment'" fluid>
        <Loader v-if="! payment" />

        <template v-else>
            <FullWidthBox :title="`Payment ${payment.gen_id}`" :collapsible="false" class="mb-6">
                <CustomerDetails :customer="payment.customer" />


                <template #footer>
                    <RouterLink :to="`/customers/${payment.customer.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="payment.connected.length" title="Connected transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in payment.connected" :key="i" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ link.type }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ link.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                            <tr class="border-b last:border-0">
                                <th class="border border-gray-300 text-right px-2 py-2" colspan="2">Total</th>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.links_amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
