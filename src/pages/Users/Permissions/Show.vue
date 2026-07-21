<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const permission = ref(null);

const roles = computed(() => permission.value?.roles ?? []);
const users = computed(() => permission.value?.users ?? []);

onMounted(async () => {
    const { data } = await api.get(`/users/permissions/${route.params.id}`);
    permission.value = castResource(data);
});
</script>

<template>
    <AppLayout :title="permission ? `Permission — ${permission.key}` : 'Permission'" fluid>
        <Loader v-if="! permission" />

        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
            <FullWidthBox :title="`Roles (${roles.length})`" :collapsible="false">
                <p v-if="roles.length === 0" class="text-sm text-gray-400">No roles have this permission.</p>
                <ul v-else class="divide-y divide-gray-100">
                    <li v-for="role in roles" :key="role.id" class="py-2">
                        <RouterLink :to="routeUrl('userRoles.permissions', role.id)" class="text-sm font-medium text-red-600 hover:underline">
                            {{ role.id}}# {{ role.name }}
                        </RouterLink>
                        <p v-if="role.description" class="text-xs text-gray-500">{{ role.description }}</p>
                    </li>
                </ul>
            </FullWidthBox>

            <!-- Users -->
            <FullWidthBox :title="`Users (${users.length})`" :collapsible="false">
                <p v-if="users.length === 0" class="text-sm text-gray-400">No users have this permission.</p>
                <ul v-else class="divide-y divide-gray-100">
                    <li v-for="user in users" :key="user.id" class="py-2">
                        <RouterLink :to="routeUrl('users.show', user.id)" class="text-sm text-red-600 hover:underline">
                            {{ user.id}}# {{ user.name }}
                        </RouterLink>
                    </li>
                </ul>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
