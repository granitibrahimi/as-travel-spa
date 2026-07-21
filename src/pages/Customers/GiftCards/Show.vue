<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const giftCard = ref(null);

onMounted(async() => {
    const { data } = await api.get(`/customers/gift-cards/${route.params.id}`);
    giftCard.value = castResource(data);
});
</script>

<template>
    <AppLayout :title="giftCard ? `Customer Gift Card #${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <FullWidthBox title="Customer" :collapsible="false">
                    <CustomerDetails :customer="giftCard.customer" />
                </FullWidthBox>

                <FullWidthBox title="Gift Cards" :collapsible="false">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ giftCard.id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">GEN ID</th>
                                <td class="border border-gray-300 px-2 py-2">{{ giftCard.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                                <td class="border border-gray-300 px-2 py-2">{{ giftCard.on_date }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                                <td class="border border-gray-300 px-2 py-2">{{ money(giftCard.amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open Amount</th>
                                <td class="border border-gray-300 px-2 py-2">{{ money(giftCard.open_amount) }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ giftCard.agent }}
                                    <br/>
                                    {{ giftCard.created_at }}
                                </td>
                            </tr>
                            <tr>
                                <td colspan="2" class="border border-gray-300 px-2 py-2">
                                    <p class="font-bold text-gray-600 pb-2">Notes: </p>
                                    {{ giftCard.notes }}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                </FullWidthBox>
            </div>

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
