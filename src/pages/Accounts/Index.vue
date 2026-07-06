<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../helpers/api';
import { money } from '../../helpers/money';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Loader from '../../components/Loader.vue';

const accounts = ref(null);
const loading = ref(false);
const q = ref('');

async function fetchAccounts() {
    loading.value = true;

    try {
        const { data } = await api.get('/accounts');
        accounts.value = data.data;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchAccounts());

const filtered = computed(() => {
    const list = accounts.value ?? [];
    const term = q.value.trim().toLowerCase();

    if (!term) {
        return list;
    }

    return list.filter((account) =>
        `${account.number ?? ''} ${account.name} ${account.type ?? ''}`.toLowerCase().includes(term));
});
</script>

<template>
    <AppLayout title="Accounts">
        <FullWidthBox title="Accounts" :collapsible="false">
            <div class="mb-4 md:max-w-sm">
                <input v-model="q" type="text" placeholder="Number, name or type…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Number</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! accounts">
                            <td colspan="4" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No accounts found.</td>
                        </tr>
                        <tr v-for="account in (loading ? [] : filtered)" :key="account.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ account.number || '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ account.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ account.type }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(account.balance) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p class="mt-3 text-sm text-gray-500">Total: {{ filtered.length }}</p>
        </FullWidthBox>
    </AppLayout>
</template>
