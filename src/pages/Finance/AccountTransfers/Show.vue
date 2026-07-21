<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const transfer = ref(null);
const showDelete = ref(false);
const deleting = ref(false);

const title = computed(() => (transfer.value ? `Transfer ${transfer.value.gen_id}` : `Transfer #${id}`));

onMounted(async () => {
    const { data } = await api.get(`/account-transfers/${id}`);
    transfer.value = castResource(data);
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/account-transfers/${id}`);
        router.push(routeUrl('accountTransfers.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="! transfer" />
            <template v-else>
                <div class="mb-4 flex flex-wrap gap-2">
                    <RouterLink
                        v-if="auth.can('accountTransfers.edit') && transfer.editable"
                        :to="routeUrl('accountTransfers.edit', transfer.id)"
                        class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                    >
                        Edit
                    </RouterLink>
                    <Button v-if="auth.can('accountTransfers.delete')" variant="danger" @click="showDelete = true">Delete</Button>
                </div>

                <dl class="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Date</dt><dd>{{ transfer.on_date }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Amount</dt><dd class="font-semibold tabular-nums">{{ money(transfer.amount) }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">From account</dt><dd>{{ transfer.from_account }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">To account</dt><dd>{{ transfer.to_account }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Created by</dt><dd>{{ transfer.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Notes</dt><dd>{{ transfer.notes || '—' }}</dd></div>
                </dl>

                <div v-if="transfer.payments && transfer.payments.length" class="overflow-x-auto">
                    <h3 class="mb-2 text-sm font-semibold text-gray-700">Approved cash</h3>
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Payment</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(payment, i) in transfer.payments" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ payment.payment_gen_id ?? payment.payment_id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.customer }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ payment.on_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(payment.deposited_amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>

            <template #footer>
                <RouterLink :to="routeUrl('accountTransfers.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to transfers
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="showDelete"
            title="Delete transfer?"
            message="The transfer will be deleted and any approved cash returned to undeposited."
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
