<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource, castMutation } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const payment = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-payments/${route.params.id}`);
    payment.value = castResource(data);
}

onMounted(load);

const confirmingDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-payments/${payment.value.id}`);
        router.push(payment.value.supplier ? routeUrl('suppliers.show', payment.value.supplier.id) : routeUrl('supplierPayments.list'));
    } finally {
        deleting.value = false;
    }
}

const confirmingConvert = ref(false);
const converting = ref(false);

async function confirmConvert() {
    if (converting.value) {
        return;
    }

    converting.value = true;

    try {
        const { data } = await api.post(`/supplier-payments/${payment.value.id}/convert-to-deposit`);
        router.push(routeUrl('supplierDeposits.show', castMutation(data).id));
    } catch (error) {
        converting.value = false;
        throw error;
    }
}
</script>

<template>
    <AppLayout :title="payment ? `Payment ${payment.gen_id}` : 'Payment'" fluid>
        <Loader v-if="! payment" />
        <FullWidthBox v-else :title="`Payment ${payment.gen_id}`" :collapsible="false">
            <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Supplier</dt><dd>{{ payment.supplier?.name ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(payment.amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums">{{ money(payment.open_amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Payment method</dt><dd>{{ payment.payment_method ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ payment.on_date }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Transaction #</dt><dd>{{ payment.transaction_nr ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ payment.reference ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ payment.user ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ payment.notes ?? '—' }}</dd></div>
            </dl>

            <template #footer>
                <div class="flex flex-wrap items-center gap-3">
                    <RouterLink :to="routeUrl('supplierPayments.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierPayments.edit')" :to="routeUrl('supplierPayments.edit', payment.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierPayments.convertToDeposit')" size="sm" :disabled="converting" @click="confirmingConvert = true">
                        {{ converting ? 'Converting…' : 'Convert to deposit' }}
                    </Button>
                    <Button v-if="auth.can('supplierPayments.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="confirmingConvert"
            title="Convert payment to deposit?"
            :message="payment ? `Payment ${payment.gen_id} will be converted into a supplier deposit.` : ''"
            confirm-label="Yes, convert"
            :processing="converting"
            @confirm="confirmConvert"
            @cancel="confirmingConvert = false"
        />

        <ConfirmDialog
            :show="confirmingDelete"
            title="Delete payment?"
            :message="payment ? `Payment ${payment.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="confirmingDelete = false"
        />
    </AppLayout>
</template>
