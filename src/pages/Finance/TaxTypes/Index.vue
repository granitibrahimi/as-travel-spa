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

const taxTypes = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchTaxTypes(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/tax-types', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        taxTypes.value = { data: data.data, ...data.pagination };
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

onMounted(() => fetchTaxTypes());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/tax-types/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchTaxTypes(taxTypes.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (taxType) => [
    ...(auth.can('taxTypes.edit') ? [{ label: 'Edit', href: `/tax-types/${taxType.id}/edit` }] : []),
    ...(auth.can('taxTypes.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = taxType) }] : []),
];
</script>

<template>
    <AppLayout title="Tax types" fluid>
        <FullWidthBox title="Tax types" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchTaxTypes()">
                <input v-model="search" type="text" placeholder="Name…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchTaxTypes();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Sales</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Purchases</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Excel col.</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">QB ID</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! taxTypes">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="taxTypes.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No tax types found.</td>
                        </tr>
                        <tr v-for="taxType in (loading ? [] : taxTypes?.data ?? [])" :key="taxType.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ taxType.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ taxType.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="taxType.for_sales ? 'text-green-600' : 'text-red-500'">{{ taxType.for_sales ? '✓' : '✗' }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="taxType.for_purchases ? 'text-green-600' : 'text-red-500'">{{ taxType.for_purchases ? '✓' : '✗' }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ taxType.excel_column_id }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ taxType.qb_id ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(taxType)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="taxTypes" :paginator="taxTypes" class="mt-4" @page="fetchTaxTypes" />

            <template #footer>
                <RouterLink v-if="auth.can('taxTypes.create')" to="/tax-types/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Tax type
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete tax type?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
