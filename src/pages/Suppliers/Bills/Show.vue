<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const bill = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-bills/${route.params.id}`);
    bill.value = castResource(data);
}
onMounted(load);
</script>

<template>
    <AppLayout :title="bill ? `Bill ${bill.gen_id}` : 'Bill'" fluid>
        <Loader v-if="! bill" />

        <template v-else>
            <FullWidthBox :title="`Bill ${bill.gen_id}`" :collapsible="false" class="mb-6">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Supplier</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.supplier.name ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.reference ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Status</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.status ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Agent</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.agent ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Due date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ bill.due_date ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(bill.amount) }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Paid</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(bill.paid_amount) }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums" :class="bill.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(bill.open_amount) }}</td>
                        </tr>
                        <tr v-if="bill.customer_invoice">
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Customer invoice</th>
                            <td class="border border-gray-300 px-2 py-2"><RouterLink :to="routeUrl('customerInvoices.show', bill.customer_invoice.id)" class="text-red-600 hover:underline">{{ bill.customer_invoice.gen_id }}</RouterLink></td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Notes</th>
                            <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ bill.notes ?? '-' }}</td>
                        </tr>
                    </tbody>
                </table>

                <template #footer>
                    <RouterLink :to="routeUrl('suppliers.show', bill.supplier.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to supplier</RouterLink>
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
