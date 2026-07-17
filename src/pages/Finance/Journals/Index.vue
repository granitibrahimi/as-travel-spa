<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { money } from '../../../helpers/money.js';
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

const journals = ref(null);
const loading = ref(false);
const search = ref('');
const toDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchJournals(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/journals', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        journals.value = { data: data.data, ...data.pagination };
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

onMounted(() => fetchJournals());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/journals/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchJournals(journals.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

const rowActions = (journal) => [
    ...(auth.can('journals.show') ? [{ label: 'View', href: `/journals/${journal.id}` }] : []),
    ...(auth.can('journals.edit') ? [{ label: 'Edit', href: `/journals/${journal.id}/edit` }] : []),
    ...(auth.can('journals.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = journal) }] : []),
];
</script>

<template>
    <AppLayout title="Journals" fluid>
        <FullWidthBox title="Journals" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchJournals()">
                <input v-model="search" type="text" placeholder="ID or reference…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchJournals();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2">Created by</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! journals">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="journals.data.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No journals found.</td>
                        </tr>
                        <tr v-for="journal in (loading ? [] : journals?.data ?? [])" :key="journal.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ journal.gen_id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ journal.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ journal.reference }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(journal.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ journal.user }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(journal)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="journals" :paginator="journals" class="mt-4" @page="fetchJournals" />

            <template #footer>
                <RouterLink v-if="auth.can('journals.create')" to="/journals/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Journal
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete journal?"
            :message="toDelete ? `${toDelete.gen_id} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
