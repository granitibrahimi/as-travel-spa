<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchExpenses(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/expenses', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        apiResponse.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => fetchExpenses());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/expenses/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchExpenses(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (expense) => [
    ...(auth.can('expenses.show') ? [{ label: 'View', href: routeUrl('expenses.show', expense.id) }] : []),
    ...(auth.can('expenses.edit') ? [{ label: 'Edit', href: routeUrl('expenses.edit', expense.id) }] : []),
    ...(auth.can('expenses.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = expense) }] : []),
];
</script>

<template>
    <AppLayout title="Expenses" fluid>
        <FullWidthBox title="Expenses" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchExpenses()">
                <input v-model="search" type="text" placeholder="ID or reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchExpenses();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Payment method</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No expenses found.</td>
                        </tr>
                        <tr v-for="expense in (loading ? [] : apiResponse?.data ?? [])" :key="expense.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ expense.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ expense.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ expense.payment_method }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(expense.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ expense.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(expense)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchExpenses" />

            <template #footer>
                <RouterLink v-if="auth.can('expenses.create')" :to="routeUrl('expenses.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Expense
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete expense?"
            :message="toDelete ? `${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
