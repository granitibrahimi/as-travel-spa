<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import InputText from '../../components/Form/InputText.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const parentDestination = ref(null);
const destinations = ref(null);
const q = ref('');

onMounted(async () => {
    const [parent, children] = await Promise.all([
        api.get(`/parent-destinations/${id}`),
        api.get(`/parent-destinations/${id}/destinations`),
    ]);
    parentDestination.value = parent.data.data ?? parent.data;
    destinations.value = children.data.data ?? children.data;
});

const filtered = computed(() => {
    if (! destinations.value) {
        return [];
    }

    const term = q.value.trim().toLowerCase();

    if (! term) {
        return destinations.value;
    }

    return destinations.value.filter((destination) => destination.name.toLowerCase().includes(term));
});
</script>

<template>
    <AppLayout :title="`Destinations in ${parentDestination?.name ?? ''}`">
        <FullWidthBox :title="`Destinations in ${parentDestination?.name ?? ''}`" :collapsible="false">
            <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div class="w-full md:max-w-sm">
                    <InputText v-model="q" label="Search" placeholder="Destination name…" />
                </div>
                <RouterLink to="/parent-destinations" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    ← Parent destinations
                </RouterLink>
            </div>

            <Loader v-if="! destinations" />
            <template v-else>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="filtered.length === 0">
                                <td colspan="2" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No destinations found.</td>
                            </tr>
                            <tr v-for="destination in filtered" :key="destination.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ destination.id }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ destination.name }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p class="mt-3 text-sm text-gray-500">Total: {{ filtered.length }}</p>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
