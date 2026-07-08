<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const giftCard = ref(null);

async function load() {
    const { data } = await api.get(`/customer-gift-cards/${route.params.id}`);
    giftCard.value = data.data ?? data;
}
onMounted(load);
</script>

<template>
    <AppLayout :title="giftCard ? `Gift card ${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />

        <template v-else>
            <FullWidthBox :title="`Gift card ${giftCard.gen_id}`" :collapsible="false" class="mb-6">
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Customer</dt><dd>{{ giftCard.customer.name ?? '—' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ giftCard.on_date }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(giftCard.amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums" :class="giftCard.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(giftCard.open_amount) }}</dd></div>
                    <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Created</dt><dd>{{ giftCard.agent ?? '—' }} · {{ giftCard.created_at ?? '—' }}</dd></div>
                    <div class="flex gap-2 sm:col-span-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ giftCard.notes ?? '—' }}</dd></div>
                </dl>

                <template #footer>
                    <RouterLink :to="`/customers/${giftCard.customer.id}`" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to customer</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="giftCard.connected.length" title="Connected transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in giftCard.connected" :key="i" class="border-b last:border-0">
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>
    </AppLayout>
</template>
