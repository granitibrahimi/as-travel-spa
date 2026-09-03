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
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import SupplierTransactionLinks from '../../../components/SupplierTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const journal = ref(null);
const title = computed(() => (journal.value ? `Journal ${journal.value.gen_id}` : `Journal #${id}`));

const showDelete = ref(false);
const deleting = ref(false);

// Edit/QB/Delete — the ⋯ dropdown in the box header (top-right), mirroring
// AccountTransfers/Show.vue. QB uses `qb_link` (built on the backend from
// `qb_id`, same field-name convention as Suppliers/Bills/Show.vue).
const actions = computed(() => (journal.value ? [
    ...(auth.can('journals.edit') ? [{ label: 'Edit', to: routeUrl('journals.edit', journal.value.id) }] : []),
    ...(journal.value.qb_link ? [{ label: 'QB', href: journal.value.qb_link }] : []),
    ...(auth.can('journals.delete') ? [{ label: 'Delete', danger: true, action: () => (showDelete.value = true) }] : []),
] : []));

onMounted(async () => {
    const { data } = await api.get(`/finance/journals/${id}`);
    journal.value = castResource(data);
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/finance/journals/${id}`);
        router.push(routeUrl('journals.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <template v-if="journal && actions.length" #actions>
                <DropdownMenu :items="actions" />
            </template>

            <Loader v-if="! journal" />
            <template v-else>
                <dl class="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Date</dt><dd>{{ journal.on_date }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Reference</dt><dd>{{ journal.reference || '—' }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Created by</dt><dd>{{ journal.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Notes</dt><dd>{{ journal.notes || '—' }}</dd></div>
                </dl>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 90px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Account</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2">Relation</th>
                                <th class="border border-gray-300 px-2 py-2">Tax</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Debit</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Credit</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Open amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in journal.lines" :key="line.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs text-gray-500">{{ line.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ line.account }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.description }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.relation || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.tax_type || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.debit ? money(line.debit) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.credit ? money(line.credit) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(line.open_amount) }}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="font-semibold">
                                <td class="border border-gray-300 px-2 py-2 text-right" colspan="5">Totals</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(journal.total_debit) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(journal.total_credit) }}</td>
                                <td class="border border-gray-300 px-2 py-2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </template>

            <template #footer>
                <RouterLink :to="routeUrl('journals.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to journals
                </RouterLink>
            </template>
        </FullWidthBox>

        <FullWidthBox
            v-if="journal && (journal.customer_links?.length || journal.supplier_links?.length)"
            title="Connected transactions"
            :collapsible="false"
            class="mt-6"
        >
            <div v-if="journal.customer_links?.length">
                <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Customer</h3>
                <CustomerTransactionLinks :links="journal.customer_links" />
            </div>
            <div v-if="journal.supplier_links?.length" :class="{ 'mt-6': journal.customer_links?.length }">
                <h3 class="mb-2 text-xs font-semibold uppercase text-gray-500">Supplier</h3>
                <SupplierTransactionLinks :links="journal.supplier_links" />
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="showDelete"
            title="Delete journal?"
            :message="journal ? `${journal.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
