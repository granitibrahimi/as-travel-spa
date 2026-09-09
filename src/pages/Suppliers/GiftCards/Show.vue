<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';
import GiftCardActions from './Actions.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const giftCard = ref(null);
const documentsBox = ref(null);
const actionsOpen = ref(false);

async function load() {
    const { data } = await api.get(`/suppliers/gift-cards/${route.params.id}`);
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

function onDeleted() {
    router.push(giftCard.value.supplier
        ? routeUrl('suppliers.show', giftCard.value.supplier.id)
        : routeUrl('supplierGiftCards.list'));
}
</script>

<template>
    <AppLayout :title="giftCard ? `Gift card ${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
            <SupplierDetails :supplier="giftCard.supplier" />

            <FullWidthBox :title="`Gift card ${giftCard.gen_id}`" :collapsible="false">
            <template #actions>
                <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    aria-label="Gift card actions"
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
                <RouterLink :to="routeUrl('supplierGiftCards.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
            </template>
            </FullWidthBox>
        </div>

        <DocumentsBox
            v-if="giftCard"
            ref="documentsBox"
            :entity="DOCUMENT_ENTITY.SUPPLIER_GIFT_CARD"
            :id="giftCard.id"
            :can-manage="auth.can('supplierGiftCards.edit')"
            :can-view="auth.can('supplierGiftCards.show')"
            :show-add-button="false"
        />

        <!-- Per-gift-card actions — defined locally and permission-gated (Actions.vue). -->
        <GiftCardActions
            :gift-card="giftCard"
            :show="actionsOpen"
            :show-view-action="false"
            :show-add-document="true"
            @close="actionsOpen = false"
            @add-document="documentsBox?.openUpload()"
            @deleted="onDeleted"
        />
    </AppLayout>
</template>
