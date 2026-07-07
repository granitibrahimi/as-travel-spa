<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const deposit = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-deposits/${route.params.id}`);
    deposit.value = data.data ?? data;
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
        await api.delete(`/supplier-deposits/${deposit.value.id}`);
        router.push(deposit.value.supplier ? `/suppliers/${deposit.value.supplier.id}` : '/supplier-deposits');
    } finally {
        deleting.value = false;
    }
}

const converting = ref(false);

async function convertToPayment() {
    if (converting.value) {
        return;
    }

    converting.value = true;

    try {
        const { data } = await api.post(`/supplier-deposits/${deposit.value.id}/convert-to-payment`);
        router.push(`/supplier-payments/${data.id}`);
    } catch (error) {
        converting.value = false;
        throw error;
    }
}
</script>

<template>
    <AppLayout :title="deposit ? `Deposit ${deposit.gen_id}` : 'Deposit'" fluid>
        <Loader v-if="! deposit" />
        <FullWidthBox v-else :title="`Deposit ${deposit.gen_id}`" :collapsible="false">
            <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Supplier</dt><dd>{{ deposit.supplier?.name ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(deposit.amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Payment method</dt><dd>{{ deposit.payment_method ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ deposit.on_date }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Transaction #</dt><dd>{{ deposit.transaction_nr ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Reference</dt><dd>{{ deposit.reference ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ deposit.user ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ deposit.notes ?? '—' }}</dd></div>
            </dl>

            <template #footer>
                <div class="flex flex-wrap items-center gap-3">
                    <RouterLink to="/supplier-deposits" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierDeposits.edit')" :to="`/supplier-deposits/${deposit.id}/edit`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierDeposits.convertToPayment')" size="sm" :disabled="converting" @click="convertToPayment">
                        {{ converting ? 'Converting…' : 'Convert to payment' }}
                    </Button>
                    <Button v-if="auth.can('supplierDeposits.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="confirmingDelete"
            title="Delete deposit?"
            :message="deposit ? `Deposit ${deposit.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="confirmingDelete = false"
        />
    </AppLayout>
</template>
