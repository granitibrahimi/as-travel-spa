<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const roles = ref(null);
const loading = ref(false);
const toDelete = ref(null);
const deleting = ref(false);

async function fetchRoles() {
    loading.value = true;

    try {
        const { data } = await api.get('/roles');
        roles.value = data.data ?? data;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchRoles());

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/roles/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchRoles();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (role) => [
    ...(auth.can('roles.permissions') ? [{ label: 'Permissions', href: `/roles/${role.id}/permissions` }] : []),
    ...(auth.can('roles.edit') ? [{ label: 'Edit', href: `/roles/${role.id}/edit` }] : []),
    ...(auth.can('roles.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = role) }] : []),
];
</script>

<template>
    <AppLayout title="Roles" fluid>
        <FullWidthBox title="Roles" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Description</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Permissions</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! roles">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="roles.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No roles found.</td>
                        </tr>
                        <tr v-for="role in (loading ? [] : roles ?? [])" :key="role.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ role.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ role.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ role.description }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <RouterLink v-if="auth.can('roles.permissions')" :to="`/roles/${role.id}/permissions`" class="text-blue-600 hover:underline">
                                    {{ role.permissions_count }}
                                </RouterLink>
                                <span v-else>{{ role.permissions_count }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(role)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <template #footer>
                <div class="flex items-center gap-3">
                    <RouterLink v-if="auth.can('roles.allPermissions')" to="/permissions" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        All permissions
                    </RouterLink>
                    <RouterLink v-if="auth.can('roles.create')" to="/roles/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                        + Role
                    </RouterLink>
                </div>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete role?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
