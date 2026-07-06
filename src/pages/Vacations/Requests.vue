<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const userId = route.query.user;

const requests = ref(null);
const user = ref(null);
const loading = ref(false);
const recalculating = ref(false);

const statusClass = (status) => ({
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Open: 'bg-amber-100 text-amber-700',
}[status] ?? 'bg-gray-100 text-gray-600');

async function fetchRequests(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get(`/vacations/requests/${userId}`, { params: { page } });
        requests.value = { data: data.data, ...data.meta };
        user.value = data.user;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchRequests());

async function recalculate() {
    if (recalculating.value) {
        return;
    }

    recalculating.value = true;

    try {
        await api.post(`/vacations/${userId}/recalculate`);
        await fetchRequests(requests.value?.current_page ?? 1);
    } finally {
        recalculating.value = false;
    }
}
</script>

<template>
    <AppLayout :title="user ? `Vacation requests — ${user.name}` : 'Vacation requests'" fluid>
        <div v-if="auth.can('vacations.showRequests')">
            <FullWidthBox :title="user ? `Requests for ${user.name}` : 'Requests'" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2">From</th>
                                <th class="border border-gray-300 px-2 py-2">To</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Days</th>
                                <th class="border border-gray-300 px-2 py-2 text-center">Status</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! requests">
                                <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="requests.data.length === 0">
                                <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No requests.</td>
                            </tr>
                            <tr v-for="request in (loading ? [] : requests?.data ?? [])" :key="request.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">{{ request.type_label }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.from }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ request.to }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ request.working_days }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(request.status_label)">{{ request.status_label }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <RouterLink v-if="auth.can('vacations.showRequest')" :to="`/vacations/${request.id}`" class="text-red-700 hover:underline">Open</RouterLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="requests" :paginator="requests" class="mt-4" @page="fetchRequests" />

                <template #footer>
                    <Button v-if="auth.can('vacations.reCalculate')" :disabled="recalculating" @click="recalculate">
                        {{ recalculating ? 'Recalculating…' : 'Recalculate days' }}
                    </Button>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
