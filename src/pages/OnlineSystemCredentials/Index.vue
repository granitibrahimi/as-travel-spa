<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Textarea from '../../components/Form/Textarea.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import SideOverlay from '../../components/SideOverlay.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const credentials = ref(null);
const loading = ref(false);
const search = ref('');

// Create / edit side panel.
const overlayOpen = ref(false);
const editingId = ref(null);
const processing = ref(false);
const errors = ref({});
const supplierInitial = ref(null);
const form = reactive({
    vendor_id: null,
    title: '',
    url: '',
    username: '',
    password: '',
    agent_code: '',
    note: '',
});

// Pending delete (confirmed via ConfirmDialog).
const pendingDelete = ref(null);
const deleting = ref(false);

let request = null;

async function fetchCredentials(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/online-system-credentials', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        credentials.value = { data: data.data, ...data.meta };
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

onMounted(() => fetchCredentials());

function resetForm() {
    Object.assign(form, {
        vendor_id: null, title: '', url: '', username: '', password: '', agent_code: '', note: '',
    });
    errors.value = {};
    supplierInitial.value = null;
}

function openCreate() {
    resetForm();
    editingId.value = null;
    overlayOpen.value = true;
}

async function openEdit(row) {
    resetForm();
    editingId.value = row.id;
    overlayOpen.value = true;

    const { data } = await api.get(`/online-system-credentials/${row.id}`);
    const record = data.data ?? data;
    Object.assign(form, {
        vendor_id: record.supplier?.id ?? null,
        title: record.title ?? '',
        url: record.url ?? '',
        username: record.username ?? '',
        password: '', // blank = keep stored
        agent_code: record.agent_code ?? '',
        note: record.note ?? '',
    });
    supplierInitial.value = record.supplier ? { id: record.supplier.id, name: record.supplier.name } : null;
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        if (editingId.value) {
            await api.put(`/online-system-credentials/${editingId.value}`, form);
        } else {
            await api.post('/online-system-credentials', form);
        }
        overlayOpen.value = false;
        await fetchCredentials(credentials.value?.current_page ?? 1);
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}

async function confirmDelete() {
    if (deleting.value || ! pendingDelete.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/online-system-credentials/${pendingDelete.value.id}`);
        await fetchCredentials(credentials.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
        pendingDelete.value = null;
    }
}

const rowActions = (row) => [
    ...(auth.can('onlineSystemCredentials.show') ? [{ label: 'View', href: `/online-credentials/${row.id}` }] : []),
    ...(auth.can('onlineSystemCredentials.edit') ? [{ label: 'Edit', action: () => openEdit(row) }] : []),
    ...(auth.can('onlineSystemCredentials.delete') ? [{ label: 'Delete', danger: true, action: () => (pendingDelete.value = row) }] : []),
];
</script>

<template>
    <AppLayout title="Online System Credentials" fluid>
        <FullWidthBox title="Online System Credentials" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchCredentials()">
                <div class="w-full sm:w-72">
                    <InputText v-model="search" label="Search" placeholder="Title or supplier…" />
                </div>
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchCredentials();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Title</th>
                            <th class="border border-gray-300 px-2 py-2">Supplier</th>
                            <th class="border border-gray-300 px-2 py-2">Username</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! credentials">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="credentials.data.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No credentials found.</td>
                        </tr>
                        <tr v-for="row in (loading ? [] : credentials?.data ?? [])" :key="row.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ row.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/online-credentials/${row.id}`" class="hover:text-red-700 hover:underline">{{ row.title || '—' }}</RouterLink>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.supplier?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.username }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(row)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="credentials" :paginator="credentials" class="mt-4" @page="fetchCredentials" />

            <template #footer>
                <Button v-if="auth.can('onlineSystemCredentials.create')" variant="primary" size="sm" @click="openCreate">+ Credential</Button>
            </template>
        </FullWidthBox>

        <SideOverlay :show="overlayOpen" :title="editingId ? 'Edit credential' : 'New credential'" @close="overlayOpen = false">
            <form class="space-y-4" @submit.prevent="submit">
                <AsyncSelect
                    v-model="form.vendor_id"
                    url="/suppliers"
                    :initial-option="supplierInitial"
                    label="Supplier *"
                    placeholder="Search supplier…"
                    :error="errors.vendor_id"
                />
                <InputText v-model="form.title" label="Title" :error="errors.title" />
                <InputText v-model="form.url" label="URL *" :error="errors.url" />
                <InputText v-model="form.username" label="Username *" :error="errors.username" />
                <InputText
                    v-model="form.password"
                    label="Password *"
                    type="text"
                    :placeholder="editingId ? 'Leave blank to keep current' : ''"
                    :error="errors.password"
                />
                <InputText v-model="form.agent_code" label="Agent code" :error="errors.agent_code" />
                <Textarea v-model="form.note" label="Note" :error="errors.note" />
            </form>

            <template #footer>
                <div class="flex items-center justify-end gap-3">
                    <Button type="button" @click="overlayOpen = false">Cancel</Button>
                    <Button type="button" variant="primary" :disabled="processing" @click="submit">
                        {{ processing ? 'Saving…' : (editingId ? 'Save' : 'Create') }}
                    </Button>
                </div>
            </template>
        </SideOverlay>

        <ConfirmDialog
            :show="Boolean(pendingDelete)"
            title="Are you sure?"
            :message="pendingDelete ? `Delete credential '${pendingDelete.title || pendingDelete.username}'?` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="pendingDelete = null"
        />
    </AppLayout>
</template>
