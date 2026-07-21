<script setup>
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../../stores/auth.js';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castPaginated } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import ActionsOverlay from '../../../components/ActionsOverlay.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();

const apiResponse = ref(null);
const loading = ref(false);
const search = ref('');

let request = null;

async function fetchCreditNotes(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/customers/credit-notes', {
            signal: controller.signal,
            params: { q: search.value || undefined, page },
        });
        apiResponse.value = castPaginated(data);
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(fetchCreditNotes);

// Actions side overlay for the row picked via the ⋯ button.
const selected = ref(null);
</script>

<template>
    <AppLayout title="Credit Notes" fluid>
        <FullWidthBox v-if="auth.canAny(['customerCreditNotes.listAll', 'customerCreditNotes.listOwn'])" title="Credit Notes" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="fetchCreditNotes()">
                <div class="w-full sm:w-80">
                    <InputText v-model="search" label="Search" placeholder="Credit note ID or ticket…" />
                </div>
                <Button type="submit" variant="primary">Search</Button>
                <Button type="button" @click="search = ''; fetchCreditNotes();">Clear</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Credit Note</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 110px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Destination</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Agent</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No credit notes found.</td>
                        </tr>
                        <tr v-for="creditNote in (loading ? [] : apiResponse?.data ?? [])" :key="creditNote.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <a v-if="creditNote.show_url" :href="creditNote.show_url" target="_blank" class="text-red-700 hover:underline">{{ creditNote.gen_id }}</a>
                                <span v-else>{{ creditNote.gen_id }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ creditNote.on_date }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ creditNote.customer ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ creditNote.destination ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ creditNote.agent ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(creditNote.amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <button
                                    type="button"
                                    class="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                    aria-label="Credit note actions"
                                    @click="selected = creditNote"
                                >
                                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="1.8" />
                                        <circle cx="12" cy="12" r="1.8" />
                                        <circle cx="12" cy="19" r="1.8" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="fetchCreditNotes" />
        </FullWidthBox>

        <!-- Per-credit-note actions (legacy credit note aside) -->
        <ActionsOverlay
            :show="Boolean(selected)"
            :title="selected?.gen_id"
            :subtitle="selected ? `${selected.customer ?? ''} · ${selected.on_date}` : ''"
            :groups="selected?.actions ?? []"
            @close="selected = null"
        >
            <a
                v-if="selected?.show_url"
                :href="selected.show_url"
                target="_blank"
                class="block w-full rounded border border-gray-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-gray-50"
            >
                View credit note ↗
            </a>
        </ActionsOverlay>
    </AppLayout>
</template>
