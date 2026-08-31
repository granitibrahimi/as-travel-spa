<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import { routeUrl } from '../../../helpers/route.js';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import CreditNoteActions from './Actions.vue';

const route = useRoute();
const router = useRouter();
const creditNote = ref(null);
const actionsOpen = ref(false);

// Sum of the connected payments' amounts, shown in the table's total row.
const connectedTotal = computed(() =>
    (creditNote.value?.connected ?? []).reduce((sum, link) => sum + (Number(link.amount) || 0), 0),
);

async function load() {
    const { data } = await api.get(`/customers/credit-notes/${route.params.id}`);
    creditNote.value = castResource(data);
}

onMounted(load);
</script>

<template>
    <AppLayout :title="creditNote ? `Credit Note: ${creditNote.gen_id}` : 'Credit Note'" fluid>
        <Loader v-if="! creditNote" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <CustomerDetails :customer="creditNote.customer" />

                <FullWidthBox :title="creditNote.gen_id" :collapsible="false">
                    <template #actions>
                        <RouterLink
                            v-if="creditNote.related_invoice"
                            :to="routeUrl('customerInvoices.show', creditNote.related_invoice.id)"
                            class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                        >
                            Related invoice {{ creditNote.related_invoice.gen_id }}
                        </RouterLink>
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

                    <div class="space-y-6">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Agent</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Date</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.agent ?? '—' }}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.on_date }}</td>
                                    <td class="border border-gray-300 px-3 py-2 text-center">{{ creditNote.due_date ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Credit Note Total</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">SVC</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Paid value</th>
                                    <th class="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Debt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="tabular-nums">
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.amount) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.total_svc) }}</td>
                                    <td class="border border-gray-300 px-3 py-2">{{ money(creditNote.paid_amount) }}</td>
                                    <td
                                        class="border border-gray-300 px-3 py-2 font-bold"
                                        :class="creditNote.has_debt ? 'text-amber-600' : 'text-green-600'"
                                    >{{ money(creditNote.debt) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="creditNote.lines.length" title="Line items" :collapsible="false" class="mb-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="py-2 pr-2">Description</th>
                                <th class="py-2 pr-2">Destination</th>
                                <th class="py-2 pl-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="line in creditNote.lines" :key="line.id" class="border-b last:border-0">
                                <td class="py-2 pr-2">{{ line.description ?? '—' }}</td>
                                <td class="py-2 pr-2">{{ line.destination ?? '—' }}</td>
                                <td class="py-2 pl-2 text-right tabular-nums">{{ money(line.amount) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="creditNote.connected.length" title="Connected payments" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="border-b text-left text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Reference</th>
                                <th class="border border-gray-300 px-2 py-2">Date</th>
                                <th class="border border-gray-300 px-2 py-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(link, i) in creditNote.connected" :key="i" class="border-b last:border-0">
                                <td class="border border-gray-300 px-2 py-2">{{ link.reference }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ link.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(link.amount) }}</td>
                            </tr>
                            <tr>
                                <td colspan="2" class="border border-gray-300 px-2 py-2 text-right font-bold">Total</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-bold tabular-nums">{{ money(connectedTotal) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <!-- Per-credit-note actions — defined locally and permission-gated (Actions.vue). -->
            <CreditNoteActions
                :credit-note="creditNote"
                :show="actionsOpen"
                :show-view-action="false"
                @close="actionsOpen = false"
                @deleted="router.push(routeUrl('customers.show', creditNote.customer.id))"
            />
        </template>
    </AppLayout>
</template>
