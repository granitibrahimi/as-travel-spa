// Maps a supplier transaction (as returned by SupplierTransactionResource:
// `type` is the enum display name, `id` the record id) to its in-SPA detail
// route. Returns null for types without a detail page (e.g. Expense).
const PATHS = {
    Bill: 'supplier-bills',
    'Credit Note': 'supplier-credit-notes',
    Payment: 'supplier-payments',
    Refund: 'supplier-refunds',
    'Gift Card': 'supplier-gift-cards',
    Deposit: 'supplier-deposits',
    Journal: 'journals',
};

export function supplierTransactionPath({ type, id }) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}
