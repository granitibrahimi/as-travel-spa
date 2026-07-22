<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';

const route = useRoute();
const payment = ref(null);

const connectedTotal = computed(() =>
    (payment.value?.connected ?? []).reduce((sum, link) => sum + Number(link.amount ?? 0), 0),
);

onMounted(async () => {
    const { data } = await api.get(`/customers/payments/${route.params.id}`);
    payment.value = castResource(data);
});
</script>

<template>
    <AppLayout :title="payment ? `Payment ${payment.gen_id}` : 'Payment'" fluid>
        <Loader v-if="! payment" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="payment.customer" />

                <FullWidthBox title="Payment details" :collapsible="false">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">GEN ID</th>
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ payment.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(payment.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(payment.open_amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Payment method</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Transaction #</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.transaction_nr ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.reference ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ payment.user?.name ?? '—' }}
                                    <br>
                                    <span class="text-gray-500">{{ payment.created_at }}</span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="border border-gray-300 px-2 py-2">
                                    <p class="pb-2 font-bold text-gray-600">Notes:</p>
                                    {{ payment.notes ?? '—' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="payment.connected.length" title="Connected transactions" :collapsible="false" class="mt-6">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-gray-500">
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Type</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="link in payment.connected" :key="link.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">{{ link.type }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ link.reference }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-right" colspan="2">Total</th>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium tabular-nums">{{ money(connectedTotal) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
