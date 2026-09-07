<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';
import { useNotificationsStore } from '../../../stores/notifications.js';

const route = useRoute();
const notifications = useNotificationsStore();
const id = route.params.id;

const permission = ref(null);
const processing = ref(false);

// Editable set of role ids that should hold this permission.
const selected = ref(new Set());

const allRoles = computed(() => permission.value?.all_roles ?? []);
const assignedIds = computed(() => new Set((permission.value?.roles ?? []).map((role) => role.id)));
const users = computed(() => permission.value?.users ?? []);

const dirty = computed(() => {
    const assigned = assignedIds.value;

    if (assigned.size !== selected.value.size) {
        return true;
    }

    for (const roleId of selected.value) {
        if (! assigned.has(roleId)) {
            return true;
        }
    }

    return false;
});

async function loadPermission() {
    const { data } = await api.get(`/users/permissions/${id}`);
    permission.value = castResource(data);
    selected.value = new Set(assignedIds.value);
}

onMounted(loadPermission);

function toggle(roleId) {
    const next = new Set(selected.value);

    if (next.has(roleId)) {
        next.delete(roleId);
    } else {
        next.add(roleId);
    }

    selected.value = next;
}

async function save() {
    if (processing.value || ! dirty.value) {
        return;
    }

    processing.value = true;

    try {
        await api.post(`/users/permissions/${id}/roles`, { roles: Array.from(selected.value) });
        notifications.push({
            type: 'success',
            title: 'Roles updated',
            message: permission.value ? `Roles for ${permission.value.key} were saved.` : 'Roles were saved.',
        });
        // Refetch so the assigned roles / affected users reflect the change.
        await loadPermission();
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="permission ? `Permission — ${permission.key}` : 'Permission'" fluid>
        <Loader v-if="! permission" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <!-- Details -->
                <FullWidthBox title="Details" :collapsible="false">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <th class="w-32 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Key</th>
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ permission.key }}</td>
                            </tr>
                            <tr>
                                <th class="w-32 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Group</th>
                                <td class="border border-gray-300 px-2 py-2">{{ permission.group || '—' }}</td>
                            </tr>
                            <tr>
                                <th class="w-32 border border-gray-300 bg-gray-50 px-2 py-2 text-left align-top font-medium text-gray-600">Description</th>
                                <td class="border border-gray-300 px-2 py-2 text-gray-700">{{ permission.description || '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>

                <!-- Roles -->
                <FullWidthBox :title="`Roles (${selected.size})`" :collapsible="false">
                    <p v-if="allRoles.length === 0" class="text-sm text-gray-400">No roles exist.</p>
                    <ul v-else class="divide-y divide-gray-100">
                        <li v-for="role in allRoles" :key="role.id" class="flex items-start gap-2 py-2">
                            <NiceCheckbox
                                :model-value="selected.has(role.id)"
                                @update:model-value="() => toggle(role.id)"
                            />
                            <span class="min-w-0">
                                <RouterLink
                                    :to="routeUrl('userRoles.permissions', role.id)"
                                    class="block text-sm font-medium text-red-600 hover:underline"
                                >
                                    {{ role.id }}# {{ role.name }}
                                </RouterLink>
                                <span v-if="role.description" class="block text-xs text-gray-500">{{ role.description }}</span>
                            </span>
                        </li>
                    </ul>
                </FullWidthBox>

                <!-- Users -->
                <FullWidthBox :title="`Users (${users.length})`" :collapsible="false">
                    <p v-if="users.length === 0" class="text-sm text-gray-400">No users have this permission.</p>
                    <ul v-else class="divide-y divide-gray-100">
                        <li v-for="user in users" :key="user.id" class="py-2">
                            <RouterLink :to="routeUrl('users.show', user.id)" class="text-sm text-red-600 hover:underline">
                                {{ user.id }}# {{ user.name }}
                            </RouterLink>
                        </li>
                    </ul>
                </FullWidthBox>
            </div>

            <footer class="mt-6 flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('userPermissions.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Back
                </RouterLink>
                <Button type="button" variant="primary" :disabled="processing || ! dirty" @click="save">
                    {{ processing ? 'Saving…' : 'Save roles' }}
                </Button>
            </footer>
        </template>
    </AppLayout>
</template>
