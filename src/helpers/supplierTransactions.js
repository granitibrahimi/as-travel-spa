// Maps a supplier transaction (as returned by SupplierTransactionResource:
// `type` is the enum display name, `id` the record id) to its in-SPA detail
// route. Returns null for types without a detail page (e.g. Expense).
const PATHS = {
    Bill: 'suppliers/bills',
    'Credit Note': 'suppliers/credit-notes',
    Payment: 'suppliers/payments',
    Refund: 'suppliers/refunds',
    'Gift Card': 'suppliers/gift-cards',
    Deposit: 'suppliers/deposits',
    Journal: 'journals',
};

export function supplierTransactionPath({ type, id }) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}
