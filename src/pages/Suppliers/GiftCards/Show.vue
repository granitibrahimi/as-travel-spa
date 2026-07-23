<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
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

const giftCard = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-gift-cards/${route.params.id}`);
    giftCard.value = castResource(data);
}

onMounted(load);

const rows = computed(() => giftCard.value ? [
    ['Amount', money(giftCard.value.amount)],
    ['Open amount', money(giftCard.value.open_amount)],
    ['Date', giftCard.value.on_date],
    ['Created by', giftCard.value.user],
    ['Notes', giftCard.value.notes],
] : []);

const confirmingDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/supplier-gift-cards/${giftCard.value.id}`);
        router.push(giftCard.value.supplier ? routeUrl('suppliers.show', giftCard.value.supplier.id) : routeUrl('supplierGiftCards.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="giftCard ? `Gift card ${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            <SupplierDetails :supplier="giftCard.supplier" />

            <FullWidthBox :title="`Gift card ${giftCard.gen_id}`" :collapsible="false">
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
                    <RouterLink :to="routeUrl('supplierGiftCards.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierGiftCards.edit')" :to="routeUrl('supplierGiftCards.edit', giftCard.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierGiftCards.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="confirmingDelete"
            title="Delete gift card?"
            :message="giftCard ? `Gift card ${giftCard.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="confirmingDelete = false"
        />
    </AppLayout>
</template>
