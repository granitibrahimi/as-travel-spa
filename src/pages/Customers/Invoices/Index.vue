<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api, {getUsersAutosuggestEndpoint} from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import InvoiceActions from './Actions.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { q: '', agent: null, agent_name: '', date_from: '', date_to: '' },
    async (params, { signal }) => castPaginated((await api.get('/customers/invoices', { params, signal })).data),
    // The agent's name rides along in the URL so the picker can show it again on Back.
    { urlOnly: ['agent_name'] },
);

// Actions side overlay for the row picked via the ⋯ button.
const selected = ref(null);

// After a delete from the actions overlay, refresh the current page.
function onInvoiceDeleted() {
    selected.value = null;
    reload();
}
</script>

<template>
    <AppLayout title="Invoices" fluid>
        <FullWidthBox v-if="auth.canAny(['customerInvoices.listAll', 'customerInvoices.listOwn'])" title="Invoices" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Invoice ID, ticket, customer…" />
                    <!-- AsyncSelect only reads initialOption on mount, so re-key it whenever the value changes (restore/clear). -->
                    <AsyncSelect
                        v-if="auth.can('customerInvoices.listFilterByAgent')"
                        :key="filters.agent ?? 'none'"
                        v-model="filters.agent"
                        :url="getUsersAutosuggestEndpoint()"
                        label="Agent"
                        placeholder="All agents"
                        :initial-option="filters.agent ? { name: filters.agent_name } : null"
                        @change="(option) => (filters.agent_name = option?.label ?? '')"
                    />
                    <DateInput v-model="filters.date_from" label="Date from" />
                    <DateInput v-model="filters.date_to" label="Date to" />
                    <div class="flex items-end gap-2 md:col-span-4">
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
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Destination</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Agent</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Debt</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No invoices found.</td>
                        </tr>
                        <tr v-for="invoice in (loading ? [] : apiResponse?.data ?? [])" :key="invoice.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="routeUrl('customerInvoices.show', invoice.id)" class="text-red-700 hover:underline">{{ invoice.gen_id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ invoice.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ invoice.customer.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.destination ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.user.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums" :class="invoice.debt > 0 ? 'text-amber-600' : 'font-medium text-green-600'">
                                {{ invoice.debt > 0 ? money(invoice.debt) : 'Paid' }}
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Invoice actions"
                                    @click="selected = invoice"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="1.8" />
                                        <circle cx="12" cy="12" r="1.8" />
                                        <circle cx="12" cy="19" r="1.8" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>

        <!-- Per-invoice actions — defined locally and permission-gated (Actions.vue). -->
        <InvoiceActions
            :invoice="selected"
            :show="Boolean(selected)"
            @close="selected = null"
            @deleted="onInvoiceDeleted"
        />
    </AppLayout>
</template>
