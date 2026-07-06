<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import ActionsOverlay from '../../components/ActionsOverlay.vue';
import Loader from '../../components/Loader.vue';

// All data comes from the platform JSON API (bearer token). Paths are relative
// to the api client's base (VITE_API_URL, e.g. https://csrm.test/api/v1).
const suppliers = ref(null);
const loading = ref(false);
const search = ref('');

// Row picked via the ⋯ button — opens the actions side overlay.
const selected = ref(null);

let request = null;

async function fetchSuppliers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/suppliers', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        // Resource collection envelope: rows in `data`, paginator in `meta`.
        suppliers.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchSuppliers());
</script>

<template>
    <AppLayout title="Suppliers" fluid>
        <FullWidthBox title="Suppliers" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchSuppliers()">
                <div class="w-full sm:w-72">
                    <InputText v-model="search" label="Search" placeholder="Supplier name…" />
                </div>
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchSuppliers();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Unique ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Email</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Phone</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! suppliers">
                            <td colspan="6" class="border border-gray-300 px-2 py-2">
                                <Loader />
                            </td>
                        </tr>
                        <tr v-else-if="suppliers.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No suppliers found.</td>
                        </tr>
                        <tr v-for="supplier in (loading ? [] : suppliers?.data ?? [])" :key="supplier.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ supplier.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ supplier.unique_id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/suppliers/${supplier.id}`" class="hover:text-red-700 hover:underline">{{ supplier.name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ supplier.email ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ supplier.phone ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Supplier actions"
                                    @click="selected = supplier"
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

            <ApiPagination v-if="suppliers" :paginator="suppliers" class="mt-4" @page="fetchSuppliers" />

            <template #footer>
                <RouterLink
                    to="/suppliers/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Supplier
                </RouterLink>
            </template>
        </FullWidthBox>

        <!-- Per-supplier actions (legacy #side-overlay equivalent) -->
        <ActionsOverlay
            :show="Boolean(selected)"
            :title="selected?.name"
            :subtitle="selected ? `#${selected.id} · ${selected.unique_id ?? ''}` : ''"
            :groups="selected?.actions ?? []"
            :delete-message="selected ? `${selected.name} will be permanently deleted.` : ''"
            @close="selected = null"
        >
            <div v-if="selected" class="space-y-3">
                <RouterLink
                    :to="`/suppliers/${selected.id}`"
                    class="block w-full rounded border border-gray-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-gray-50"
                >
                    View supplier
                </RouterLink>
                <dl class="space-y-1 text-sm">
                    <div v-if="selected.email" class="flex gap-2">
                        <dt class="w-14 shrink-0 text-gray-400">Email</dt>
                        <dd class="break-all text-gray-700">{{ selected.email }}</dd>
                    </div>
                    <div v-if="selected.phone" class="flex gap-2">
                        <dt class="w-14 shrink-0 text-gray-400">Phone</dt>
                        <dd class="text-gray-700">{{ selected.phone }}</dd>
                    </div>
                </dl>
            </div>
        </ActionsOverlay>
    </AppLayout>
</template>
