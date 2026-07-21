<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import InputText from '../../../components/Form/InputText.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const groups = ref([]);
const loading = ref(true);
const q = ref('');
const toDelete = ref(null);
const deleting = ref(false);

async function fetchPermissions() {
    loading.value = true;

    try {
        const { data } = await api.get('/users/permissions');
        groups.value = castResource(data).groups;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchPermissions);

// View / Edit / Delete — 3 actions → the three-dots dropdown (no dedicated
// per-action permissions exist, so all gate on the page's own permission).
const rowActions = (permission) => (auth.can('roles.allPermissions') ? [
    { label: 'View', to: routeUrl('userPermissions.show', permission.id) },
    { label: 'Edit', to: routeUrl('userPermissions.edit', permission.id) },
    { label: 'Delete', danger: true, action: () => (toDelete.value = permission) },
] : []);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/users/permissions/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchPermissions();
    } finally {
        deleting.value = false;
    }
}

// Client-side filter over key + description; groups with no matches are hidden.
const filteredGroups = computed(() => {
    const term = q.value.trim().toLowerCase();

    if (!term) {
        return groups.value;
    }

    return groups.value
        .map((group) => ({
            ...group,
            permissions: group.permissions.filter((permission) =>
                `${permission.key} ${permission.description ?? ''}`.toLowerCase().includes(term)),
        }))
        .filter((group) => group.permissions.length > 0);
});
</script>

<template>
    <AppLayout title="All permissions" fluid>
        <Loader v-if="loading" />
        <div v-else class="space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div class="w-full md:max-w-sm">
                    <InputText v-model="q" label="Search permissions" placeholder="Key or description…" />
                </div>
                <RouterLink
                    v-if="auth.can('roles.allPermissions')"
                    :to="routeUrl('userPermissions.create')"
                    class="inline-block rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                >
                    + New permission
                </RouterLink>
            </div>

            <p v-if="filteredGroups.length === 0" class="text-sm text-gray-400">No permissions match “{{ q }}”.</p>

            <FullWidthBox
                v-for="group in filteredGroups"
                :key="group.group"
                :title="`${group.group} (${group.permissions.length})`"
                :collapsible="false"
            >
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Key</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="permission in group.permissions" :key="permission.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">
                                    <RouterLink :to="routeUrl('userPermissions.show', permission.id)" class="text-red-600 hover:underline">
                                        {{ permission.key }}
                                    </RouterLink>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-700">{{ permission.description }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <DropdownMenu :items="rowActions(permission)" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete permission?"
            :message="toDelete ? `${toDelete.key} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
