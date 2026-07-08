<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const invoice = ref(null);

async function load() {
    const { data } = await api.get(`/customer-invoices/${route.params.id}`);
    invoice.value = data.data ?? data;
}
onMounted(load);
</script>

<template>
    <AppLayout :title="invoice ? `Invoice ${invoice.gen_id}` : 'Invoice'" fluid>
        <Loader v-if="! invoice" />

        <template v-else>
            <FullWidthBox :title="`Invoice ${invoice.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ invoice.customer.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Type</dt><dd>{{ invoice.type }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Destination</dt><dd>{{ invoice.destination ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Agent</dt><dd>{{ invoice.agent ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ invoice.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Due date</dt><dd>{{ invoice.due_date ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(invoice.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Paid</dt><dd class="tabular-nums">{{ money(invoice.paid_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Debt</dt><dd class="tabular-nums" :class="invoice.has_debt ? 'text-amber-600' : 'text-green-600'">{{ money(invoice.debt) }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="`/customers/${invoice.customer.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.lines.length" title="Line items" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Description</th>
                                <th class="py-2 pr-2">Destination</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in invoice.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.destination ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.credit_notes.length" title="Related credit notes" :collapsible="false" class="mb-6">
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
                            <tr v-for="creditNote in invoice.credit_notes" :key="creditNote.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">
                                    <RouterLink :to="`/customer-credit-notes/${creditNote.id}`" class="text-red-600 hover:underline">{{ creditNote.gen_id }}</RouterLink>
                                </td>
                                <td class="py-2 pr-2">{{ creditNote.on_date }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(creditNote.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="invoice.connected.length" title="Connected payments" :collapsible="false">
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
                            <tr v-for="(link, i) in invoice.connected" :key="i" class="border-b last:border-0">
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
