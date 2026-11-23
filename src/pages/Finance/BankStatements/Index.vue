<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useFormOptionsStore } from '../../../stores/formOptions.js';
import { routeUrl } from '../../../helpers/route.js';
import { bankAccountOptions } from './types.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const formOptions = useFormOptionsStore();
const bankAccounts = computed(() => bankAccountOptions(formOptions.paymentMethods));

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { payment_method_id: null, date_from: '', date_to: '', unmatched: false },
    async (params, { signal }) => castPaginated((await api.get('/finance/bank-statements', { params, signal })).data),
);

const toDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/finance/bank-statements/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (statement) => [
    { label: 'View', href: routeUrl('bankStatements.show', statement.id) },
    ...(auth.can('bankStatements.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = statement) }] : []),
];
</script>

<template>
    <AppLayout title="Bank Statements" fluid>
        <FullWidthBox title="Bank Statements" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <SearchSelect v-model="filters.payment_method_id" :options="bankAccounts" label="Bank account" placeholder="All bank accounts" />
                    <DateInput v-model="filters.date_from" label="Date from" />
                    <DateInput v-model="filters.date_to" label="Date to" />
                    <div class="flex items-end pb-2">
                        <NiceCheckbox v-model="filters.unmatched" label="With unmatched lines" />
                    </div>
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
                            <th class="border border-gray-300 px-2 py-2" style="width: 70px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Bank account</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 200px;">Period</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 90px;">Lines</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Matched</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Net</th>
                            <th class="border border-gray-300 px-2 py-2">Imported by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No bank statements imported yet.</td>
                        </tr>
                        <tr v-for="statement in (loading ? [] : apiResponse?.data ?? [])" :key="statement.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">
                                <RouterLink :to="routeUrl('bankStatements.show', statement.id)" class="text-red-700 hover:underline">{{ statement.id }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                {{ statement.payment_method }}
                                <span v-if="statement.note" class="block text-xs text-gray-500">{{ statement.note }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ statement.from_date }} – {{ statement.to_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ statement.lines_count }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span
                                    class="rounded px-2 py-0.5 text-xs font-medium"
                                    :class="statement.unmatched_lines_count === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'"
                                >
                                    {{ statement.matched_lines_count }} / {{ statement.lines_count }}
                                </span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(statement.total) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">
                                {{ statement.user }}
                                <span class="block text-xs text-gray-400">{{ statement.created_at }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(statement)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />

            <template #footer>
                <RouterLink v-if="auth.can('bankStatements.create')" :to="routeUrl('bankStatements.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Import bank statement
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete bank statement?"
            :message="toDelete ? `The statement of ${toDelete.payment_method} (${toDelete.from_date} – ${toDelete.to_date}), its lines and matches will be deleted. The payments stay as they are.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
