// Maps a customer transaction (as returned by CustomerTransactionResource:
// `type` is the enum display name, `id` the record id) to its in-SPA detail
// route. Returns null for types without a detail page.
const PATHS = {
    Invoice: 'customer-invoices',
    'Credit Note': 'customer-credit-notes',
    Payment: 'customer-payments',
    'Gift Card': 'customer-gift-cards',
    Reimbursement: 'customer-refunds',
    Journal: 'journals',
};

export function customerTransactionPath({ type, id }) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}
