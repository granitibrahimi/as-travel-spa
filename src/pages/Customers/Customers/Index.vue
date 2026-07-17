<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import CustomerActions from './Actions.vue';
import Loader from '../../../components/Loader.vue';

const customers = ref(null);
const loading = ref(false);
const search = ref('');

// Row picked via the ⋯ button — opens the actions side overlay.
const selected = ref(null);

let request = null;

async function fetchCustomers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/customers', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        customers.value = { data: data.data, ...data.pagination };
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

onMounted(() => fetchCustomers());

// After a delete from the actions overlay, refresh the current page.
function onCustomerDeleted() {
    selected.value = null;
    fetchCustomers(customers.value?.current_page ?? 1);
}
</script>

<template>
    <AppLayout title="Customers" fluid>
        <FullWidthBox title="Customers" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchCustomers()">
                <div class="w-full sm:w-72">
                    <InputText v-model="search" label="Search" placeholder="Name, email, unique ID…" />
                </div>
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchCustomers();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Unique ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Email</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Phone</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! customers">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="customers.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No customers found.</td>
                        </tr>
                        <tr v-for="customer in (loading ? [] : customers?.data ?? [])" :key="customer.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ customer.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ customer.unique_id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/customers/${customer.id}`" class="hover:text-red-700 hover:underline">{{ customer.full_name }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.email ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.phone ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.type }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Customer actions"
                                    @click="selected = customer"
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

            <ApiPagination v-if="customers" :paginator="customers" class="mt-4" @page="fetchCustomers" />

            <template #footer>
                <RouterLink to="/customers/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Customer
                </RouterLink>
            </template>
        </FullWidthBox>

        <!-- Per-customer actions — defined locally and permission-gated (Actions.vue). -->
        <CustomerActions
            :customer="selected"
            :show="Boolean(selected)"
            @close="selected = null"
            @deleted="onCustomerDeleted"
        />
    </AppLayout>
</template>
