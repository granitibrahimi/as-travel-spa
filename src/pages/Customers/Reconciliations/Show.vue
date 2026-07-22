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
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const reconciliation = ref(null);

onMounted(async () => {
    const { data } = await api.get(`/customers/reconciliations/${route.params.id}`);
    reconciliation.value = castResource(data);
});
</script>

<template>
    <AppLayout :title="reconciliation ? `Reconciliation #${reconciliation.id}` : 'Reconciliation'" fluid>
        <Loader v-if="! reconciliation" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <CustomerDetails :customer="reconciliation.customer" />

                <FullWidthBox title="Reconciliation" :collapsible="false">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.id }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.reference }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                            <td class="border border-gray-300 px-2 py-2">
                                {{ reconciliation.user.name }}
                                <br/>
                                {{ reconciliation.created_at }}
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" class="border border-gray-300 px-2 py-2">
                                <p class="font-bold text-gray-600 pb-2">Notes: </p>
                                {{ reconciliation.notes }}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

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
