<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import { customerTransactionPath } from '../../../helpers/customerTransactions.js';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const reconciliation = ref(null);

async function load() {
    const { data } = await api.get(`/customers/reconciliations/${route.params.id}`);
    reconciliation.value = castResource(data);
}
onMounted(load);
</script>

<template>
    <AppLayout :title="reconciliation ? `Reconciliation #${reconciliation.id}` : 'Reconciliation'" fluid>
        <Loader v-if="! reconciliation" />

        <template v-else>
            <FullWidthBox :title="`Reconciliation #${reconciliation.id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2">
                        <dt class="w-32 shrink-0 font-medium text-gray-500">Customer</dt>
                        <dd>
                            <RouterLink v-if="reconciliation.customer" :to="routeUrl('customers.show', reconciliation.customer.id)" class="text-red-600 hover:underline">{{ reconciliation.customer.name }}</RouterLink>
                            <span v-else>—</span>
                        </dd>
                    </div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ reconciliation.reference ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ reconciliation.date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ reconciliation.user ?? '—' }} · {{ reconciliation.created_at ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="routeUrl('customerReconciliations.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to list</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox title="Linked transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 text-right px-2 py-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in reconciliation.links" :key="i" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ link.type }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink
                                        v-if="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                        :to="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                        class="text-red-600 hover:underline"
                                    >{{ link.reference ?? link.transaction_id }}</RouterLink>
                                    <span v-else>{{ link.reference ?? link.transaction_id }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>

                            <tr class="border-b last:border-0">
                                <th class="border border-gray-300 text-right px-2 py-2" colspan="2">Total</th>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(reconciliation.links_amount) }}</td>
                            </tr>

                            <tr v-if="! reconciliation.links.length">
                                <td colspan="3" class="py-6 text-center text-gray-500">No linked transactions.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
