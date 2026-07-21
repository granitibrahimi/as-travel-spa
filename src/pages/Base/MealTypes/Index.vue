<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
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

async function fetchMealTypes(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/meal-types', { params: { q: search.value || undefined, page: 1 } });
        apiResponse.value = castPaginated(data);
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchMealTypes());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/meal-types/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchMealTypes(apiResponse.value?.pagination?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (mealType) => [
    ...(auth.can('mealTypes.edit') ? [{ label: 'Edit', href: routeUrl('mealTypes.edit', mealType.id) }] : []),
    ...(auth.can('mealTypes.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = mealType) }] : []),
];
</script>

<template>
    <AppLayout title="Meal types">
        <FullWidthBox title="Meal types" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchMealTypes()">
                <input v-model="search" type="text" placeholder="Search…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchMealTypes();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="3" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No meal types found.</td>
                        </tr>
                        <tr v-for="mealType in (loading ? [] : apiResponse?.data ?? [])" :key="mealType.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ mealType.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ mealType.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(mealType)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchMealTypes" />

            <template #footer>
                <RouterLink v-if="auth.can('mealTypes.create')" :to="routeUrl('mealTypes.create')" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Meal type
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete meal type?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
