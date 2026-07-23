<script setup>
import { onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';

const auth = useAuthStore();

function rowActions(user) {
    return [
        ...(auth.can('vacations.showRequests') ? [{ label: 'Requests', href: routeUrl('vacations.requests', { user: user.id }) }] : []),
        ...(user.balance_id && auth.can('vacations.editBalance') ? [{ label: 'Balance', href: routeUrl('vacations.balance', user.balance_id) }] : []),
    ];
}

const users = ref(null);
const loading = ref(false);

async function fetchUsers() {
    loading.value = true;

    try {
        const { data } = await api.get('/users/vacations');
        users.value = data.data;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchUsers());
</script>

<template>
    <AppLayout title="Vacations" fluid>
        <div v-if="auth.can('vacation.viewAllUsers')">
            <FullWidthBox title="Vacation balances" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">User</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Days left</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Total days</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 130px;">Open request</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 160px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! users">
                                <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="users.length === 0">
                                <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No active users.</td>
                            </tr>
                            <tr v-for="user in (loading ? [] : users ?? [])" :key="user.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ user.name }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ user.days_left ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ user.days_total ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span v-if="user.has_open_request" class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                                    <span v-else class="text-gray-400">—</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <DropdownMenu v-if="rowActions(user).length" :items="rowActions(user)" />
                                    <span v-else class="text-gray-400">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
