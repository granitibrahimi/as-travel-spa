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

const giftCard = ref(null);

async function load() {
    const { data } = await api.get(`/supplier-gift-cards/${route.params.id}`);
    giftCard.value = data.data ?? data;
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
        await api.delete(`/supplier-gift-cards/${giftCard.value.id}`);
        router.push(giftCard.value.supplier ? `/suppliers/${giftCard.value.supplier.id}` : '/supplier-gift-cards');
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="giftCard ? `Gift card ${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />
        <FullWidthBox v-else :title="`Gift card ${giftCard.gen_id}`" :collapsible="false">
            <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Supplier</dt><dd>{{ giftCard.supplier?.name ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(giftCard.amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums">{{ money(giftCard.open_amount) }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ giftCard.on_date }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Created by</dt><dd>{{ giftCard.user ?? '—' }}</dd></div>
                <div class="flex gap-2"><dt class="w-32 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ giftCard.notes ?? '—' }}</dd></div>
            </dl>

            <template #footer>
                <div class="flex flex-wrap items-center gap-3">
                    <RouterLink to="/supplier-gift-cards" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                    <RouterLink v-if="auth.can('supplierGiftCards.edit')" :to="`/supplier-gift-cards/${giftCard.id}/edit`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('supplierGiftCards.delete')" variant="danger" size="sm" @click="confirmingDelete = true">Delete</Button>
                </div>
            </template>
        </FullWidthBox>

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
