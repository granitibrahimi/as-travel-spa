<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const refund = ref(null);

async function load() {
    const { data } = await api.get(`/customer-refunds/${route.params.id}`);
    refund.value = data.data ?? data;
}
onMounted(load);
</script>

<template>
    <AppLayout :title="refund ? `Reimbursement ${refund.gen_id}` : 'Reimbursement'" fluid>
        <Loader v-if="! refund" />

        <template v-else>
            <FullWidthBox :title="`Reimbursement ${refund.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ refund.customer.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ refund.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(refund.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums" :class="refund.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(refund.open_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Method</dt><dd>{{ refund.payment_method ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Transaction nr</dt><dd>{{ refund.transaction_nr ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Created</dt><dd>{{ refund.agent ?? '—' }} · {{ refund.created_at ?? '—' }}</dd></div>
                    <div class="flex gap-2 sm:col-span-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ refund.notes ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="`/customers/${refund.customer.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="refund.connected.length" title="Connected transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Reference</th>
                                <th class="py-2 pr-2">Date</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in refund.connected" :key="i" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ link.reference }}</td>
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
