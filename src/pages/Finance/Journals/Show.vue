<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const id = route.params.id;

const journal = ref(null);
const title = computed(() => (journal.value ? `Journal ${journal.value.gen_id}` : `Journal #${id}`));

onMounted(async () => {
    const { data } = await api.get(`/journals/${id}`);
    journal.value = data.data ?? data;
});
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <Loader v-if="! journal" />
            <template v-else>
                <div v-if="auth.canAny(['journals.edit', 'journals.create'])" class="mb-4 flex gap-2">
                    <RouterLink
                        v-if="auth.can('journals.edit')"
                        :to="`/journals/${journal.id}/edit`"
                        class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                    >
                        Edit
                    </RouterLink>
                </div>

                <dl class="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Date</dt><dd>{{ journal.on_date }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Reference</dt><dd>{{ journal.reference || '—' }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Created by</dt><dd>{{ journal.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Notes</dt><dd>{{ journal.notes || '—' }}</dd></div>
                </dl>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Account</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2">Relation</th>
                                <th class="border border-gray-300 px-2 py-2">Tax</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Debit</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(line, i) in journal.lines" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">{{ line.account }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.description }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.relation || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ line.tax_type || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.debit ? money(line.debit) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.credit ? money(line.credit) : '' }}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr class="font-semibold">
                                <td class="border border-gray-300 px-2 py-2 text-right" colspan="4">Totals</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(journal.total_debit) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(journal.total_credit) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </template>

            <template #footer>
                <RouterLink to="/journals" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                    Back to journals
                </RouterLink>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
