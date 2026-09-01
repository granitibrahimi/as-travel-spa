<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import SupplierTransactionLinks from '../../../components/SupplierTransactionLinks.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const auth = useAuthStore();
const creditNote = ref(null);

async function load() {
    const { data } = await api.get(`/suppliers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
}
onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this credit note and restores its open amount.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    try {
        await api.delete(`/suppliers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;
        await load();
    } finally {
        unlinking.value = false;
    }
}
</script>

<template>
    <AppLayout :title="creditNote ? `Credit note ${creditNote.gen_id}` : 'Credit note'" fluid>
        <Loader v-if="! creditNote" />

        <template v-else>
            <FullWidthBox :title="`Credit note ${creditNote.gen_id}`" :collapsible="false" class="mb-6">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Supplier</th>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.supplier.name ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.reference ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Agent</th>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.agent ?? '-' }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Amount</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(creditNote.amount) }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Paid</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ money(creditNote.paid_amount) }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Open</th>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums" :class="creditNote.open_amount > 0 ? 'text-amber-600' : 'text-green-600'">{{ money(creditNote.open_amount) }}</td>
                        </tr>
                        <tr v-if="creditNote.customer_credit_note">
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Customer credit note</th>
                            <td class="border border-gray-300 px-2 py-2"><RouterLink :to="routeUrl('customerCreditNotes.show', creditNote.customer_credit_note.id)" class="text-red-600 hover:underline">{{ creditNote.customer_credit_note.gen_id }}</RouterLink></td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Notes</th>
                            <td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ creditNote.notes ?? '-' }}</td>
                        </tr>
                    </tbody>
                </table>

                <template #footer>
                    <RouterLink :to="routeUrl('suppliers.show', creditNote.supplier.id)" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to supplier</RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.lines.length" title="Line items" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Category</th>
                                <th class="py-2 pr-2">Description</th>
                                <th class="py-2 pr-2">Tax</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in creditNote.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.category ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.tax ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.links.length" title="Connected transactions" :collapsible="false">
                <SupplierTransactionLinks :links="creditNote.links" :total="creditNote.links_amount" @unlink="toUnlink = $event" />
            </FullWidthBox>

            <DocumentsBox
                :entity="DOCUMENT_ENTITY.SUPPLIER_CREDIT_NOTE"
                :id="creditNote.id"
                :can-manage="auth.can('supplierCreditNotes.edit')"
                :can-view="auth.can('supplierCreditNotes.show')"
            />
        </template>

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
    </AppLayout>
</template>
