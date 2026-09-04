<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';

const route = useRoute();
const notifications = useNotificationsStore();
const payment = ref(null);
const checking = ref(false);

async function load() {
    const { data } = await api.get(`/customers/online-payments/${route.params.id}`);
    payment.value = castResource(data);
}

onMounted(load);

async function checkStatus() {
    if (checking.value) {
        return;
    }

    checking.value = true;

    try {
        const { data } = await api.post(`/customers/online-payments/${route.params.id}/check-status`);
        const result = castResource(data);
        payment.value = result;
        notifications.push({ type: result.status.label === 'Paid' ? 'success' : 'info', message: result.message });
    } finally {
        checking.value = false;
    }
}

const statusClass = (status) => ({
    Pending: 'bg-yellow-100 text-yellow-700',
    Paid: 'bg-green-100 text-green-700',
    Declined: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
}[status] ?? 'bg-gray-100 text-gray-600');
</script>

<template>
    <AppLayout :title="payment ? `Online Payment #${payment.id}` : 'Online Payment'" fluid>
        <Loader v-if="! payment" />

        <template v-else>
            <FullWidthBox title="Payment link generated" :collapsible="false" class="mb-6">
                <div class="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_1fr]">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Type</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.type }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.created_by ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(payment.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Status</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(payment.status.label)">{{ payment.status.label }}</span>
                                </td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Payment link</th>
                                <td class="border border-gray-300 px-2 py-2 break-all">
                                    <a v-if="payment.payment_url" :href="payment.payment_url" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ payment.payment_url }}</a>
                                    <span v-else class="text-gray-400">Portal URL is not configured.</span>
                                </td>
                            </tr>
                            <tr v-if="payment.customer_payment">
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Customer payment</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink :to="`/customers/payments/${payment.customer_payment.id}`" class="text-red-600 hover:underline">{{ payment.customer_payment.gen_id ?? `#${payment.customer_payment.id}` }}</RouterLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div>
                        <Button variant="primary" :loading="checking" @click="checkStatus">Check payment status</Button>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Payment attempts" :collapsible="false" class="mb-6">
                <p v-if="! payment.sessions.length" class="text-sm text-gray-400">No payment attempts yet.</p>
                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Attempted at</th>
                                <th class="border border-gray-300 px-2 py-2">Status</th>
                                <th class="border border-gray-300 px-2 py-2">Card</th>
                                <th class="border border-gray-300 px-2 py-2">Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="session in payment.sessions" :key="session.id">
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ session.created_at }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(session.status.label)">{{ session.status.label }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ session.card ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ session.message ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <CustomerDetails v-if="payment.customer" :customer="payment.customer" />
        </template>
    </AppLayout>
</template>
