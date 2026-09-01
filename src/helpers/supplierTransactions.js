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
    Journal: 'finance/journals',
    Reconciliation: 'suppliers/reconciliations',
};

export function supplierTransactionPath({ type, id }) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}

// Some endpoints (the supplier reconciliation detail links) return `type` as a
// `SupplierTransactionTypeEnum` object with a numeric `id` instead of the
// display label — map by id and delegate. Expense (6) has no detail page.
const PATHS_BY_TYPE_ID = {
    1: 'suppliers/payments',
    2: 'suppliers/credit-notes',
    3: 'suppliers/refunds',
    4: 'suppliers/bills',
    5: 'finance/journals',
    7: 'suppliers/gift-cards',
    8: 'suppliers/deposits',
    // Not a SupplierTransactionTypeEnum case — a sentinel the backend uses
    // for the "matched against" side of a link when it's a reconciliation
    // rather than a payment (see SupplierTransactionLinkResource).
    9: 'suppliers/reconciliations',
};

export function supplierTransactionPathById(typeId, id) {
    const segment = PATHS_BY_TYPE_ID[typeId];

    return segment ? `/${segment}/${id}` : null;
}

// The supplier transaction-links list returns `type` as the enum's display
// label (`SupplierTransactionTypeEnum::name()`) — same set of labels as PATHS
// above, so just delegate.
export function supplierTransactionPathForLabel(label, id) {
    return supplierTransactionPath({ type: label, id });
}
