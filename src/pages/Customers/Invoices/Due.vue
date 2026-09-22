<script setup>
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '../../../stores/auth.js';
import { useFormOptionsStore } from '../../../stores/formOptions.js';
import { money } from '../../../helpers/money.js';
import api, { getUsersAutosuggestEndpoint } from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import SideOverlay from '../../../components/SideOverlay.vue';
import Loader from '../../../components/Loader.vue';
import {RouterLink} from "vue-router";
import routeUrl from "../../../helpers/route.js";

const auth = useAuthStore();
const formOptions = useFormOptionsStore();

// Dropdown reference data from the shared form-options store.
const customerTypes = computed(() =>
    formOptions.customerTypes.map((type) => ({ value: type.value ?? type.id, label: type.label ?? type.name })),
);

const parentDestinationOptions = computed(() =>
    formOptions.parentDestinations.map((pd) => ({ value: pd.value ?? pd.id, label: pd.label ?? pd.name })),
);

const contactTypes = computed(() =>
    formOptions.personContractReferenceTypes.map((type) => ({ value: type.value ?? type.id, label: type.label ?? type.name })),
);

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage } = useListFilters(
    { q: '', agent: null, agent_name: '', parent_destination: null, customer_type: null, due_from: '', due_to: '' },
    async (params, { signal }) => castPaginated((await api.get('/customers/invoices/due', { params, signal })).data),
    // The agent's name rides along in the URL so the picker can show it again on Back.
    { urlOnly: ['agent_name'] },
);

// --- "Customer contacted" slide-over ---
const contactInvoice = ref(null);
const contactForm = reactive({ type: null, comment: '' });
const contactErrors = ref({});
const savingContact = ref(false);

function openContact(invoice) {
    contactInvoice.value = invoice;
    contactForm.type = contactTypes.value[0]?.value ?? null;
    contactForm.comment = '';
    contactErrors.value = {};
}

async function saveContact() {
    if (savingContact.value) {
        return;
    }

    savingContact.value = true;
    contactErrors.value = {};

    try {
        const { data } = await api.post(`/customers/invoices/${contactInvoice.value.id}/contact-log`, contactForm);
        // Reflect the new log immediately in the open panel.
        contactInvoice.value.contact_logs = [data, ...(contactInvoice.value.contact_logs ?? [])];
        contactForm.comment = '';
    } catch (error) {
        if (error.response?.status === 422) {
            contactErrors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        savingContact.value = false;
    }
}
</script>

<template>
    <AppLayout title="Due Invoices" fluid>
        <div v-if="auth.canAny(['customerInvoices.listAllDue', 'customerInvoices.listOwnDue'])" class="space-y-6">
            <FullWidthBox title="Due invoices" :collapsible="false">
                <template #actions>
                    <FiltersButton v-model="showFilters" :count="activeCount" />
                </template>

                <FiltersPanel :open="showFilters">
                    <form class="grid grid-cols-1 gap-3 md:grid-cols-3" @submit.prevent="apply">
                        <InputText v-model="filters.q" label="Search" placeholder="Invoice ID or ticket…" />
                        <!-- AsyncSelect only reads initialOption on mount, so re-key it whenever the value changes (restore/clear). -->
                        <AsyncSelect
                            :key="filters.agent ?? 'none'"
                            v-model="filters.agent"
                            :url="getUsersAutosuggestEndpoint()"
                            label="Agent"
                            placeholder="All agents"
                            :initial-option="filters.agent ? { name: filters.agent_name } : null"
                            @change="(option) => (filters.agent_name = option?.label ?? '')"
                        />
                        <SearchSelect v-model="filters.parent_destination" :options="parentDestinationOptions" label="Parent Destination" placeholder="All" />
                        <Select v-model="filters.customer_type" :options="customerTypes" label="Customer Type" placeholder="All types" />
                        <DateInput v-model="filters.due_from" label="Due from" />
                        <DateInput v-model="filters.due_to" label="Due to" />
                        <div class="flex items-end gap-2 md:col-span-3">
                            <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                            <Button type="button" @click="clear">Clear</Button>
                        </div>
                    </form>
                </FiltersPanel>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Invoice</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Due date</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Overdue</th>
                                <th class="border border-gray-300 px-2 py-2">Customer</th>
                                <th class="border border-gray-300 px-2 py-2">Destination</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Agent</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Open</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 140px;">Contacted</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! apiResponse">
                                <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="apiResponse.data.length === 0">
                                <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No due invoices found.</td>
                            </tr>
                            <tr v-for="invoice in (loading ? [] : apiResponse?.data ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <RouterLink :to="routeUrl('customerInvoices.show', invoice.id)" class="text-red-700 hover:underline">{{ invoice.gen_id }}</RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ invoice.due_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span class="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{{ invoice.days_overdue }}d</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.customer ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.destination ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.agent ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium tabular-nums">{{ money(invoice.open_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <button
                                        type="button"
                                        class="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                        @click="openContact(invoice)"
                                    >
                                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.5 5.5l1.13-2.26a1 1 0 011.2-.5l4.5 1.5a1 1 0 01.69.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                                        </svg>
                                        Contacted
                                        <span v-if="invoice.contact_logs?.length" class="rounded-full bg-gray-200 px-1.5 text-[10px] font-medium text-gray-600">{{ invoice.contact_logs.length }}</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
            </FullWidthBox>
        </div>

        <!-- Customer-contacted slide-over (legacy "Customer contacted" modal) -->
        <SideOverlay
            :show="Boolean(contactInvoice)"
            title="Customer contacted"
            :subtitle="contactInvoice ? `${contactInvoice.gen_id} · ${contactInvoice.customer ?? ''}` : ''"
            @close="contactInvoice = null"
        >
            <form class="space-y-4" @submit.prevent="saveContact">
                <Select v-model="contactForm.type" :options="contactTypes" label="How was the customer contacted? *" :placeholder="null" :error="contactErrors.type" />
                <Textarea v-model="contactForm.comment" label="Comment" :rows="4" :error="contactErrors.comment" />
                <Button type="submit" variant="primary" :disabled="savingContact">
                    {{ savingContact ? 'Saving…' : 'Log contact' }}
                </Button>
            </form>

            <div v-if="contactInvoice?.contact_logs?.length" class="mt-6">
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">History</p>
                <ul class="space-y-2">
                    <li v-for="log in contactInvoice.contact_logs" :key="log.id" class="rounded border border-gray-200 p-2 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-gray-700">{{ log.type }}</span>
                            <span class="text-xs text-gray-400">{{ log.created_at }}</span>
                        </div>
                        <p v-if="log.comment" class="mt-1 text-gray-600">{{ log.comment }}</p>
                        <p v-if="log.user" class="mt-1 text-xs text-gray-400">by {{ log.user }}</p>
                    </li>
                </ul>
            </div>
        </SideOverlay>
    </AppLayout>
</template>
