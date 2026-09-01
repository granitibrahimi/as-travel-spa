<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import { supplierTransactionPathById } from '../../../helpers/supplierTransactions.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const reconciliation = ref(null);

onMounted(async () => {
    const { data } = await api.get(`/suppliers/reconciliations/${route.params.id}`);
    reconciliation.value = castResource(data);
});

// Reconciliations have no Edit — only QuickBooks and Delete on the show page.
const actions = computed(() => (reconciliation.value ? [
    ...(reconciliation.value.qb_link ? [{ label: 'QuickBooks', href: reconciliation.value.qb_link }] : []),
    ...(auth.can('supplierReconciliations.delete')
        ? [{ label: 'Delete', danger: true, action: () => (showDelete.value = true) }]
        : []),
] : []));

const showDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/suppliers/reconciliations/${route.params.id}`);
        router.push(routeUrl('supplierReconciliations.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="reconciliation ? `Reconciliation #${reconciliation.id}` : 'Reconciliation'" fluid>
        <Loader v-if="! reconciliation" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <SupplierDetails :supplier="reconciliation.supplier" />

                <FullWidthBox title="Reconciliation" :collapsible="false">
                    <template v-if="actions.length" #actions>
                        <DropdownMenu :items="actions" />
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.id }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.reference }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                            <td class="border border-gray-300 px-2 py-2">
                                {{ reconciliation.user.name }}
                                <br/>
                                {{ reconciliation.created_at }}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox title="Linked transactions" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 text-right px-2 py-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in reconciliation.links" :key="i" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ link.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ link.type.name }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <RouterLink
                                        v-if="supplierTransactionPathById(link.type.id, link.transaction_id)"
                                        :to="supplierTransactionPathById(link.type.id, link.transaction_id)"
                                        class="text-red-600 hover:underline"
                                    >{{ link.reference ?? link.transaction_id }}</RouterLink>
                                    <span v-else>{{ link.reference ?? link.transaction_id }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>

                            <tr class="border-b last:border-0">
                                <th class="border border-gray-300 text-right px-2 py-2" colspan="2">Total</th>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(reconciliation.links_amount) }}</td>
                            </tr>

                            <tr v-if="! reconciliation.links.length">
                                <td colspan="3" class="py-6 text-center text-gray-500">No linked transactions.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </template>

        <ConfirmDialog
            :show="showDelete"
            title="Delete reconciliation?"
            :message="reconciliation ? `Reconciliation #${reconciliation.id} will be deleted and every linked transaction reversed, restoring the balances they adjusted. This cannot be undone.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
