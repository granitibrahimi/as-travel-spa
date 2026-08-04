// Maps a customer transaction (as returned by CustomerTransactionResource:
// `type` is the enum display name, `id` the record id) to its in-SPA detail
// route. Returns null for types without a detail page.
const PATHS = {
    1: 'customers/invoices',
    2: 'customers/credit-notes',
    3: 'customers/payments',
    4: 'customers/gift-cards',
    5: 'customers/refunds',
    6: 'journals',
};

export function customerTransactionPath({ type, id }) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}
