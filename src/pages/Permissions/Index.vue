<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import InputText from '../../components/Form/InputText.vue';
import Loader from '../../components/Loader.vue';

const groups = ref([]);
const loading = ref(true);
const q = ref('');

onMounted(async () => {
    try {
        const { data } = await api.get('/permissions');
        groups.value = data.groups;
    } finally {
        loading.value = false;
    }
});

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
            <div class="md:max-w-sm">
                <InputText v-model="q" label="Search permissions" placeholder="Key or description…" />
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
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="permission in group.permissions" :key="permission.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ permission.key }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-700">{{ permission.description }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
