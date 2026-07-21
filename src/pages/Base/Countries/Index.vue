<script setup>
import { onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const error = ref('');

async function fetchCountries(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/countries', { params: { q: search.value || undefined, page } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchCountries());

const toggling = ref(new Set());

async function toggleActive(country) {
    if (toggling.value.has(country.id)) {
        return;
    }

    toggling.value.add(country.id);

    try {
        const { data } = await api.patch(`/countries/${country.id}/toggle-active`);
        country.active = data.active;
    } finally {
        toggling.value.delete(country.id);
    }
}

const countryToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    error.value = '';

    try {
        await api.delete(`/countries/${countryToDelete.value.id}`);
        countryToDelete.value = null;
        await fetchCountries(apiResponse.value?.pagination?.current_page ?? 1);
    } catch (e) {
        if (e.response?.status === 409) {
            error.value = e.response.data.message;
            countryToDelete.value = null;
        } else {
            throw e;
        }
    } finally {
        deleting.value = false;
    }
}

const rowActions = (country) => [
    ...(auth.can('countries.edit') ? [{ label: 'Edit', href: routeUrl('countries.edit', country.id) }] : []),
    ...(auth.can('countries.delete') ? [{ label: 'Delete', danger: true, action: () => (countryToDelete.value = country) }] : []),
];
</script>

<template>
    <AppLayout title="Countries">
        <FullWidthBox title="Countries" :collapsible="false">
            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchCountries()">
                <input v-model="search" type="text" placeholder="Name, nationality, ISO…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchCountries();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Nationality</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Phone code</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">ISO2</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">ISO3</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Active</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No countries found.</td>
                        </tr>
                        <tr v-for="country in (loading ? [] : apiResponse?.data ?? [])" :key="country.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ country.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ country.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ country.nationality }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ country.phone_code }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ country.iso2 }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ country.iso3 }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <NiceCheckbox
                                    :model-value="country.active"
                                    :disabled="! auth.can('countries.toggleActive') || toggling.has(country.id)"
                                    @update:model-value="toggleActive(country)"
                                />
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(country)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchCountries" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(countryToDelete)"
            title="Delete country?"
            :message="countryToDelete ? `${countryToDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="countryToDelete = null"
        />
    </AppLayout>
</template>
