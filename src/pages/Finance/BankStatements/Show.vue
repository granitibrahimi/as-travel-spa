<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money.js';
import api from '../../../helpers/api.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { downloadFile, openFileInNewTab } from '../../../helpers/download.js';
import { useAuthStore } from '../../../stores/auth.js';
import { routeUrl } from '../../../helpers/route.js';
import { createOptions, kindOf, payeeLink, postingLink, shownBalance } from './types.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import StatCard from '../../../components/StatCard.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import Loader from '../../../components/Loader.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
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
const tool = computed(() => kindOf(statement.value?.kind));
const isCard = computed(() => statement.value?.kind === 2);
const buttonClass = 'inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50';
const balance = (value) => (value === null || value === undefined ? '—' : money(shownBalance(statement.value.kind, value)));
const difference = (value) => (value === null || value === undefined ? '' : (Math.abs(value) < 0.005 ? 'No difference' : `Difference ${money(shownBalance(statement.value.kind, value))}`));
const can = (permission) => auth.can(permission);

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
const openCount = computed(() => (statement.value ? statement.value.unmatched_count + statement.value.partly_count : 0));

async function openFile(kind) {
    const name = kind === 'received' ? statement.value.received_file_name : statement.value.list_file_name;

    if (name?.toLowerCase().endsWith('.pdf')) {
        await openFileInNewTab(`/finance/bank-statements/${id}/files/${kind}`);
    } else {
        await downloadFile(`/finance/bank-statements/${id}/files/${kind}`, { fallbackName: name });
    }
}

// Refresh: tries again for the rows still open, e.g. after creating what was missing.
const refreshing = ref(false);

async function refresh() {
    refreshing.value = true;

    try {
        message.value = castMutation((await api.post(`/finance/bank-statements/${id}/auto-match`)).data).message;
        await load();
    } finally {
        refreshing.value = false;
    }
}

async function unmatch(line) {
    await api.put(`/finance/bank-statement-lines/${line.id}/matches`, { postings: [] });
    await load();
}

// Rows ticked to match together, e.g. a month of 0.10 fees booked as one payment.
const selected = ref([]);
const selectedLines = computed(() => (statement.value?.lines ?? []).filter((line) => selected.value.includes(line.id)));
const selectedTotal = computed(() => Math.round(selectedLines.value.reduce((sum, line) => sum + line.amount, 0) * 100) / 100);
const allShownSelected = computed(() => lines.value.length > 0 && lines.value.every((line) => selected.value.includes(line.id)));

function toggleAllShown(event) {
    const ids = lines.value.map((line) => line.id);
    selected.value = event.target.checked ? [...new Set([...selected.value, ...ids])] : selected.value.filter((lineId) => ! ids.includes(lineId));
}

// Matching rows by hand: tick the postings they stand for.
// `matching` is { lines, amount, date }: one row, or several matched together.
const matching = ref(null);
const search = ref('');
const candidates = ref([]);
const picked = ref([]);
const matchError = ref('');
const loadingCandidates = ref(false);
const saving = ref(false);
const pickedTotal = computed(() => Math.round(candidates.value.filter((row) => picked.value.includes(row.key)).reduce((sum, row) => sum + row.remaining, 0) * 100) / 100);
const pickedFits = computed(() => matching.value && Math.abs(pickedTotal.value - matching.value.amount) < 0.005);
// Ticked more than the rows (same direction): the rest stays on the posting for rows of a later statement.
const pickedRest = computed(() => {
    if (! matching.value || pickedFits.value || Math.sign(pickedTotal.value) !== Math.sign(matching.value.amount) || Math.abs(pickedTotal.value) < Math.abs(matching.value.amount)) {
        return null;
    }

    return Math.round((pickedTotal.value - matching.value.amount) * 100) / 100;
});

function openMatch(rows) {
    const list = Array.isArray(rows) ? rows : [rows];
    const total = Math.round(list.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
    matching.value = {
        lines: list,
        amount: total,
        title: list.length === 1 ? `Match ${money(total)} of ${list[0].date}` : `Match ${list.length} rows, ${money(total)} in all`,
        subtitle: list.length === 1 ? [list[0].counterparty, list[0].description, list[0].reference].filter(Boolean).join(' · ') : `${list[0].date} – ${list[list.length - 1].date}`,
        hasMatches: list.some((line) => line.matches.length),
    };
    search.value = '';
    candidates.value = [];
    picked.value = [...new Set(list.flatMap((line) => line.matches.filter((match) => ! match.missing).map((match) => match.key)))];
    matchError.value = '';
    loadCandidates();
}

async function loadCandidates() {
    loadingCandidates.value = true;

    try {
        const [first, ...others] = matching.value.lines;
        const params = { q: search.value || undefined, days: search.value ? 366 : undefined, lines: others.length ? others.map((line) => line.id) : undefined };
        const rows = castResource((await api.get(`/finance/bank-statement-lines/${first.id}/candidates`, { params })).data);
        const list = Array.isArray(rows) ? rows : [];
        // Keep what is ticked in view when a search no longer lists it.
        const keep = candidates.value.filter((row) => picked.value.includes(row.key) && ! list.some((other) => other.key === row.key));
        candidates.value = [...keep, ...list];
    } finally {
        loadingCandidates.value = false;
    }
}

async function saveMatch() {
    matchError.value = '';
    saving.value = true;

    try {
        await api.put(`/finance/bank-statements/${id}/matches`, { lines: matching.value.lines.map((line) => line.id), postings: picked.value });
        closeMatch();
        selected.value = [];
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

const rowActions = (line) => [
    { label: line.matches.length ? 'Change match' : 'Match by hand', action: () => openMatch(line) },
    ...(line.matches.length ? [{ label: 'Remove match', action: () => unmatch(line) }] : []),
    ...(line.status !== 'matched' ? createOptions(line, can) : []),
];

const confirming = ref(false);
const deleting = ref(false);

async function destroy() {
    deleting.value = true;

    try {
        await api.delete(`/finance/bank-statements/${id}`);
        router.push(routeUrl(tool.value.list));
    } finally {
        deleting.value = false;
        confirming.value = false;
    }
}
</script>

<template>
    <AppLayout :title="statement ? `${tool.title} · ${statement.account.number} ${statement.account.name}` : 'Reconciliation'" fluid>
        <div class="space-y-6">
            <FullWidthBox :title="statement ? `${tool.title} · ${statement.account.number} ${statement.account.name} · ${statement.from_date} – ${statement.to_date}` : 'Reconciliation'" :collapsible="false">
                <template #actions>
                    <div v-if="statement" class="flex flex-wrap items-center gap-2">
                        <button v-if="statement.list_file_name" type="button" :class="buttonClass" @click="openFile('list')">Statement file</button>
                        <button v-if="statement.received_file_name" type="button" :class="buttonClass" @click="openFile('received')">Received File</button>
                        <Button v-if="canEdit && openCount" type="button" size="sm" variant="primary" :loading="refreshing" title="Try again to match the rows still open" @click="refresh">↻ Refresh</Button>
                        <RouterLink :to="routeUrl('accounts.history', statement.account.id)" target="_blank" :class="buttonClass">Account history</RouterLink>
                        <RouterLink v-if="auth.can('bankStatements.create')" :to="routeUrl(tool.create, { account_id: statement.account.id })" :class="buttonClass">Import another</RouterLink>
                        <button v-if="auth.can('bankStatements.delete')" type="button" class="inline-flex items-center rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50" @click="confirming = true">Delete</button>
                        <RouterLink :to="routeUrl(tool.list)" :class="buttonClass">Back</RouterLink>
                    </div>
                </template>

                <Loader v-if="! statement" />
                <template v-else>
                    <Alert v-if="message" type="info" class="mb-3">{{ message }}</Alert>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            :label="`${tool.balanceLabel} before (${statement.from_date})`"
                            :value="balance(statement.opening_balance)"
                            :sub="`In the app ${balance(statement.ledger_opening_balance)}. ${difference(statement.opening_difference)}`"
                            :accent="statement.opening_difference !== null && Math.abs(statement.opening_difference) >= 0.005"
                        />
                        <StatCard
                            :label="`${tool.balanceLabel} after (${statement.to_date})`"
                            :value="balance(statement.closing_balance)"
                            :sub="`In the app ${balance(statement.ledger_closing_balance)}. ${difference(statement.closing_difference)}`"
                            :accent="statement.closing_difference !== null && Math.abs(statement.closing_difference) >= 0.005"
                        />
                        <StatCard label="Matched" :value="`${statement.matched_count} / ${statement.lines_count}`" :sub="statement.partly_count ? `${statement.partly_count} partly` : `${tool.inLabel} ${money(statement.money_in)} · ${tool.outLabel} ${money(statement.money_out)}`" />
                        <StatCard label="Not found in the app" :value="String(openCount)" :sub="statement.not_on_statement.length ? `${statement.not_on_statement.length} in the app not on the statement` : ''" :accent="openCount > 0" />
                    </div>
                    <p class="mt-3 text-xs text-gray-500">
                        <span v-if="statement.account_number">{{ statement.account_number }} · </span>Imported by {{ statement.user ?? '—' }} on {{ statement.created_at }}<span v-if="statement.note"> · {{ statement.note }}</span>
                    </p>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="statement" title="Statement rows" :collapsible="false">
                <template #actions>
                    <Select v-model="show" :options="[{ value: 'all', label: 'All rows' }, { value: 'open', label: 'Not found / partly' }, { value: 'matched', label: 'Matched' }]" :placeholder="null" />
                </template>
                <p v-if="canEdit && openCount" class="mb-2 text-xs text-gray-500">
                    For a row not found in the app, use its menu to match it by hand or to create the missing entry (opens in a new tab). Then click Refresh.
                    Several rows booked as one entry (e.g. a month of bank fees in one payment): tick them and click Match ticked rows.
                </p>
                <div v-if="canEdit && selected.length" class="mb-2 flex flex-wrap items-center gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm">
                    <span>{{ selected.length }} rows ticked, {{ money(selectedTotal) }} in all</span>
                    <Button type="button" size="sm" variant="primary" @click="openMatch(selectedLines)">Match ticked rows</Button>
                    <button type="button" class="text-gray-600 hover:underline" @click="selected = []">Clear</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center" style="width: 36px;">
                                    <input type="checkbox" class="accent-red-600" :checked="allShownSelected" title="Tick all rows shown" @change="toggleAllShown">
                                </th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2">Description</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">{{ tool.inLabel }}</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">{{ tool.outLabel }}</th>
                                <th v-if="! isCard" class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">{{ tool.balanceLabel }}</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 380px;">In the app</th>
                                <th v-if="canEdit" class="border border-gray-300 px-2 py-2" style="width: 60px;" />
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="! lines.length">
                                <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No rows.</td>
                            </tr>
                            <tr v-for="line in lines" :key="line.id" :class="statusClass[line.status]">
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <input v-model="selected" type="checkbox" :value="line.id" class="accent-red-600">
                                </td>
                                <td class="border border-gray-300 px-2 py-2">{{ line.date }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    {{ line.description ?? '—' }}
                                    <span v-if="line.counterparty || line.reference" class="block text-xs text-gray-500">
                                        {{ [line.counterparty, line.reference].filter(Boolean).join(' · ') }}
                                    </span>
                                    <span v-if="line.details" class="block text-xs text-gray-400">{{ line.details }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.amount > 0 ? money(line.amount) : '' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ line.amount < 0 ? money(-line.amount) : '' }}</td>
                                <td v-if="! isCard" class="border border-gray-300 px-2 py-2 text-right tabular-nums text-gray-600">{{ line.balance === null ? '' : money(line.balance) }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span v-if="! line.matches.length" class="text-red-700">Not found</span>
                                    <span v-for="match in line.matches" :key="match.key" class="block">
                                        <span class="text-xs text-gray-500">{{ match.document ?? 'Posting' }}</span>
                                        <span v-if="match.missing" class="text-red-700"> #{{ match.reference_id }} (deleted or changed)</span>
                                        <a v-else-if="postingLink(match)" :href="postingLink(match)" target="_blank" class="ml-1 font-medium text-red-700 hover:underline">{{ match.label }}</a>
                                        <span v-else class="ml-1 font-medium">{{ match.label }}</span>
                                        <span class="text-xs text-gray-500"> {{ match.date }} · {{ money(match.amount) }}</span>
                                        <span v-if="match.shared_lines > 1 || (match.posting_amount !== null && Math.abs(match.posting_amount - match.amount) >= 0.005)" class="text-xs text-gray-500">
                                            of {{ money(match.posting_amount) }}<span v-if="match.shared_lines > 1">, shared by {{ match.shared_lines }} rows</span>
                                        </span>
                                        <span v-if="match.payee?.name" class="text-xs text-gray-700"> · {{ match.payee.name }}</span>
                                        <span v-if="match.automatic" class="ml-1 rounded bg-gray-100 px-1 text-[10px] uppercase text-gray-500" title="Matched automatically">auto</span>
                                    </span>
                                    <span v-if="line.status === 'partly'" class="block text-xs text-amber-800">
                                        {{ money(line.matched_amount) }} of {{ money(line.amount) }} matched
                                    </span>
                                </td>
                                <td v-if="canEdit" class="border border-gray-300 px-2 py-2 text-center">
                                    <DropdownMenu :items="rowActions(line)" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="statement && statement.not_on_statement.length" title="In the app but not on the statement" :collapsible="true">
                <p class="mb-2 text-xs text-gray-500">Postings on this account in the period that no statement row is matched to.</p>
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 100px;">Date</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 180px;">Type</th>
                                <th class="border border-gray-300 px-2 py-2">Document</th>
                                <th class="border border-gray-300 px-2 py-2">Payee</th>
                                <th class="border border-gray-300 px-2 py-2">Notes</th>
                                <th class="border border-gray-300 px-2 py-2 text-right" style="width: 120px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="posting in statement.not_on_statement" :key="posting.key">
                                <td class="border border-gray-300 px-2 py-2">{{ posting.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ posting.document }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <a v-if="postingLink(posting)" :href="postingLink(posting)" target="_blank" class="font-medium text-red-700 hover:underline">{{ posting.label }}</a>
                                    <span v-else>{{ posting.label }}</span>
                                    <span v-if="posting.reference" class="block text-xs text-gray-500">{{ posting.reference }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <a v-if="payeeLink(posting.payee)" :href="payeeLink(posting.payee)" target="_blank" class="hover:underline">{{ posting.payee.name }}</a>
                                    <span v-else>{{ posting.payee?.name ?? '' }}</span>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-xs text-gray-600">{{ posting.notes }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">
                                    {{ money(posting.remaining ?? posting.amount) }}
                                    <span v-if="posting.remaining !== undefined && Math.abs(posting.remaining - posting.amount) >= 0.005" class="block text-xs text-gray-500">left of {{ money(posting.amount) }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>
        </div>

        <SideOverlay :show="Boolean(matching)" :title="matching?.title ?? ''" :subtitle="matching?.subtitle ?? ''" @close="closeMatch">
            <div v-if="matching" class="space-y-4 text-sm">
                <form class="flex gap-2" @submit.prevent="loadCandidates">
                    <InputText v-model="search" placeholder="Number, payee, reference or amount…" class="flex-1" />
                    <Button type="submit" :loading="loadingCandidates">Search</Button>
                </form>
                <p class="text-xs text-gray-500">
                    Postings on {{ statement.account.number }} {{ statement.account.name }} not yet fully matched,
                    {{ search ? 'within a year' : 'within 30 days' }} of {{ matching.lines.length > 1 ? 'the rows' : 'the row' }}, the closest amount first.
                    Tick several when the rows cover more postings. One posting can also cover several rows: tick the rows on the page first.
                    Nothing fits? Close this and create it from the row's menu.
                </p>

                <div class="max-h-[28rem] overflow-y-auto rounded border border-gray-200">
                    <label v-for="row in candidates" :key="row.key" class="flex cursor-pointer items-start gap-2 border-b border-gray-100 px-2 py-1.5 hover:bg-gray-50">
                        <input v-model="picked" type="checkbox" :value="row.key" class="mt-1 accent-red-600">
                        <span class="flex-1">
                            <span class="font-medium">{{ row.label }}</span>
                            <span class="text-gray-500"> {{ row.document }} · {{ row.date }}</span>
                            <span class="block text-xs text-gray-600">{{ [row.payee?.name, row.reference, row.notes].filter(Boolean).join(' · ') }}</span>
                        </span>
                        <span class="text-right tabular-nums" :class="Math.abs(row.remaining - matching.amount) < 0.005 ? 'font-semibold text-green-700' : ''">
                            {{ money(row.remaining) }}
                            <span v-if="Math.abs(row.remaining - row.amount) >= 0.005" class="block text-xs font-normal text-gray-500">left of {{ money(row.amount) }}</span>
                        </span>
                    </label>
                    <p v-if="loadingCandidates && ! candidates.length" class="px-2 py-3"><Loader /></p>
                    <p v-else-if="! candidates.length" class="px-2 py-3 text-gray-400">Nothing found. Try a search, or create the entry from the row's menu.</p>
                </div>

                <p :class="pickedFits || pickedRest !== null ? 'text-green-700' : 'text-gray-600'">
                    Ticked {{ money(pickedTotal) }} of {{ money(matching.amount) }}
                    <span v-if="pickedRest !== null" class="block text-xs text-gray-600">{{ money(pickedRest) }} stays on the posting for rows of a later statement.</span>
                </p>
                <Alert v-if="matchError" type="danger">{{ matchError }}</Alert>
                <div class="flex gap-2">
                    <Button type="button" variant="primary" :loading="saving" :disabled="! picked.length && ! matching.hasMatches" @click="saveMatch">Save match</Button>
                    <Button type="button" @click="closeMatch">Cancel</Button>
                </div>
            </div>
        </SideOverlay>

        <ConfirmDialog
            :show="confirming"
            :title="`Delete this ${tool.noun}?`"
            message="Its rows, matches and files are deleted. The postings in the app stay as they are."
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="destroy"
            @cancel="confirming = false"
        />
    </AppLayout>
</template>
