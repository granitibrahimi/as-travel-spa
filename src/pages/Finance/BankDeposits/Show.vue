<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ShowActions from '../../../components/ShowActions.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const deposit = ref(null);
const approving = ref(false);
const showDelete = ref(false);
const deleting = ref(false);

const title = computed(() => (deposit.value ? `Bank Deposit ${deposit.value.gen_id}` : `Bank Deposit #${id}`));

// Title ⋯ actions (mirrors the list, plus the QuickBooks + Journal links).
const actions = computed(() => {
    if (! deposit.value) {
        return [];
    }

    const items = [];

    if (auth.can('accountTransactions.journal')) {
        items.push({ label: 'Journal', to: { name: 'accountTransactions.journal', params: { type: 'bank-deposit', reference: id } } });
    }

    if (deposit.value.qb_id) {
        items.push({ label: 'Open in QuickBooks', href: `https://qbo.intuit.com/app/transfer?txnId=${deposit.value.qb_id}` });
    }

    if (auth.can('bankDeposits.delete')) {
        items.push({ label: 'Delete', danger: true, action: () => (showDelete.value = true) });
    }

    return items;
});

async function load() {
    const { data } = await api.get(`/bank-deposits/${id}`);
    deposit.value = data.data ?? data;
}

onMounted(load);

async function approve() {
    if (approving.value) {
        return;
    }

    approving.value = true;

    try {
        await api.post(`/bank-deposits/${id}/approve`);
        await load();
    } finally {
        approving.value = false;
    }
}

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/bank-deposits/${id}`);
        router.push('/bank-deposits');
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <template #actions>
                <ShowActions
                    :items="deposit ? actions : []"
                    back-to="/bank-deposits"
                    back-label="Bank Deposits"
                    :title="title"
                />
            </template>

            <Loader v-if="! deposit" />

            <template v-else>
                <dl class="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Date</dt><dd>{{ deposit.on_date }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Bank account</dt><dd>{{ deposit.payment_method }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Amount</dt><dd class="font-semibold tabular-nums">{{ money(deposit.amount) }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Created by</dt><dd>{{ deposit.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Notes</dt><dd>{{ deposit.notes || '—' }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1">
                        <dt class="text-gray-500">Approved</dt>
                        <dd>{{ deposit.is_approved ? `${deposit.approved_by} · ${deposit.approved_at}` : '—' }}</dd>
                    </div>
                </dl>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Payment</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2">Registered by</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Deposited</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Payment total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(payment, i) in deposit.payments" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">
                                    <RouterLink
                                        v-if="payment.payment_id"
                                        :to="{ name: 'customerPayments.show', params: { id: payment.payment_id } }"
                                        class="text-red-600 hover:underline"
                                    >
                                        {{ payment.payment_gen_id ?? payment.payment_id }}
                                    </RouterLink>
                                    <span v-else>{{ payment.payment_gen_id ?? payment.payment_id }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ payment.user }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.on_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.deposited_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums text-gray-500">{{ money(payment.total_amount) }}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="font-semibold">
                                <td class="border border-gray-300 px-2 py-2 text-right" colspan="4">Total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(deposit.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </template>

        </FullWidthBox>

        <ConfirmDialog
            :show="showDelete"
            title="Delete bank deposit?"
            message="The deposit will be deleted and its payments returned to undeposited."
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
