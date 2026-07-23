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

const payment = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-payments/${route.params.id}`);
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
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            <SupplierDetails :supplier="payment.supplier" />

            <FullWidthBox :title="`Payment ${payment.gen_id}`" :collapsible="false">
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
                    <RouterLink :to="routeUrl('supplierPayments.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierPayments.edit')" :to="routeUrl('supplierPayments.edit', payment.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierPayments.convertToDeposit')" size="sm" :disabled="converting" @click="confirmingConvert = true">
                        {{ converting ? 'Converting…' : 'Convert to deposit' }}
                    </Button>
                    <Button v-if="auth.can('supplierPayments.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
            </FullWidthBox>
        </div>

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
