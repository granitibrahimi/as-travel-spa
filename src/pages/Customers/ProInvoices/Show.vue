<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';

const route = useRoute();
const auth = useAuthStore();
const proInvoice = ref(null);

onMounted(async () => {
    const { data } = await api.get(`/customers/pro-invoices/${route.params.id}`);
    proInvoice.value = castResource(data);
});
</script>

<template>
    <AppLayout :title="proInvoice ? `Pro-invoice ${proInvoice.gen_id}` : 'Pro-invoice'" fluid>
        <Loader v-if="! proInvoice" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="proInvoice.customer" />

                <FullWidthBox title="Pro-invoice" :collapsible="false">
                    <template #actions>
                        <RouterLink v-if="auth.can('customerProInvoices.edit')" :to="routeUrl('customerProInvoices.edit', proInvoice.id)">
                            <Button variant="primary">Edit</Button>
                        </RouterLink>
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ proInvoice.id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Pro-invoice ID</th>
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ proInvoice.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ proInvoice.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(proInvoice.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left align-top font-medium text-gray-600">Flight info</th>
                                <td class="whitespace-pre-line border border-gray-300 px-2 py-2">{{ proInvoice.flight_info || '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left align-top font-medium text-gray-600">Hotel info</th>
                                <td class="whitespace-pre-line border border-gray-300 px-2 py-2">{{ proInvoice.hotel_info || '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ proInvoice.user?.name ?? '—' }}
                                    <br>
                                    <span class="text-gray-500">{{ proInvoice.created_at }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>
        </template>
    </AppLayout>
</template>
