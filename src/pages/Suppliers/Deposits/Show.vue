<script setup>
import { computed, onMounted, ref } from 'vue';
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
import SupplierDetails from '../../../components/SupplierDetails.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const deposit = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-deposits/${route.params.id}`);
    deposit.value = castResource(data);
}

onMounted(load);

const rows = computed(() => deposit.value ? [
    ['Amount', money(deposit.value.amount)],
    ['Payment method', deposit.value.payment_method],
    ['Date', deposit.value.on_date],
    ['Transaction #', deposit.value.transaction_nr],
    ['Reference', deposit.value.reference],
    ['Created by', deposit.value.user],
    ['Notes', deposit.value.notes],
] : []);

const confirmingDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-deposits/${deposit.value.id}`);
        router.push(deposit.value.supplier ? routeUrl('suppliers.show', deposit.value.supplier.id) : routeUrl('supplierDeposits.list'));
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
        router.push(routeUrl('supplierPayments.show', castMutation(data).id));
    } catch (error) {
        converting.value = false;
        throw error;
    }
}
</script>

<template>
    <AppLayout :title="deposit ? `Deposit ${deposit.gen_id}` : 'Deposit'" fluid>
        <Loader v-if="! deposit" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            <SupplierDetails :supplier="deposit.supplier" />

            <FullWidthBox :title="`Deposit ${deposit.gen_id}`" :collapsible="false">
            <table class="w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                    <tr v-for="[label, value] in rows" :key="label">
                        <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                        <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ value ?? '-' }}</td>
                    </tr>
                </tbody>
            </table>

            <template #footer>
                <div class="flex flex-wrap items-center gap-3">
                    <RouterLink :to="routeUrl('supplierDeposits.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierDeposits.edit')" :to="routeUrl('supplierDeposits.edit', deposit.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierDeposits.convertToPayment')" size="sm" :disabled="converting" @click="convertToPayment">
                        {{ converting ? 'Converting…' : 'Convert to payment' }}
                    </Button>
                    <Button v-if="auth.can('supplierDeposits.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
            </FullWidthBox>
        </div>

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
