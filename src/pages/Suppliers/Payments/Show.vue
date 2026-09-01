<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import { supplierTransactionPathById } from '../../../helpers/supplierTransactions.js';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';
import PaymentActions from './Actions.vue';

const route = useRoute();
const router = useRouter();

const payment = ref(null);
const actionsOpen = ref(false);

async function load() {
    const { data } = await api.get(`/suppliers/payments/${route.params.id}`);
    payment.value = castResource(data);
}

onMounted(load);

const rows = computed(() => payment.value ? [
    ['Amount', money(payment.value.amount)],
    ['Open amount', money(payment.value.open_amount)],
    ['Payment method', payment.value.payment_method],
    ['Date', payment.value.on_date],
    ['Transaction #', payment.value.transaction_nr],
    ['Reference', payment.value.reference],
    ['Created by', payment.value.user],
    ['Notes', payment.value.notes],
] : []);

function onDeleted() {
    router.push(payment.value.supplier ? routeUrl('suppliers.show', payment.value.supplier.id) : routeUrl('supplierPayments.list'));
}
</script>

<template>
    <AppLayout :title="payment ? `Payment ${payment.gen_id}` : 'Payment'" fluid>
        <Loader v-if="! payment" />
        <template v-else>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            <SupplierDetails :supplier="payment.supplier" />

            <FullWidthBox :title="`Payment ${payment.gen_id}`" :collapsible="false">
                <template #actions>
                    <button
                        type="button"
                        class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        aria-label="Payment actions"
                        @click="actionsOpen = true"
                    >
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="12" cy="19" r="1.8" />
                        </svg>
                    </button>
                </template>

                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr v-for="[label, value] in rows" :key="label">
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                            <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ value ?? '-' }}</td>
                        </tr>
                    </tbody>
                </table>

                <template #footer>
                    <RouterLink :to="routeUrl('supplierPayments.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                </template>
            </FullWidthBox>
        </div>

        <FullWidthBox title="Linked transactions" :collapsible="false" class="mt-6">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="border-b text-left text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 text-right px-2 py-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(link, i) in (payment.links ?? [])" :key="i" class="border-b last:border-0">
                            <td class="border border-gray-300 px-2 py-2">{{ link.id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ link.type.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <RouterLink
                                    v-if="supplierTransactionPathById(link.type.id, link.transaction_id)"
                                    :to="supplierTransactionPathById(link.type.id, link.transaction_id)"
                                    class="text-red-600 hover:underline"
                                >{{ link.reference ?? link.transaction_id }}</RouterLink>
                                <span v-else>{{ link.reference ?? link.transaction_id }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                        </tr>

                        <tr v-if="(payment.links ?? []).length" class="border-b last:border-0">
                            <th class="border border-gray-300 text-right px-2 py-2" colspan="3">Total</th>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.links_amount ?? 0) }}</td>
                        </tr>

                        <tr v-else>
                            <td colspan="4" class="py-6 text-center text-gray-500">No linked transactions.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>
        </template>

        <PaymentActions
            :payment="payment"
            :show="actionsOpen"
            :show-view-action="false"
            @close="actionsOpen = false"
            @deleted="onDeleted"
        />
    </AppLayout>
</template>
