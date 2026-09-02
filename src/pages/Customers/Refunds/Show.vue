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
import CustomerDetails from '../../../components/CustomerDetails.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const notifications = useNotificationsStore();
const refund = ref(null);

async function load() {
    const { data } = await api.get(`/customers/refunds/${route.params.id}`);
    refund.value = castResource(data);
}
onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this reimbursement and restores its open amount.`
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
    <AppLayout :title="refund ? `Reimbursement ${refund.gen_id}` : 'Reimbursement'" fluid>
        <Loader v-if="! refund" />

        <template v-else>
            <div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <CustomerDetails :customer="refund.customer" />

                <FullWidthBox :title="`Reimbursement ${refund.gen_id}`" :collapsible="false">
                    <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Date</dt><dd>{{ refund.on_date }}</dd></div>
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Amount</dt><dd class="tabular-nums">{{ money(refund.amount) }}</dd></div>
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Open amount</dt><dd class="tabular-nums" :class="refund.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(refund.open_amount) }}</dd></div>
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Method</dt><dd>{{ refund.payment_method ?? '—' }}</dd></div>
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Transaction nr</dt><dd>{{ refund.transaction_nr ?? '—' }}</dd></div>
                        <div class="flex gap-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Created</dt><dd>{{ refund.agent ?? '—' }} · {{ refund.created_at ?? '—' }}</dd></div>
                        <div class="flex gap-2 sm:col-span-2"><dt class="w-36 shrink-0 font-medium text-gray-500">Notes</dt><dd class="whitespace-pre-line">{{ refund.notes ?? '—' }}</dd></div>
                    </dl>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="refund.connected.length" title="Connected transactions" :collapsible="false">
                <CustomerTransactionLinks :links="refund.connected" @unlink="toUnlink = $event" />
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
