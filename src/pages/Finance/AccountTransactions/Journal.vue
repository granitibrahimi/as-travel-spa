<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const auth = useAuthStore();

const type = route.params.type;
const reference = route.params.reference;

const journal = ref(null);
const loading = ref(true);

onMounted(async () => {
    if (! auth.can('accountTransactions.journal')) {
        loading.value = false;

        return;
    }

    try {
        const { data } = await api.get(`/account-transactions/journal/${type}/${reference}`);
        journal.value = castResource(data);
    } finally {
        loading.value = false;
    }
});

const title = computed(() => journal.value
    ? `Transaction Journal — ${journal.value.type}: ${journal.value.reference}`
    : 'Transaction Journal');

const totals = computed(() => (journal.value?.transactions ?? []).reduce(
    (acc, t) => ({ debit: acc.debit + (t.debit ?? 0), credit: acc.credit + (t.credit ?? 0) }),
    { debit: 0, credit: 0 },
));
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="loading" />

            <div v-else-if="! journal || journal.transactions.length === 0" class="py-8 text-center text-gray-400">
                No account transactions found for this entity.
            </div>

            <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Gen ID</th>
                            <th class="border border-gray-300 px-2 py-2">Description</th>
                            <th class="border border-gray-300 px-2 py-2">Account</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Debit</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 130px;">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="t in journal.transactions" :key="t.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ t.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <a v-if="t.reference_url" :href="t.reference_url" target="_blank" class="text-red-700 hover:underline">{{ t.reference }}</a>
                                <span v-else>{{ t.reference }}</span>
                            </td>
                            <td class="whitespace-pre-line border border-gray-300 px-2 py-2 text-gray-700">{{ t.notes }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <a v-if="t.account_url" :href="t.account_url" target="_blank" class="text-gray-700 hover:text-red-700 hover:underline">
                                    {{ t.account }}
                                </a>
                                <span v-else class="text-gray-700">{{ t.account }}</span>
                                <div v-if="t.account_parent" class="text-xs text-gray-400">{{ t.account_parent }}</div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ t.debit === null ? '-' : money(t.debit) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ t.credit === null ? '-' : money(t.credit) }}</td>
                        </tr>
                        <tr class="bg-gray-50 font-semibold">
                            <td colspan="4" class="border border-gray-300 px-2 py-2 text-right">TOTAL</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.debit) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(totals.credit) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>
    </AppLayout>
</template>
