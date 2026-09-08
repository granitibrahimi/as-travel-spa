<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications.js';
import { DOCUMENT_ENTITY } from '../../../config/documentEntities.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import SupplierDetails from '../../../components/SupplierDetails.vue';
import SupplierTransactionLinks from '../../../components/SupplierTransactionLinks.vue';
import DocumentsBox from '../../../components/DocumentsBox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';
import SupplierCreditNoteActions from './Actions.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const creditNote = ref(null);

// Per-credit-note actions live in the right-side overlay (Actions.vue), same as
// Customer Invoices / Customer Credit Notes. The ⋯ button in the box header
// opens it; "Add document" there drives the DocumentsBox upload modal.
const actionsOpen = ref(false);
const documentsBox = ref(null);

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
    <AppLayout :title="creditNote ? `Credit note ${creditNote.gen_id}` : 'Credit note'" fluid>
        <Loader v-if="! creditNote" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
                <SupplierDetails :supplier="creditNote.supplier" />

                <FullWidthBox :title="`Credit note ${creditNote.gen_id}`" :collapsible="false">
                    <template #actions>
                        <button
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            aria-label="Credit note actions"
                            @click="actionsOpen = true"
                        >
                            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="12" cy="19" r="1.8" />
                            </svg>
                        </button>
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                                <td class="border border-gray-300 px-2 py-2">{{ creditNote.id }} | {{ creditNote.gen_id }}</td>
                            </tr>
                            <tr>
                                <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Internal reference</th>
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
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="creditNote.lines.length" title="Line items" :collapsible="false" class="mt-6">
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

            <FullWidthBox v-if="creditNote.links.length" title="Connected transactions" :collapsible="false" class="mt-6">
                <SupplierTransactionLinks :links="creditNote.links" :total="creditNote.links_amount" @unlink="toUnlink = $event" />
            </FullWidthBox>

            <DocumentsBox
                ref="documentsBox"
                :entity="DOCUMENT_ENTITY.SUPPLIER_CREDIT_NOTE"
                :id="creditNote.id"
                :can-manage="auth.can('supplierCreditNotes.edit')"
                :can-view="auth.can('supplierCreditNotes.show')"
                :show-add-button="false"
            />

            <!-- Per-credit-note actions — defined locally and permission-gated (Actions.vue). -->
            <SupplierCreditNoteActions
                :credit-note="creditNote"
                :show="actionsOpen"
                :show-view-action="false"
                :show-add-document="true"
                @close="actionsOpen = false"
                @add-document="documentsBox?.openUpload()"
                @deleted="router.push(routeUrl('suppliers.show', creditNote.supplier.id))"
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
