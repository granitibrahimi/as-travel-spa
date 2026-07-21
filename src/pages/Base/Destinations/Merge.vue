<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';

const router = useRouter();

// Merge targets (child destinations) live under /api/customers (sibling of the
// /api/v1 api client base), so addressed with an absolute URL off the origin.
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const targetsUrl = `${apiOrigin}/api/customers/child-destinations`;

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');
const target = ref(null);
const selected = ref(new Set());
const processing = ref(false);
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
            params: { q: search.value || undefined, per_page: 50, page },
        });
        apiResponse.value = castPaginated(data);
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

function toggle(id) {
    if (selected.value.has(id)) {
        selected.value.delete(id);
    } else {
        selected.value.add(id);
    }
    selected.value = new Set(selected.value);
}

async function submit() {
    error.value = '';

    if (! target.value) {
        error.value = 'Choose the destination to merge into.';

        return;
    }

    if (selected.value.size === 0) {
        error.value = 'Select at least one destination to merge.';

        return;
    }

    processing.value = true;

    try {
        await api.post('/destinations/merge', {
            parent: target.value,
            child: [...selected.value],
        });
        router.push(routeUrl('destinations.list'));
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Merge failed.';
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Merge destinations">
        <FullWidthBox title="Merge destinations" :collapsible="false">
            <Alert v-if="error" type="danger" class="mb-4">{{ error }}</Alert>

            <p class="mb-4 text-sm text-gray-500">
                The selected destinations will be merged into the target destination (orders and hotels reassigned), then removed.
            </p>

            <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <AsyncSelect
                    v-model="target"
                    :url="targetsUrl"
                    label="Merge into (target) *"
                    placeholder="Search destination…"
                />
            </div>

            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchDestinations()">
                <input v-model="search" type="text" placeholder="Search destinations…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-72">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchDestinations();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 50px;"></th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Parent destination</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Travelers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No destinations found.</td>
                        </tr>
                        <tr v-for="destination in (loading ? [] : apiResponse?.data ?? [])" :key="destination.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <input type="checkbox" :checked="selected.has(destination.id)" @change="toggle(destination.id)">
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ destination.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ destination.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ destination.parent_destination?.name || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ destination.persons_count }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchDestinations" />

            <template #footer>
                <div class="flex items-center gap-3">
                    <span class="text-sm text-gray-500">{{ selected.size }} selected</span>
                    <RouterLink :to="routeUrl('destinations.list')" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-base hover:bg-gray-50">Cancel</RouterLink>
                    <Button variant="primary" :disabled="processing" @click="submit">
                        {{ processing ? 'Merging…' : 'Merge selected' }}
                    </Button>
                </div>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
