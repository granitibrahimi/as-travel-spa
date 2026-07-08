<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import { customerTransactionPath } from '../../../helpers/customerTransactions.js';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const reconciliation = ref(null);

async function load() {
    const { data } = await api.get(`/customer-reconciliations/${route.params.id}`);
    reconciliation.value = data.data ?? data;
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
                            <RouterLink v-if="reconciliation.customer" :to="`/customers/${reconciliation.customer.id}`" class="text-red-600 hover:underline">{{ reconciliation.customer.name }}</RouterLink>
                            <span v-else>—</span>
                        </dd>
                    </div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ reconciliation.reference ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ reconciliation.date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ reconciliation.user ?? '—' }} · {{ reconciliation.created_at ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink to="/customer-reconciliations" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to list</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox title="Linked transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Type</th>
                                <th class="py-2 pr-2">Reference</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in reconciliation.links" :key="i" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ link.type }}</td>
                                <td class="py-2 pr-2">
                                    <RouterLink
                                        v-if="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                        :to="customerTransactionPath({ type: link.type, id: link.transaction_id })"
                                        class="text-red-600 hover:underline"
                                    >{{ link.reference ?? link.transaction_id }}</RouterLink>
                                    <span v-else>{{ link.reference ?? link.transaction_id }}</span>
                                </td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(link.amount) }}</td>
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
