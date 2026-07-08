<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

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
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ payment.customer.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ payment.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(payment.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums" :class="payment.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(payment.open_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Method</dt><dd>{{ payment.payment_method ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Transaction nr</dt><dd>{{ payment.transaction_nr ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ payment.reference ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Created</dt><dd>{{ payment.agent ?? '—' }} · {{ payment.created_at ?? '—' }}</dd></div>
                    <div v-if="payment.approved.at" class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Approved</dt><dd>{{ payment.approved.by ?? '—' }} · {{ payment.approved.at }}</dd></div>
                    <div class="flex gap-2 sm:col-span-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ payment.notes ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="`/customers/${payment.customer.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="payment.connected.length" title="Connected transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Type</th>
                                <th class="py-2 pr-2">Date</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in payment.connected" :key="i" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ link.type }}</td>
                                <td class="py-2 pr-2">{{ link.date }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
