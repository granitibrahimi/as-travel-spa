import algoliasearch from 'algoliasearch/lite';

/**
 * Search-only Algolia client for the global "search everywhere" overlay
 * (GlobalSearch.vue). Uses the `algoliasearch/lite` build — search only, no
 * write methods — with a search-only API key, so it's safe to ship in the
 * client bundle. Configure `VITE_ALGOLIA_APP_ID` / `VITE_ALGOLIA_SEARCH_KEY`
 * per environment (see .env.example); until both are set the feature stays
 * inert (`algoliaEnabled` is false and the overlay never opens).
 */
const appId = import.meta.env.VITE_ALGOLIA_APP_ID;
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;

export const algoliaEnabled = Boolean(appId && searchKey);

let client = null;

// Lazily construct the client on first use rather than at module load, so
// importing this file has no cost when the feature is disabled.
export function getAlgoliaClient() {
    if (!algoliaEnabled) {
        return null;
    }

    if (!client) {
        client = algoliasearch(appId, searchKey);
    }

    return client;
}

// Index names, kept in one place so a rename on the Algolia side is a
// one-line change. Values must match the indices synced from the platform.
export const ALGOLIA_INDEXES = {
    customers: 'customers',
    suppliers: 'suppliers',
    supplierBills: 'supplier_bills',
    supplierCreditNotes: 'supplier_credit_notes',
    customerInvoices: 'customer_invoices',
    customerCreditNotes: 'customer_credit_notes',
};
