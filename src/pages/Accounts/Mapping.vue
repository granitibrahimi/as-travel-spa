<script setup>
import { onMounted, ref } from 'vue';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const settings = ref(null);
const mappings = ref(null);
const loading = ref(false);

async function fetchMapping() {
    loading.value = true;

    try {
        const { data } = await api.get('/accounts/mapping');
        settings.value = data.settings;
        mappings.value = data.mappings;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchMapping());
</script>

<template>
    <AppLayout title="Account mapping">
        <div class="space-y-6">
            <FullWidthBox title="Settings" :collapsible="false">
                <div v-if="loading || ! settings"><Loader /></div>
                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Name</th>
                                <th class="border border-gray-300 px-2 py-2">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="setting in settings" :key="setting.label" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ setting.label }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ setting.value }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Account mapping" :collapsible="false">
                <div v-if="loading || ! mappings"><Loader /></div>
                <div v-else class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Entity</th>
                                <th class="border border-gray-300 px-2 py-2">Debit</th>
                                <th class="border border-gray-300 px-2 py-2">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="mappings.length === 0">
                                <td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No mappings configured.</td>
                            </tr>
                            <tr v-for="(map, i) in mappings" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ map.entity }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ map.debit.value }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ map.credit.value }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
