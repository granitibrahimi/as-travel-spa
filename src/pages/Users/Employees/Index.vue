<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { money } from '../../../helpers/money.js';
import { taxationLabels } from '../../../helpers/payroll.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';

// GET /users/employees?q=&status=active|inactive|all — active = has an open contract.
const auth = useAuthStore();
const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage, reload } = useListFilters(
    { q: '', status: 'active' },
    async (params, { signal }) => castPaginated((await api.get('/users/employees', { params, signal })).data),
);
const statuses = [
    { value: 'active', label: 'With an active contract' },
    { value: 'inactive', label: 'Without an active contract' },
    { value: 'all', label: 'All' },
];

const toDelete = ref(null);
const deleting = ref(false);
const deleteError = ref('');

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    deleteError.value = '';

    try {
        await api.delete(`/users/employees/${toDelete.value.id}`);
        toDelete.value = null;
        await reload();
    } catch (e) {
        deleteError.value = e.response?.data?.message ?? 'The employee could not be deleted.';
        toDelete.value = null;
    } finally {
        deleting.value = false;
    }
}

const rowActions = (employee) => [
    ...(auth.can('employees.show') ? [{ label: 'Edit', href: routeUrl('employees.edit', employee.id) }] : []),
    ...(auth.can('employees.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = employee) }] : []),
];
</script>

<template>
    <AppLayout title="Employees" fluid>
        <FullWidthBox title="Employees" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-3" @submit.prevent="apply">
                    <InputText v-model="filters.q" label="Search" placeholder="Name, personal nr., email…" />
                    <Select v-model="filters.status" :options="statuses" label="Contract" placeholder="With an active contract" />
                    <div class="flex items-end gap-2 md:col-span-3">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

            <p v-if="deleteError" class="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ deleteError }}</p>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">Nr</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Personal Nr.</th>
                            <th class="border border-gray-300 px-2 py-2">User</th>
                            <th class="border border-gray-300 px-2 py-2">Bank</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Contract since</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Base salary</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Bonuses</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No employees found.</td>
                        </tr>
                        <tr v-for="(employee, index) in (loading ? [] : apiResponse?.data ?? [])" :key="employee.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ (apiResponse.pagination.from || 1) + index }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink v-if="auth.can('employees.show')" :to="routeUrl('employees.edit', employee.id)" class="hover:underline">{{ employee.name }}</RouterLink>
                                <span v-else>{{ employee.name }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 tabular-nums">{{ employee.personal_number ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ employee.user?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ employee.bank ?? '—' }}</td>
                            <template v-if="employee.active_contract">
                                <td class="border border-gray-300 px-2 py-2">{{ employee.active_contract.starts_on }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                    {{ money(employee.active_contract.base_salary) }}
                                    <span v-for="label in taxationLabels(employee.active_contract)" :key="label" class="ml-1 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">{{ label }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="employee.active_contract.with_bonuses ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'">
                                        {{ employee.active_contract.with_bonuses ? 'Yes' : 'No' }}
                                    </span>
                                </td>
                            </template>
                            <td v-else colspan="3" class="border border-gray-300 px-2 py-2 text-center text-gray-400">No active contract</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(employee)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />

            <template #footer>
                <RouterLink v-if="auth.can('employees.create')" :to="routeUrl('employees.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Employee
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete employee?"
            :message="toDelete ? `${toDelete.name} and their contracts will be permanently deleted. An employee on a saved payroll can't be deleted — end their contract instead.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
