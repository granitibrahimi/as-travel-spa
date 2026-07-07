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

const refund = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-refunds/${route.params.id}`);
    refund.value = data.data ?? data;
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
        await api.delete(`/supplier-refunds/${refund.value.id}`);
        router.push(refund.value.supplier ? `/suppliers/${refund.value.supplier.id}` : '/supplier-refunds');
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="refund ? `Refund ${refund.gen_id}` : 'Refund'" fluid>
        <Loader v-if="! refund" />
        <FullWidthBox v-else :title="`Refund ${refund.gen_id}`" :collapsible="false">
            <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Supplier</dt><dd>{{ refund.supplier?.name ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(refund.amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums">{{ money(refund.open_amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Payment method</dt><dd>{{ refund.payment_method ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Transaction #</dt><dd>{{ refund.transaction_nr ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ refund.on_date }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ refund.user ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ refund.notes ?? '—' }}</dd></div>
            </dl>

            <template #footer>
                <div class="flex flex-wrap items-center gap-3">
                    <RouterLink to="/supplier-refunds" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierRefunds.edit')" :to="`/supplier-refunds/${refund.id}/edit`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierRefunds.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="confirmingDelete"
            title="Delete refund?"
            :message="refund ? `Refund ${refund.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="confirmingDelete = false"
        />
    </AppLayout>
</template>
