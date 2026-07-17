<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const formOptions = useFormOptionsStore();
const users = ref(null);
const loading = ref(false);
const search = ref('');
const status = ref('');
const roleId = ref('');
const roles = computed(() => toOptions(formOptions.userRoles));
const toDelete = ref(null);
const deleting = ref(false);
const toggling = ref(null);

let request = null;

async function fetchUsers(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/users', {
            signal: controller.signal,
            params: {
                q: search.value || undefined,
                status: status.value || undefined,
                role_id: roleId.value || undefined,
                page,
            },
        });
        users.value = { data: data.data, ...data.pagination };
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

onMounted(() => {
    fetchUsers();
});

async function confirmDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        await api.delete(`/users/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchUsers(users.value?.current_page ?? 1);
    } finally {
        deleting.value = false;
    }
}

async function toggleDisabled(user) {
    if (toggling.value) return;
    toggling.value = user.id;
    try {
        await api.post(`/users/${user.id}/toggle-disabled`);
        await fetchUsers(users.value?.current_page ?? 1);
    } finally {
        toggling.value = null;
    }
}

const rowActions = (user) => [
    ...(auth.can('users.show') ? [{ label: 'Show', href: `/users/${user.id}` }] : []),
    ...(auth.can('users.edit') ? [{ label: 'Edit', href: `/users/${user.id}/edit` }] : []),
    ...(auth.can('users.toggleDisabled')
        ? [{ label: user.disabled ? 'Enable' : 'Disable', action: () => toggleDisabled(user) }]
        : []),
    ...(auth.can('users.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = user) }] : []),
];
</script>

<template>
    <AppLayout title="Users" fluid>
        <FullWidthBox title="Users" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchUsers()">
                <input v-model="search" type="text" placeholder="Name, email, phone…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-64">
                <select v-model="roleId" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                    <option value="">All roles</option>
                    <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
                </select>
                <select v-model="status" class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                </select>
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; status = ''; roleId = ''; fetchUsers();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Email</th>
                            <th class="border border-gray-300 px-2 py-2">Phone</th>
                            <th class="border border-gray-300 px-2 py-2">Role</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! users">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="users.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No users found.</td>
                        </tr>
                        <tr v-for="user in (loading ? [] : users?.data ?? [])" :key="user.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ user.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ user.name }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ user.email }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ user.phone_number ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ user.role ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="user.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                                    {{ user.disabled ? 'Disabled' : 'Active' }}
                                </span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(user)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="users" :paginator="users" class="mt-4" @page="fetchUsers" />

            <template #footer>
                <RouterLink v-if="auth.can('users.create')" to="/users/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + User
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete user?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
