<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const types = ref(null);
const loading = ref(false);
const q = ref('');

async function fetchTypes() {
    loading.value = true;

    try {
        const { data } = await api.get('/accounts/types');
        types.value = data.data;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchTypes());

const filtered = computed(() => {
    const list = types.value ?? [];
    const term = q.value.trim().toLowerCase();

    if (!term) {
        return list;
    }

    return list.filter((type) =>
        `${type.name} ${type.classification ?? ''} ${type.parent ?? ''}`.toLowerCase().includes(term));
});
</script>

<template>
    <AppLayout title="Account types">
        <FullWidthBox title="Account types" :collapsible="false">
            <div class="mb-4 md:max-w-sm">
                <input v-model="q" type="text" placeholder="Name or classification…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Classification</th>
                            <th class="border border-gray-300 px-2 py-2">Parent</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! types">
                            <td colspan="4" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No account types found.</td>
                        </tr>
                        <tr v-for="type in (loading ? [] : filtered)" :key="type.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ type.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ type.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ type.classification }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ type.parent || '—' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p class="mt-3 text-sm text-gray-500">Total: {{ filtered.length }}</p>
        </FullWidthBox>
    </AppLayout>
</template>
