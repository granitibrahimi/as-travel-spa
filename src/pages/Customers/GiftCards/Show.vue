<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const giftCard = ref(null);

async function load() {
    const { data } = await api.get(`/customers/gift-cards/${route.params.id}`);
    giftCard.value = castResource(data);
}

onMounted(load);

// Title ⋯ menu, same pattern as Customers/Refunds/Show.vue.
const actions = computed(() => {
    const g = giftCard.value;

    if (! g) {
        return [];
    }

    return [
        ...(auth.can('customerGiftCards.edit') ? [{ label: 'Edit', href: routeUrl('customerGiftCards.edit', g.id) }] : []),
        ...(auth.can('customerGiftCards.delete') ? [{ label: 'Delete', danger: true, action: () => (confirmingDelete.value = true) }] : []),
    ];
});

const confirmingDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/gift-cards/${giftCard.value.id}`);
        router.push(giftCard.value.customer?.id
            ? routeUrl('customers.show', giftCard.value.customer.id)
            : routeUrl('customerGiftCards.list'));
    } finally {
        deleting.value = false;
    }
}

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this financial credit note and restores its open amount.`
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
    <AppLayout :title="giftCard ? `Customer Financial Credit Note #${giftCard.gen_id}` : 'Financial Credit Note'" fluid>
        <Loader v-if="! giftCard" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="giftCard.customer" />

                <FullWidthBox title="Financial Credit Note" :collapsible="false">
                        <template v-if="actions.length" #actions>
                            <DropdownMenu :items="actions" />
                        </template>

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

            <ConfirmDialog
                :show="confirmingDelete"
                title="Delete financial credit note?"
                :message="`Financial credit note ${giftCard.gen_id} will be permanently deleted.`"
                confirm-label="Yes, delete"
                confirm-variant="danger"
                :processing="deleting"
                @confirm="confirmDelete"
                @cancel="confirmingDelete = false"
            />
        </template>
    </AppLayout>
</template>
