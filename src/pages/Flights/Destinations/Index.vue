<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import flightsApi from '../../../helpers/flightsApi.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const destinations = ref(null);
const loading = ref(false);
const search = ref('');
const error = ref('');

async function fetchDestinations() {
    loading.value = true;
    error.value = '';

    try {
        // Flights API returns a plain (name-ordered) array — no pagination envelope.
        const { data } = await flightsApi.get('/destinations');
        destinations.value = data;
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not load destinations.';
        destinations.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchDestinations);

const filtered = computed(() => {
    const rows = destinations.value ?? [];
    const q = search.value.trim().toLowerCase();

    if (!q) {
        return rows;
    }

    return rows.filter((d) =>
        [d.name, d.shortcut, d.country].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
});

const destinationToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    error.value = '';

    try {
        await flightsApi.delete(`/destinations/${destinationToDelete.value.id}`);
        destinationToDelete.value = null;
        await fetchDestinations();
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not delete the destination.';
        destinationToDelete.value = null;
    } finally {
        deleting.value = false;
    }
}

const rowActions = (destination) => [
    { label: 'Edit', href: `/flight-destinations/${destination.id}/edit` },
    { label: 'Delete', danger: true, action: () => (destinationToDelete.value = destination) },
];
</script>

<template>
    <AppLayout title="Flight Destinations">
        <FullWidthBox title="Flight Destinations" :collapsible="false">
            <template #actions>
                <RouterLink to="/flight-destinations/create">
                    <Button variant="primary">New destination</Button>
                </RouterLink>
            </template>

            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent>
                <input v-model="search" type="text" placeholder="Name, IATA code, country…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <Button v-if="search" type="button" @click="search = ''">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">IATA</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Country</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! destinations">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No destinations found.</td>
                        </tr>
                        <tr v-for="destination in (loading ? [] : filtered)" :key="destination.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ destination.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ destination.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ destination.shortcut || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ destination.country || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(destination)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(destinationToDelete)"
            title="Delete destination?"
            :message="destinationToDelete ? `${destinationToDelete.name} will be permanently deleted. Any travel options using it are removed too.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="destinationToDelete = null"
        />
    </AppLayout>
</template>
