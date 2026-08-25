<script setup>
/**
 * "Search everywhere" overlay: double-tap Shift (see useDoubleShift) to open
 * a free-text box that fans a query out to every Algolia index in parallel
 * (customers, suppliers, supplier bills/credit-notes, customer
 * invoices/credit-notes) and lists matches grouped by type. Picking a result
 * routes straight to its existing SPA page — no server redirect endpoint,
 * unlike the old Blade version this replaces.
 *
 * Inert whenever VITE_ALGOLIA_APP_ID / VITE_ALGOLIA_SEARCH_KEY aren't
 * configured (see src/helpers/algolia.js) or the user isn't signed in.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useDoubleShift } from '../composables/useDoubleShift';
import { algoliaEnabled, getAlgoliaClient, ALGOLIA_INDEXES } from '../helpers/algolia';

const auth = useAuthStore();
const router = useRouter();

const open = ref(false);
const query = ref('');
const loading = ref(false);
const inputRef = ref(null);
const sections = ref([]); // [{ title, items: [{ type, id, label }] }]

useDoubleShift(() => {
    if (algoliaEnabled && auth.sessionActive) {
        openOverlay();
    }
});

function openOverlay() {
    open.value = true;
    nextTick(() => inputRef.value?.focus());
}

function close() {
    open.value = false;
    query.value = '';
    sections.value = [];
    loading.value = false;
}

// Bound at the document level (not on the dialog element) so Escape closes
// the overlay regardless of where focus happens to be, matching ConfirmDialog.
function onKeydown(event) {
    if (event.key === 'Escape') {
        close();
    }
}

watch(open, (isOpen) => {
    if (isOpen) {
        document.addEventListener('keydown', onKeydown);
    } else {
        document.removeEventListener('keydown', onKeydown);
    }
});

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

// Turn an Algolia highlight match into markup: <em> (the default highlight
// tag) becomes a styled <mark>; the rest of the value is left as Algolia
// returns it (already HTML-escaped, so this is safe to render with v-html).
function highlight(hit, attribute, fallback) {
    const value = hit?._highlightResult?.[attribute]?.value ?? fallback ?? '';

    return String(value)
        .replaceAll('<em>', '<mark class="rounded-sm bg-red-100 px-0.5 font-semibold not-italic text-red-700">')
        .replaceAll('</em>', '</mark>');
}

const SEP = ' <span class="text-gray-300">|</span> ';
const join = (parts) => parts.filter(Boolean).join(SEP);

function customerLabel(hit) {
    const company = highlight(hit, 'name', hit.name);
    const fullName = `${highlight(hit, 'first_name', hit.first_name)} ${highlight(hit, 'last_name', hit.last_name)}`.trim();

    return join([company, fullName, highlight(hit, 'email', hit.email), highlight(hit, 'phone', hit.phone)]);
}

function supplierLabel(hit) {
    return join([highlight(hit, 'name', hit.name), highlight(hit, 'email', hit.email)]);
}

// Bills, credit-notes, invoices all share the same { reference, <party>,
// amount, description } shape — `partyKey` is 'supplier' or 'customer'.
function transactionLabel(hit, partyKey) {
    return join([
        highlight(hit, 'reference', hit.reference),
        highlight(hit, partyKey, hit[partyKey]),
        highlight(hit, 'amount', hit.amount),
        highlight(hit, 'description', hit.description),
    ]);
}

const TYPE_LABELS = {
    customer: 'Customer',
    supplier: 'Supplier',
    bill: 'Bill',
    supplierCredit: 'Supplier Credit',
    invoice: 'Invoice',
    customerCredit: 'Customer Credit',
};

// Maps a hit's type to its existing SPA show route (see router/routes/*.js) —
// no server-side redirect endpoint needed, we already have these pages.
function routeFor(item) {
    switch (item.type) {
        case 'customer': return { name: 'customers.show', params: { id: item.id } };
        case 'supplier': return { name: 'suppliers.show', params: { id: item.id } };
        case 'bill': return { name: 'supplierBills.show', params: { id: item.id } };
        case 'supplierCredit': return { name: 'supplierCreditNotes.show', params: { id: item.id } };
        case 'invoice': return { name: 'customerInvoices.show', params: { id: item.id } };
        case 'customerCredit': return { name: 'customerCreditNotes.show', params: { id: item.id } };
        default: return null;
    }
}

function select(item) {
    const to = routeFor(item);
    close();

    if (to) {
        router.push(to);
    }
}

let debounceTimer = null;
let requestSeq = 0; // guards against a stale response landing after a newer one

watch(query, (value) => {
    clearTimeout(debounceTimer);
    const trimmed = value.trim();

    if (!trimmed) {
        requestSeq += 1; // drop any in-flight response
        loading.value = false;
        sections.value = [];
        return;
    }

    debounceTimer = setTimeout(() => runSearch(trimmed), 250);
});

async function runSearch(q) {
    const client = getAlgoliaClient();

    if (!client) {
        return;
    }

    const seq = ++requestSeq;
    loading.value = true;

    const hitsPerPage = 8;
    const queries = [
        { indexName: ALGOLIA_INDEXES.customers, query: q, params: { hitsPerPage } },
        { indexName: ALGOLIA_INDEXES.suppliers, query: q, params: { hitsPerPage } },
        { indexName: ALGOLIA_INDEXES.supplierBills, query: q, params: { hitsPerPage } },
        { indexName: ALGOLIA_INDEXES.supplierCreditNotes, query: q, params: { hitsPerPage } },
        { indexName: ALGOLIA_INDEXES.customerInvoices, query: q, params: { hitsPerPage } },
        { indexName: ALGOLIA_INDEXES.customerCreditNotes, query: q, params: { hitsPerPage } },
    ];

    try {
        const { results } = await client.search(queries);

        // A later keystroke's search can resolve before this one — ignore it.
        if (seq !== requestSeq) {
            return;
        }

        const [customers, suppliers, bills, supplierCredits, invoices, customerCredits] = results;
        const list = (hits, type, idKey, labelFn) => (hits ?? []).map((hit) => ({ type, id: hit[idKey], label: labelFn(hit) }));

        sections.value = [
            { title: 'Customers', items: list(customers.hits, 'customer', 'objectID', customerLabel) },
            { title: 'Suppliers', items: list(suppliers.hits, 'supplier', 'objectID', supplierLabel) },
            {
                title: 'Supplier Transactions',
                items: [
                    ...list(bills.hits, 'bill', 'billId', (hit) => transactionLabel(hit, 'supplier')),
                    ...list(supplierCredits.hits, 'supplierCredit', 'creditNoteId', (hit) => transactionLabel(hit, 'supplier')),
                ],
            },
            {
                title: 'Customer Transactions',
                items: [
                    ...list(invoices.hits, 'invoice', 'invoiceId', (hit) => transactionLabel(hit, 'customer')),
                    ...list(customerCredits.hits, 'customerCredit', 'creditNoteId', (hit) => transactionLabel(hit, 'customer')),
                ],
            },
        ].filter((section) => section.items.length > 0);
    } catch {
        if (seq === requestSeq) {
            sections.value = [];
        }
    } finally {
        if (seq === requestSeq) {
            loading.value = false;
        }
    }
}

const hasQuery = computed(() => query.value.trim().length > 0);
const hasResults = computed(() => sections.value.length > 0);
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-[60] flex justify-center overflow-y-auto p-4 pt-[10vh]"
            role="dialog"
            aria-modal="true"
        >
            <div class="absolute inset-0 bg-black/50" @click="close" />

            <div class="relative w-full max-w-2xl">
                <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xl">
                    <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" />
                        <path stroke-linecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        ref="inputRef"
                        v-model="query"
                        type="text"
                        placeholder="Search customers, suppliers, invoices, bills…"
                        class="w-full border-0 p-0 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                    >
                    <svg v-if="loading" class="h-4 w-4 shrink-0 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                </div>

                <div v-if="hasQuery" class="mt-2 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                    <p v-if="!loading && !hasResults" class="p-2 text-sm text-gray-400">No results for "{{ query }}".</p>

                    <div v-for="(section, index) in sections" :key="section.title" :class="index > 0 ? 'mt-4 border-t border-gray-100 pt-4' : ''">
                        <p class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ section.title }}</p>
                        <button
                            v-for="(item, itemIndex) in section.items"
                            :key="`${item.type}-${item.id}-${itemIndex}`"
                            type="button"
                            class="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                            @click="select(item)"
                        >
                            <svg v-if="item.type === 'customer' || item.type === 'supplier'" class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <svg v-else class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M9 8h1M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                            </svg>
                            <span class="min-w-0 flex-1">
                                <span class="font-medium text-gray-500">{{ TYPE_LABELS[item.type] }}</span>
                                <span class="text-gray-300"> | </span>
                                <!-- eslint-disable-next-line vue/no-v-html -->
                                <span v-html="item.label" />
                            </span>
                        </button>
                    </div>
                </div>

                <p class="mt-2 text-center text-xs text-gray-300">
                    Press <kbd class="rounded border border-gray-300 px-1 text-gray-400">Esc</kbd> to close
                </p>
            </div>
        </div>
    </Teleport>
</template>
