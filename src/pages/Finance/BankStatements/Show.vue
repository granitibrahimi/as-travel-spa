<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { downloadFile, openFileInNewTab } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import { transactionTypes } from './types.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import StatCard from '../../../components/StatCard.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import SideOverlay from '../../../components/SideOverlay.vue';
import InputText from '../../../components/Form/InputText.vue';
import Select from '../../../components/Form/Select.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;
const statement = ref(null);
const show = ref('all');
// After an import the create page sends the "x rows imported" message along.
const message = ref(route.query.message ?? null);
const canEdit = computed(() => auth.can('bankStatements.edit'));
const buttonClass = 'inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50';

async function load() {
    statement.value = castResource((await api.get(`/finance/bank-statements/${id}`)).data);
}

onMounted(() => {
    load();

    if (route.query.message) {
        router.replace({ query: {} });
    }
});

const lines = computed(() => (statement.value?.lines ?? []).filter((line) => show.value === 'all' || (show.value === 'open' ? line.status !== 'matched' : line.status === 'matched')));
const statusClass = { matched: '', partly: 'bg-amber-50', unmatched: 'bg-red-50/60' };

async function openFile(kind) {
    const name = kind === 'received' ? statement.value.received_file_name : statement.value.list_file_name;

    if (name?.toLowerCase().endsWith('.pdf')) {
        await openFileInNewTab(`/finance/bank-statements/${id}/files/${kind}`);
    } else {
        await downloadFile(`/finance/bank-statements/${id}/files/${kind}`, { fallbackName: name });
    }
}

const autoMatching = ref(false);

async function autoMatch() {
    autoMatching.value = true;

    try {
        message.value = castMutation((await api.post(`/finance/bank-statements/${id}/auto-match`)).data).message;
        await load();
    } finally {
        autoMatching.value = false;
    }
}

async function unmatch(line) {
    await api.put(`/finance/bank-statement-lines/${line.id}/matches`, { matches: [] });
    await load();
}

// Matching one line by hand: pick the type, find the transaction, tick it.
const matching = ref(null);
const type = ref(null);
const search = ref('');
const candidates = ref([]);
const picked = ref([]);
const matchError = ref('');
const loadingCandidates = ref(false);
const saving = ref(false);
const pickedTotal = computed(() => Math.round(candidates.value.filter((row) => picked.value.includes(row.key)).reduce((sum, row) => sum + row.amount, 0) * 100) / 100);
const pickedFits = computed(() => matching.value && Math.abs(pickedTotal.value - matching.value.amount) < 0.005);

function openMatch(line) {
    matching.value = line;
    // Money in is most often a customer payment, money out a supplier payment.
    type.value = line.matches[0]?.type ?? (line.amount > 0 ? 6 : 4);
    search.value = '';
    picked.value = line.matches.map((match) => match.key);
    matchError.value = '';
    loadCandidates();
}

async function loadCandidates() {
    loadingCandidates.value = true;

    try {
        const params = { type: type.value || undefined, q: search.value || undefined };
        const rows = castResource((await api.get(`/finance/bank-statement-lines/${matching.value.id}/candidates`, { params })).data);
        const list = Array.isArray(rows) ? rows : [];
        // Keep what is ticked from another type in view.
        const keep = candidates.value.filter((row) => picked.value.includes(row.key) && ! list.some((other) => other.key === row.key));
        candidates.value = [...keep, ...list];
    } finally {
        loadingCandidates.value = false;
    }
}

function changeType(value) {
    type.value = value;
    loadCandidates();
}

async function saveMatch() {
    matchError.value = '';
    saving.value = true;

    try {
        const matches = candidates.value
            .filter((row) => picked.value.includes(row.key))
            .map((row) => ({ type: row.type, id: row.id }));
        await api.put(`/finance/bank-statement-lines/${matching.value.id}/matches`, { matches });
        matching.value = null;
        candidates.value = [];
        await load();
    } catch (error) {
        if (error.response?.status === 422) {
            matchError.value = Object.values(error.response.data.errors ?? {}).flat().join(' ') || error.response.data.message;
        } else {
            throw error;
        }
    } finally {
        saving.value = false;
    }
}

function closeMatch() {
    matching.value = null;
    candidates.value = [];
}

const confirming = ref(false);
const deleting = ref(false);

async function destroy() {
    deleting.value = true;

    try {
        await api.delete(`/finance/bank-statements/${id}`);
        router.push(routeUrl('bankStatements.list'));
    } finally {
        deleting.value = false;
        confirming.value = false;
    }
}
</script>

<template>
    <AppLayout :title="statement ? `Bank statement ${statement.payment_method}` : 'Bank statement'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="statement ? `${statement.payment_method} · ${statement.from_date} – ${statement.to_date}` : 'Bank statement'" :collapsible="false">
                <template #actions>
                    <div v-if="statement" class="flex flex-wrap items-center gap-2">
                        <button v-if="statement.received_file_name" type="button" :class="buttonClass" @click="openFile('received')">Received File</button>
                        <button v-if="statement.list_file_name" type="button" :class="buttonClass" @click="openFile('list')">Excel list</button>
                        <Button v-if="canEdit && (statement.unmatched_count || statement.partly_count)" type="button" size="sm" :loading="autoMatching" @click="autoMatch">Match automatically again</Button>
                        <RouterLink v-if="auth.can('bankStatements.create')" :to="routeUrl('bankStatements.create', { payment_method_id: statement.payment_method_id })" :class="buttonClass">Import another</RouterLink>
                        <button v-if="auth.can('bankStatements.delete')" type="button" class="inline-flex items-center rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50" @click="confirming = true">Delete</button>
                        <RouterLink :to="routeUrl('bankStatements.list')" :class="buttonClass">Back</RouterLink>
                    </div>
                </template>

                <Loader v-if="! statement" />
                <template v-else>
                    <Alert v-if="message" type="info" class="mb-3">{{ message }}</Alert>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <StatCard label="Money in" :value="money(statement.money_in)" />
                        <StatCard label="Money out" :value="money(statement.money_out)" />
                        <StatCard label="Matched" :value="`${statement.matched_count} / ${statement.lines_count}`" :sub="statement.partly_count ? `${statement.partly_count} partly` : ''" />
                        <StatCard label="To match by hand" :value="String(statement.unmatched_count + statement.partly_count)" :accent="statement.unmatched_count + statement.partly_count > 0" />
                    </div>
                    <p class="mt-3 text-xs text-gray-500">
                        Imported by {{ statement.user ?? '—' }} on {{ statement.created_at }}<span v-if="statement.note"> · {{ statement.note }}</span>
                    </p>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="statement" title="Lines" :collapsible="false">
                <template #actions>
                    <Select v-model="show" :options="[{ value: 'all', label: 'All lines' }, { value: 'open', label: 'Not (fully) matched' }, { value: 'matched', label: 'Matched' }]" :placeholder="null" />
                </template>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">In</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Out</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 380px;">Matched to</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2" style="width: 100px;" />
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="! lines.length">
                                <td :colspan="canEdit ? 6 : 5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No lines.</td>
                            </tr>
                            <tr v-for="line in lines" :key="line.id" :class="statusClass[line.status]">
                                <td class="border border-gray-300 px-2 py-2">{{ line.date }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ line.description ?? '—' }}
                                    <span v-if="line.counterparty || line.reference" class="block text-xs text-gray-500">
                                        {{ line.counterparty }}<span v-if="line.counterparty && line.reference"> · </span>{{ line.reference }}
                                    </span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.amount > 0 ? money(line.amount) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.amount < 0 ? money(-line.amount) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span v-if="! line.matches.length" class="text-red-700">Not matched</span>
                                    <span v-for="match in line.matches" :key="match.key" class="block">
                                        <span class="text-xs text-gray-500">{{ match.type_label }}</span>
                                        <span v-if="match.missing" class="text-red-700"> #{{ match.id }} (deleted)</span>
                                        <a v-else :href="routeUrl(match.route, match.id)" target="_blank" class="ml-1 font-medium text-red-700 hover:underline">{{ match.gen_id ?? `#${match.id}` }}</a>
                                        <span class="text-xs text-gray-500"> {{ match.date }} · {{ money(match.amount) }}</span>
                                        <span v-if="match.party" class="text-xs text-gray-700"> · {{ match.party }}</span>
                                        <span v-if="match.automatic" class="ml-1 rounded bg-gray-100 px-1 text-[10px] uppercase text-gray-500" title="Matched automatically">auto</span>
                                    </span>
                                    <span v-if="line.status === 'partly'" class="block text-xs text-amber-800">
                                        {{ money(line.matched_amount) }} of {{ money(line.amount) }} matched
                                    </span>
                                </td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <button type="button" class="text-red-700 hover:underline" @click="openMatch(line)">{{ line.matches.length ? 'Change' : 'Match' }}</button>
                                    <button v-if="line.matches.length" type="button" class="ml-2 text-gray-500 hover:text-red-700" title="Remove the match" @click="unmatch(line)">✕</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>

        <SideOverlay :show="Boolean(matching)" :title="matching ? `Match ${money(matching.amount)} of ${matching.date}` : ''" :subtitle="matching ? [matching.counterparty, matching.description, matching.reference].filter(Boolean).join(' · ') : ''" @close="closeMatch">
            <div v-if="matching" class="space-y-4 text-sm">
                <div>
                    <p class="mb-1 font-medium text-gray-700">Type of payment</p>
                    <div class="flex flex-wrap gap-1">
                        <button
                            v-for="option in transactionTypes"
                            :key="option.value"
                            type="button"
                            class="rounded border px-2 py-1 text-xs"
                            :class="type === option.value ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'"
                            @click="changeType(option.value)"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>

                <form class="flex gap-2" @submit.prevent="loadCandidates">
                    <InputText v-model="search" placeholder="Number, reference, amount, customer or supplier…" class="flex-1" />
                    <Button type="submit" :loading="loadingCandidates">Search</Button>
                </form>
                <p class="text-xs text-gray-500">
                    {{ search ? 'Matching your search, any date.' : 'Within 30 days of the line.' }} Not matched to another line, the same amount first.
                    Tick what this line stands for (several when one bank line covers more payments).
                </p>

                <div class="max-h-[28rem] overflow-y-auto rounded border border-gray-200">
                    <label v-for="row in candidates" :key="row.key" class="flex cursor-pointer items-start gap-2 border-b border-gray-100 px-2 py-1.5 hover:bg-gray-50">
                        <input v-model="picked" type="checkbox" :value="row.key" class="mt-1 accent-red-600">
                        <span class="flex-1">
                            <span class="font-medium">{{ row.gen_id ?? `#${row.id}` }}</span>
                            <span class="text-gray-500"> {{ row.type_label }} · {{ row.date }}</span>
                            <span class="block text-xs text-gray-600">{{ [row.party, row.reference].filter(Boolean).join(' · ') }}</span>
                        </span>
                        <span class="tabular-nums" :class="Math.abs(row.amount - matching.amount) < 0.005 ? 'font-semibold text-green-700' : ''">{{ money(row.amount) }}</span>
                    </label>
                    <p v-if="loadingCandidates && ! candidates.length" class="px-2 py-3"><Loader /></p>
                    <p v-else-if="! candidates.length" class="px-2 py-3 text-gray-400">Nothing found. Try another type or a search.</p>
                </div>

                <p :class="pickedFits ? 'text-green-700' : 'text-gray-600'">Ticked {{ money(pickedTotal) }} of {{ money(matching.amount) }}</p>
                <Alert v-if="matchError" type="danger">{{ matchError }}</Alert>
                <div class="flex gap-2">
                    <Button type="button" variant="primary" :loading="saving" :disabled="! picked.length && ! matching.matches.length" @click="saveMatch">Save match</Button>
                    <Button type="button" @click="closeMatch">Cancel</Button>
                </div>
            </div>
        </SideOverlay>

        <ConfirmDialog
            :show="confirming"
            title="Delete this bank statement?"
            message="Its lines, matches and files are deleted. The payments and other transactions stay as they are."
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="destroy"
            @cancel="confirming = false"
        />
    </AppLayout>
</template>
