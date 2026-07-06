<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const announcement = ref(null);
const viewers = ref([]);

onMounted(async () => {
    const { data } = await api.get(`/announcements/${id}/statistics`);
    announcement.value = data.announcement.data ?? data.announcement;
    viewers.value = data.viewers ?? [];
});
</script>

<template>
    <AppLayout :title="`Announcement #${id} statistics`" fluid>
        <FullWidthBox title="Announcement statistics" :collapsible="false">
            <Loader v-if="! announcement" />
            <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <dl class="space-y-2 text-sm">
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">ID</dt><dd>{{ announcement.id }}</dd></div>
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Title</dt><dd>{{ announcement.title }}</dd></div>
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Message</dt><dd class="whitespace-pre-line">{{ announcement.message }}</dd></div>
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Priority</dt><dd>{{ announcement.priority_label }}</dd></div>
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Claimed by</dt><dd>{{ announcement.assigned_to ?? '-' }}</dd></div>
                    <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Answer</dt><dd>{{ announcement.answer ?? '-' }}</dd></div>
                </dl>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">User</th>
                                <th class="border border-gray-300 px-2 py-2">First seen</th>
                                <th class="border border-gray-300 px-2 py-2">Last seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="viewers.length === 0">
                                <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No views yet.</td>
                            </tr>
                            <tr v-for="viewer in viewers" :key="viewer.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ viewer.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ viewer.name }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ viewer.first_seen_at ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ viewer.last_seen_at ?? '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <template #footer>
                <RouterLink to="/announcements" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to list
                </RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
