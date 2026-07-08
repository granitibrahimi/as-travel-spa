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

const transfers = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchTransfers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/account-transfers', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        transfers.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchTransfers());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/account-transfers/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchTransfers(transfers.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (transfer) => [
    ...(auth.can('accountTransfers.show') ? [{ label: 'View', href: `/account-transfers/${transfer.id}` }] : []),
    ...(auth.can('accountTransfers.edit') && transfer.editable ? [{ label: 'Edit', href: `/account-transfers/${transfer.id}/edit` }] : []),
    ...(auth.can('accountTransfers.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = transfer) }] : []),
];
</script>

<template>
    <AppLayout title="Account Transfers" fluid>
        <FullWidthBox title="Account Transfers" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchTransfers()">
                <input v-model="search" type="text" placeholder="Transfer ID…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchTransfers();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">From</th>
                            <th class="border border-gray-300 px-2 py-2">To</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! transfers">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="transfers.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No transfers found.</td>
                        </tr>
                        <tr v-for="transfer in (loading ? [] : transfers?.data ?? [])" :key="transfer.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ transfer.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.from_account }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.to_account }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transfer.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ transfer.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(transfer)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="transfers" :paginator="transfers" class="mt-4" @page="fetchTransfers" />

            <template #footer>
                <RouterLink v-if="auth.can('accountTransfers.create')" to="/account-transfers/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Transfer
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete transfer?"
            :message="toDelete ? `${toDelete.gen_id} will be deleted; any approved cash it backs is returned to undeposited.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
