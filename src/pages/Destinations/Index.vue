<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Alert from '../../components/Alert.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

// All data comes from the platform JSON API (bearer token). Paths are relative
// to the api client's base (VITE_API_URL, e.g. https://csrm.test/api/v1).
const auth = useAuthStore();

const destinations = ref(null);
const loading = ref(false);
const search = ref('');
const error = ref('');

let request = null;

async function fetchDestinations(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/destinations', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        // Resource collection envelope: rows in `data`, paginator in `meta`.
        destinations.value = { data: data.data, ...data.meta };
    } catch (e) {
        if (e.code !== 'ERR_CANCELED') {
            throw e;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => fetchDestinations());

const destinationToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    error.value = '';

    try {
        await api.delete(`/destinations/${destinationToDelete.value.id}`);
        destinationToDelete.value = null;
        await fetchDestinations(destinations.value?.current_page ?? 1);
    } catch (e) {
        if (e.response?.status === 409) {
            error.value = e.response.data.message;
            destinationToDelete.value = null;
        } else {
            throw e;
        }
    } finally {
        deleting.value = false;
    }
}

const rowActions = (destination) => [
    ...(auth.can('destinations.edit') ? [{ label: 'Edit', href: `/destinations/${destination.id}/edit` }] : []),
    ...(auth.can('destinations.delete') ? [{ label: 'Delete', danger: true, action: () => (destinationToDelete.value = destination) }] : []),
];
</script>

<template>
    <AppLayout title="Destinations" fluid>
        <FullWidthBox title="Destinations" :collapsible="false">
            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
                <form class="flex flex-wrap items-end gap-2" @submit.prevent="fetchDestinations()">
                    <input v-model="search" type="text" placeholder="Destination or parent destination…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                    <Button type="submit" variant="primary">Search</Button>
                    <Button type="button" @click="search = ''; fetchDestinations();">Clear</Button>
                </form>
                <div class="flex flex-wrap gap-2">
                    <RouterLink v-if="auth.can('destinations.merge')" to="/destinations/merge" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-base hover:bg-gray-50">Merge</RouterLink>
                    <RouterLink v-if="auth.can('destinations.parent')" to="/destinations/parent" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-base hover:bg-gray-50">Reassign parent</RouterLink>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Parent destination</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Travelers</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! destinations">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="destinations.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No destinations found.</td>
                        </tr>
                        <tr v-for="destination in (loading ? [] : destinations?.data ?? [])" :key="destination.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ destination.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ destination.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ destination.parent_destination?.name || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ destination.persons_count }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(destination)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="destinations" :paginator="destinations" class="mt-4" @page="fetchDestinations" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('destinations.create')"
                    to="/destinations/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Destination
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(destinationToDelete)"
            title="Delete destination?"
            :message="destinationToDelete ? `${destinationToDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="destinationToDelete = null"
        />
    </AppLayout>
</template>
