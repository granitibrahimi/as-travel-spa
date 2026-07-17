<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import flightsApi from '../../../helpers/flightsApi.js';
import { flightProviderName } from '../../../helpers/flightProviders.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const options = ref(null);
const loading = ref(false);
const search = ref('');
const error = ref('');

async function fetchOptions() {
    loading.value = true;
    error.value = '';

    try {
        // Each row embeds its `from` / `to` destination relations.
        const { data } = await flightsApi.get('/travel-options');
        options.value = data;
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not load travel options.';
        options.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchOptions);

const filtered = computed(() => {
    const rows = options.value ?? [];
    const q = search.value.trim().toLowerCase();

    if (!q) {
        return rows;
    }

    return rows.filter((o) =>
        [o.from?.name, o.to?.name].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
});

// Prefer the API's `provider_details` (each has a human `name`); fall back to
// mapping the raw `providers` slugs when details aren't present.
const providerNames = (option) =>
    Array.isArray(option.provider_details) && option.provider_details.length
        ? option.provider_details.map((p) => p.name)
        : (option.providers ?? []).map(flightProviderName);

const optionToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    error.value = '';

    try {
        await flightsApi.delete(`/travel-options/${optionToDelete.value.id}`);
        optionToDelete.value = null;
        await fetchOptions();
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not delete the travel option.';
        optionToDelete.value = null;
    } finally {
        deleting.value = false;
    }
}

const routeLabel = (option) => `${option.from?.name ?? '?'} → ${option.to?.name ?? '?'}`;

const rowActions = (option) => [
    { label: 'Edit', href: `/travel-options/${option.id}/edit` },
    { label: 'Delete', danger: true, action: () => (optionToDelete.value = option) },
];
</script>

<template>
    <AppLayout title="Travel Options">
        <FullWidthBox title="Travel Options" :collapsible="false">
            <template #actions>
                <RouterLink to="/travel-options/create">
                    <Button variant="primary">New travel option</Button>
                </RouterLink>
            </template>

            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent>
                <input v-model="search" type="text" placeholder="From / to destination…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <Button v-if="search" type="button" @click="search = ''">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Route</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Return</th>
                            <th class="border border-gray-300 px-2 py-2">Providers</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! options">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No travel options found.</td>
                        </tr>
                        <tr v-for="option in (loading ? [] : filtered)" :key="option.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ option.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ routeLabel(option) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span :class="option.is_return ? 'text-green-600' : 'text-gray-400'">{{ option.is_return ? 'Yes' : 'No' }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span v-if="providerNames(option).length" class="flex flex-wrap gap-1">
                                    <span v-for="name in providerNames(option)" :key="name" class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">{{ name }}</span>
                                </span>
                                <span v-else class="text-gray-400">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(option)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(optionToDelete)"
            title="Delete travel option?"
            :message="optionToDelete ? `The route ${routeLabel(optionToDelete)} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="optionToDelete = null"
        />
    </AppLayout>
</template>
