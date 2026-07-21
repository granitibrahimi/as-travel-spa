<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Select from '../../../components/Form/Select.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const router = useRouter();

const apiResponse = ref(null);
const loading = ref(false);
const toDelete = ref(null);
const deleting = ref(false);

const rowActions = (transfer) => [
    ...(auth.can('accountTransfers.show') ? [{ label: 'View', href: routeUrl('accountTransfers.show', transfer.id) }] : []),
    ...(auth.can('accountTransfers.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = transfer) }] : []),
];

const filters = reactive({
    q: '',
    direction: null,
    date_from: '',
    date_to: '',
});

const directions = [
    { value: 'in', label: 'Into petty cash' },
    { value: 'out', label: 'Out of petty cash' },
];

let request = null;

async function fetchTransfers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/petty-cash/transfers', {
            signal: controller.signal,
            params: {
                q: filters.q || undefined,
                direction: filters.direction || undefined,
                date_from: filters.date_from || undefined,
                date_to: filters.date_to || undefined,
                page,
            },
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

async function confirmDelete() {
    if (deleting.value || ! toDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/account-transfers/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchTransfers(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

onMounted(() => fetchTransfers());
</script>

<template>
    <AppLayout title="Petty Cash — Transfers" fluid>
        <FullWidthBox title="Petty Cash Transfers" :collapsible="false">
            <form class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5" @submit.prevent="fetchTransfers()">
                <InputText v-model="filters.q" label="Search" placeholder="ID or note…" />
                <Select v-model="filters.direction" :options="directions" label="Direction" placeholder="All" />
                <DateInput v-model="filters.date_from" label="From" />
                <DateInput v-model="filters.date_to" label="To" />
                <div class="flex items-end gap-2">
                    <Button type="submit" variant="primary">Filter</Button>
                    <Button type="button" @click="filters.q = ''; filters.direction = null; filters.date_from = ''; filters.date_to = ''; fetchTransfers();">Clear</Button>
                </div>
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
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No petty cash transfers found.</td>
                        </tr>
                        <tr
                            v-for="transfer in (loading ? [] : apiResponse?.data ?? [])"
                            :key="transfer.id"
                            class="cursor-pointer hover:bg-gray-50"
                            @click="router.push(routeUrl('accountTransfers.show', transfer.id))"
                        >
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ transfer.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.from_account }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ transfer.to_account }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(transfer.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ transfer.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center" @click.stop>
                                <DropdownMenu v-if="rowActions(transfer).length" :items="rowActions(transfer)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchTransfers" />

            <template #footer>
                <div class="flex gap-2">
                    <RouterLink v-if="auth.can('pettyCash.deposit')" :to="routeUrl('pettyCash.deposit')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                        Daily Cash → Petty Cash
                    </RouterLink>
                    <RouterLink v-if="auth.can('pettyCash.depositFromBank')" :to="routeUrl('pettyCash.depositFromBank')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Bank → Petty Cash
                    </RouterLink>
                </div>
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

