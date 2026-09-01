<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const notifications = useNotificationsStore();
const giftCard = ref(null);

async function load() {
    const { data } = await api.get(`/customers/gift-cards/${route.params.id}`);
    giftCard.value = castResource(data);
}

onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this gift card and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } catch (error) {
        notifications.push({
            type: 'error',
            message: error.response?.data?.errors?.link?.[0] ?? 'Could not unlink this transaction.',
        });
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="giftCard ? `Customer Gift Card #${giftCard.gen_id}` : 'Gift card'" fluid>
        <Loader v-if="! giftCard" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="giftCard.customer" />

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
                <CustomerTransactionLinks :links="giftCard.connected" @unlink="toUnlink = $event" />
            </FullWidthBox>

            <ConfirmDialog
                :show="Boolean(toUnlink)"
                title="Unlink transaction?"
                :message="unlinkMessage"
                confirm-label="Yes, unlink"
                confirm-variant="danger"
                :processing="unlinking"
                @confirm="confirmUnlink"
                @cancel="toUnlink = null"
            />
        </template>
    </AppLayout>
</template>
