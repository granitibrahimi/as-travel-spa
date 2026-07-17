<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const deposits = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchDeposits(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/bank-deposits', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        deposits.value = { data: data.data, ...data.pagination };
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

onMounted(() => fetchDeposits());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/bank-deposits/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchDeposits(deposits.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (deposit) => [
    ...(auth.can('bankDeposits.show') ? [{ label: 'View', href: `/bank-deposits/${deposit.id}` }] : []),
    ...(auth.can('accountTransactions.journal') ? [{ label: 'Journal', to: { name: 'accountTransactions.journal', params: { type: 'bank-deposit', reference: deposit.id } } }] : []),
    ...(deposit.qb_id ? [{ label: 'Open in QuickBooks', href: `https://qbo.intuit.com/app/transfer?txnId=${deposit.qb_id}` }] : []),
    ...(auth.can('bankDeposits.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = deposit) }] : []),
];
</script>

<template>
    <AppLayout title="Bank Deposits" fluid>
        <FullWidthBox title="Bank Deposits" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchDeposits()">
                <input v-model="search" type="text" placeholder="Deposit ID…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchDeposits();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Bank account</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! deposits">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="deposits.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No bank deposits found.</td>
                        </tr>
                        <tr v-for="deposit in (loading ? [] : deposits?.data ?? [])" :key="deposit.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ deposit.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ deposit.payment_method }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(deposit.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ deposit.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(deposit)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="deposits" :paginator="deposits" class="mt-4" @page="fetchDeposits" />

            <template #footer>
                <RouterLink v-if="auth.can('bankDeposits.create')" to="/bank-deposits/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Bank Deposit
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete bank deposit?"
            :message="toDelete ? `${toDelete.gen_id} will be deleted and the linked payments returned to undeposited.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
