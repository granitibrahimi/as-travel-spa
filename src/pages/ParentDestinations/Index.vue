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
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const parentDestinations = ref(null);
const loading = ref(false);
const search = ref('');
const error = ref('');

async function fetchParentDestinations(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/parent-destinations', { params: { q: search.value || undefined, page } });
        parentDestinations.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchParentDestinations());

const toggling = ref(new Set());

async function toggleTaxesIncluded(destination) {
    if (toggling.value.has(destination.id)) {
        return;
    }

    toggling.value.add(destination.id);

    try {
        const { data } = await api.patch(`/parent-destinations/${destination.id}/toggle-taxes-included`);
        destination.taxes_included = data.taxes_included;
    } finally {
        toggling.value.delete(destination.id);
    }
}

const destinationToDelete = ref(null);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;
    error.value = '';

    try {
        await api.delete(`/parent-destinations/${destinationToDelete.value.id}`);
        destinationToDelete.value = null;
        await fetchParentDestinations(parentDestinations.value?.current_page ?? 1);
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
    ...(auth.can('parentDestinations.childDestinations') ? [{ label: `View destinations (${destination.destinations_count})`, href: `/parent-destinations/${destination.id}/destinations` }] : []),
    ...(auth.can('parentDestinations.edit') ? [{ label: 'Edit', href: `/parent-destinations/${destination.id}/edit` }] : []),
    ...(auth.can('parentDestinations.delete') ? [{ label: 'Delete', danger: true, action: () => (destinationToDelete.value = destination) }] : []),
];
</script>

<template>
    <AppLayout title="Parent Destinations" fluid>
        <FullWidthBox title="Parent Destinations" :collapsible="false">
            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchParentDestinations()">
                <input v-model="search" type="text" placeholder="Name or code…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchParentDestinations();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Code</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Taxes incl.</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 130px;">Destinations</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! parentDestinations">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="parentDestinations.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No parent destinations found.</td>
                        </tr>
                        <tr v-for="destination in (loading ? [] : parentDestinations?.data ?? [])" :key="destination.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ destination.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ destination.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span v-if="destination.code" class="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">{{ destination.code }}</span>
                                <span v-else class="text-gray-400">—</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <NiceCheckbox
                                    :model-value="destination.taxes_included"
                                    :disabled="! auth.can('parentDestinations.edit') || toggling.has(destination.id)"
                                    @update:model-value="toggleTaxesIncluded(destination)"
                                />
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <RouterLink v-if="auth.can('parentDestinations.childDestinations')" :to="`/parent-destinations/${destination.id}/destinations`" class="text-blue-600 hover:underline">
                                    {{ destination.destinations_count }}
                                </RouterLink>
                                <span v-else>{{ destination.destinations_count }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(destination)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="parentDestinations" :paginator="parentDestinations" class="mt-4" @page="fetchParentDestinations" />

            <template #footer>
                <RouterLink
                    v-if="auth.can('parentDestinations.create')"
                    to="/parent-destinations/create"
                    class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                    + Parent Destination
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(destinationToDelete)"
            title="Delete parent destination?"
            :message="destinationToDelete ? `${destinationToDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="destinationToDelete = null"
        />
    </AppLayout>
</template>
