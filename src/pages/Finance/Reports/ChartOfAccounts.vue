<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Loader from '../../../components/Loader.vue';
import { money } from '../../../helpers/money.js';
import { routeUrl } from '../../../helpers/route.js';
import { useReport } from '../../../composables/useReport.js';

// GET /finance/reports/chart-of-accounts — the whole account list as a nested
// tree, mirroring QuickBooks' indented Chart of Accounts. Response
// (data-unwrapped by useReport): { accounts: [node] }, where a node is
// { id, parent_id, number, name, type, classification: { id, name },
//   balance, balance_with_children, children: [node] } and each level is
// ordered by account number.
//
// `balance` is the account's own postings only; postings can land directly on
// a parent as well as on its leaves, so a parent's `balance` alone can
// understate its real position. `balance_with_children` is `balance` plus
// every descendant's, rolled up the tree — the single Balance column below
// always shows that rollup (it equals `balance` for a leaf, which has no
// descendants), matching how QuickBooks' own COA report totals a parent line
// whether or not it's expanded.
const { loading, error, data, load } = useReport('/finance/reports/chart-of-accounts');

const q = ref('');

// Collapsed parent ids. The tree renders fully expanded by default; toggling a
// caret adds/removes the id here.
const collapsed = reactive(new Set());

function toggle(id) {
    collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
}

const roots = computed(() => data.value?.accounts ?? []);

function nodeMatches(node, needle) {
    const textMatch = [node.number, node.name, node.type]
        .some((field) => String(field ?? '').toLowerCase().includes(needle));

    if (textMatch) {
        return true;
    }

    // Amount search: strip grouping / currency from the query and match it
    // against either balance figure at two decimals, so typing what the
    // Balance column shows ("1,234.50", "1234.5", "-500") finds the row.
    const amountNeedle = needle.replace(/[^0-9.-]/g, '');

    if (amountNeedle === '' || ! /[0-9]/.test(amountNeedle)) {
        return false;
    }

    return [node.balance, node.balance_with_children]
        .some((value) => value != null && Number(value).toFixed(2).includes(amountNeedle));
}

// Keep a node when it matches the query or has a kept descendant, so a match
// deep in the tree stays reachable through its parents (ancestors are always
// shown). Returns a new tree; the original response is left untouched.
function filterTree(nodes, needle) {
    const out = [];

    for (const node of nodes) {
        const children = filterTree(node.children ?? [], needle);

        if (nodeMatches(node, needle) || children.length) {
            out.push({ ...node, children });
        }
    }

    return out;
}

const visibleTree = computed(() => {
    const needle = q.value.trim().toLowerCase();

    return needle ? filterTree(roots.value, needle) : roots.value;
});

// Flatten to indented rows for the table. While a query is active every parent
// is force-expanded so matches aren't hidden behind a collapsed caret.
const rows = computed(() => {
    const filtering = q.value.trim().length > 0;
    const out = [];

    const walk = (nodes, depth) => {
        for (const node of nodes) {
            const children = node.children ?? [];
            const isCollapsed = ! filtering && collapsed.has(node.id);

            out.push({ ...node, depth, hasChildren: children.length > 0, isCollapsed });

            if (children.length && ! isCollapsed) {
                walk(children, depth + 1);
            }
        }
    };

    walk(visibleTree.value, 0);

    return out;
});

onMounted(() => load());
</script>

<template>
    <AppLayout title="Chart of Accounts" fluid>
        <FullWidthBox title="Chart of Accounts" :collapsible="false">
            <form class="mb-4 md:max-w-md" @submit.prevent>
                <input
                    v-model="q"
                    type="text"
                    placeholder="Filter by number, name, type or amount…"
                    class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                >
            </form>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Number</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Type</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 140px;">Balance</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! data">
                            <td colspan="5" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="rows.length === 0">
                            <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No accounts found.</td>
                        </tr>
                        <tr v-for="row in (loading ? [] : rows)" :key="row.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-mono text-xs">{{ row.number }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <span class="flex items-center" :style="{ paddingLeft: `${row.depth * 1.25}rem` }">
                                    <button
                                        v-if="row.hasChildren"
                                        type="button"
                                        class="mr-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 hover:text-gray-700"
                                        :aria-label="row.isCollapsed ? 'Expand' : 'Collapse'"
                                        @click="toggle(row.id)"
                                    >
                                        <svg class="h-3 w-3 transition-transform" :class="row.isCollapsed ? '' : 'rotate-90'" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                    <span v-else class="mr-1 inline-block h-4 w-4 shrink-0" />
                                    <RouterLink :to="routeUrl('accounts.history', row.id)" class="hover:text-red-700 hover:underline">{{ row.name }}</RouterLink>
                                </span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ row.type }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(row.balance_with_children ?? row.balance) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <RouterLink :to="routeUrl('accounts.history', row.id)" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50">History</RouterLink>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>
    </AppLayout>
</template>
