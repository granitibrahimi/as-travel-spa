<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import PaymentActions from './Actions.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const payment = ref(null);
const cashMovements = ref([]);
const actionsOpen = ref(false);
const documentsBox = ref(null);

const connectedTotal = computed(() =>
    (payment.value?.connected ?? []).reduce((sum, link) => sum + Number(link.amount ?? 0), 0),
);

async function load() {
    const { data } = await api.get(`/customers/payments/${route.params.id}`);
    payment.value = castResource(data);

    const movements = await api
        .get(`/customers/payments/${route.params.id}/cash-movements`)
        .then(({ data }) => castResource(data))
        .catch(() => []);
    cashMovements.value = Array.isArray(movements) ? movements : [];
}

onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this payment and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="payment ? `Payment ${payment.gen_id}` : 'Payment'" fluid>
        <Loader v-if="! payment" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="payment.customer" />

                <FullWidthBox title="Payment details" :collapsible="false">
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
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.id }} | {{ payment.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(payment.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open amount</th>
                                <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(payment.open_amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Payment method</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.payment_method.name }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Transaction #</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.transaction_nr ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.reference ?? '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ payment.user?.name ?? '—' }}
                                    <br>
                                    <span class="text-gray-500">{{ payment.created_at }}</span>
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="border border-gray-300 px-2 py-2">
                                    <p class="pb-2 font-bold text-gray-600">Notes:</p>
                                    {{ payment.notes ?? '—' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="payment.connected.length" title="Connected transactions" :collapsible="false" class="mt-6">
                <CustomerTransactionLinks
                    :links="payment.connected"
                    :total="connectedTotal"
                    @unlink="toUnlink = $event"
                />
            </FullWidthBox>

            <FullWidthBox v-if="cashMovements.length" title="Cash movement" :collapsible="false" class="mt-6">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-gray-500">
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-right">Amount</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Action</th>
                                <th class="border border-gray-300 bg-gray-50 px-2 py-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(movement, i) in cashMovements" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(movement.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ movement.action }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ movement.date ?? '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <DocumentsBox
                ref="documentsBox"
                :entity="DOCUMENT_ENTITY.CUSTOMER_PAYMENT"
                :id="payment.id"
                :can-manage="auth.can('customerPayments.edit')"
                :can-view="auth.can('customerPayments.show')"
                :show-add-button="false"
            />

            <PaymentActions
                :payment="payment"
                :show="actionsOpen"
                :show-view-action="false"
                :show-add-document="true"
                @close="actionsOpen = false"
                @add-document="documentsBox?.openUpload()"
                @deleted="router.push(routeUrl('customers.show', payment.customer.id))"
            />

            <ConfirmDialog
                :show="Boolean(toUnlink)"
                title="Unlink transaction?"
                :message="unlinkMessage"
                confirm-label="Yes, unlink"
                confirm-variant="danger"
                :processing="unlinking"
                @confirm="confirmUnlink"
                @cancel="toUnlink = null"
            />
        </template>
    </AppLayout>
</template>
