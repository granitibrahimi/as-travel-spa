<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const bill = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-bills/${route.params.id}`);
    bill.value = data.data ?? data;
}
onMounted(load);
</script>

<template>
    <AppLayout :title="bill ? `Bill ${bill.gen_id}` : 'Bill'" fluid>
        <Loader v-if="! bill" />

        <template v-else>
            <FullWidthBox :title="`Bill ${bill.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Supplier</dt><dd>{{ bill.supplier.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ bill.reference ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Status</dt><dd>{{ bill.status ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Agent</dt><dd>{{ bill.agent ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ bill.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Due date</dt><dd>{{ bill.due_date ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(bill.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Paid</dt><dd class="tabular-nums">{{ money(bill.paid_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Open</dt><dd class="tabular-nums" :class="bill.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(bill.open_amount) }}</dd></div>
                    <div v-if="bill.customer_invoice" class="flex gap-2">
                        <dt class="w-36 shrink-0 font-medium text-gray-500">Customer invoice</dt>
                        <dd><RouterLink :to="`/customer-invoices/${bill.customer_invoice.id}`" class="text-red-600 hover:underline">{{ bill.customer_invoice.gen_id }}</RouterLink></dd>
                    </div>
                    <div class="flex gap-2 sm:col-span-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ bill.notes ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="`/suppliers/${bill.supplier.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to supplier</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="bill.lines.length" title="Line items" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Category</th>
                                <th class="py-2 pr-2">Description</th>
                                <th class="py-2 pr-2">Tax</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in bill.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.category ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.tax ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="bill.connected.length" title="Connected transactions" :collapsible="false">
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
                            <tr v-for="(link, i) in bill.connected" :key="i" class="border-b last:border-0">
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
