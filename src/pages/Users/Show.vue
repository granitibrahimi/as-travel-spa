<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const id = route.params.id;

const user = ref(null);
const title = computed(() => user.value?.name ?? `User #${id}`);

onMounted(async () => {
    const { data } = await api.get(`/users/${id}`);
    user.value = data.data ?? data;
});
</script>

<template>
    <AppLayout :title="`User #${id}`" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="! user" />
            <template v-else>
                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Name</dt>
                        <dd class="text-gray-800">{{ user.name }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Status</dt>
                        <dd>
                            <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="user.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
                                {{ user.disabled ? 'Disabled' : 'Active' }}
                            </span>
                        </dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Email</dt>
                        <dd class="break-all text-gray-800">{{ user.email }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Phone</dt>
                        <dd class="text-gray-800">{{ user.phone_number ?? '-' }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Role</dt>
                        <dd class="text-gray-800">{{ user.role ?? '-' }}</dd>
                    </div>
                    <div class="flex gap-2">
                        <dt class="w-28 shrink-0 font-medium text-gray-500">Cash account</dt>
                        <dd class="text-gray-800">{{ user.cash_account ?? '-' }}</dd>
                    </div>
                </dl>

                <div v-if="user.balance" class="mt-6">
                    <h3 class="mb-2 text-sm font-medium text-gray-700">Vacation balance</h3>
                    <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                        <div class="flex gap-2">
                            <dt class="shrink-0 font-medium text-gray-500">Leftover</dt>
                            <dd class="text-gray-800">{{ user.balance.leftover_days }}</dd>
                        </div>
                        <div class="flex gap-2">
                            <dt class="shrink-0 font-medium text-gray-500">This year</dt>
                            <dd class="text-gray-800">{{ user.balance.this_year_days }}</dd>
                        </div>
                        <div class="flex gap-2">
                            <dt class="shrink-0 font-medium text-gray-500">Used</dt>
                            <dd class="text-gray-800">{{ user.balance.days_used }}</dd>
                        </div>
                        <div class="flex gap-2">
                            <dt class="shrink-0 font-medium text-gray-500">Left</dt>
                            <dd class="text-gray-800">{{ user.balance.days_left }}</dd>
                        </div>
                    </dl>
                </div>
            </template>

            <template #footer>
                <div class="flex items-center gap-2">
                    <RouterLink to="/users" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Back to list
                    </RouterLink>
                    <RouterLink v-if="user && auth.can('users.edit')" :to="`/users/${user.id}/edit`" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                        Edit
                    </RouterLink>
                </div>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
