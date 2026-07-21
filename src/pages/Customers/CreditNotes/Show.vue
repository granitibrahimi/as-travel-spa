<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const creditNote = ref(null);

async function load() {
    const { data } = await api.get(`/customers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
}
onMounted(load);
</script>

<template>
    <AppLayout :title="creditNote ? `Credit note ${creditNote.gen_id}` : 'Credit note'" fluid>
        <Loader v-if="! creditNote" />

        <template v-else>
            <FullWidthBox :title="`Credit note ${creditNote.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ creditNote.customer.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Destination</dt><dd>{{ creditNote.destination ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Agent</dt><dd>{{ creditNote.agent ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ creditNote.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(creditNote.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Paid</dt><dd class="tabular-nums">{{ money(creditNote.paid_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Debt</dt><dd class="tabular-nums">{{ money(creditNote.debt) }}</dd></div>
                    <div v-if="creditNote.related_invoice" class="flex gap-2">
                        <dt class="w-36 shrink-0 font-medium text-gray-500">Related invoice</dt>
                        <dd><RouterLink :to="routeUrl('customerInvoices.show', creditNote.related_invoice.id)" class="text-red-600 hover:underline">{{ creditNote.related_invoice.gen_id }}</RouterLink></dd>
                    </div>
                </dl>

                <template #footer>
                    <RouterLink :to="routeUrl('customers.show', creditNote.customer.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.lines.length" title="Line items" :collapsible="false" class="mb-6">
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
                            <tr v-for="line in creditNote.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.destination ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.connected.length" title="Connected payments" :collapsible="false">
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
                            <tr v-for="(link, i) in creditNote.connected" :key="i" class="border-b last:border-0">
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
