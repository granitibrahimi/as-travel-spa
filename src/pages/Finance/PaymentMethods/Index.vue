<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
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

const paymentMethods = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchPaymentMethods(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/payment-methods', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        paymentMethods.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchPaymentMethods());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/payment-methods/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchPaymentMethods(paymentMethods.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (method) => [
    ...(auth.can('paymentMethods.edit') ? [{ label: 'Edit', href: `/payment-methods/${method.id}/edit` }] : []),
    ...(auth.can('paymentMethods.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = method) }] : []),
];

const flags = (method) => [
    method.incoming ? 'In' : null,
    method.outgoing ? 'Out' : null,
    method.allow_deposit ? 'Deposit' : null,
    method.allow_withdraw ? 'Withdraw' : null,
].filter(Boolean).join(', ') || '—';
</script>

<template>
    <AppLayout title="Payment methods" fluid>
        <FullWidthBox title="Payment methods" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchPaymentMethods()">
                <input v-model="search" type="text" placeholder="Name…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchPaymentMethods();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2">Account</th>
                            <th class="border border-gray-300 px-2 py-2">Flags</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! paymentMethods">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="paymentMethods.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No payment methods found.</td>
                        </tr>
                        <tr v-for="method in (loading ? [] : paymentMethods?.data ?? [])" :key="method.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ method.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ method.type_label }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ method.account ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-xs text-gray-500">{{ flags(method) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(method)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="paymentMethods" :paginator="paymentMethods" class="mt-4" @page="fetchPaymentMethods" />

            <template #footer>
                <RouterLink v-if="auth.can('paymentMethods.create')" to="/payment-methods/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Payment method
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete payment method?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
