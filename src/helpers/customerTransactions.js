// Maps a customer transaction (as returned by CustomerTransactionResource:
// `type` is the enum display name, `id` the record id) to its in-SPA detail
// route. Returns null for types without a detail page.
const PATHS = {
    1: 'customers/invoices',
    2: 'customers/credit-notes',
    3: 'customers/payments',
    4: 'customers/gift-cards',
    5: 'customers/refunds',
    6: 'finance/journals',
    // Not a CustomerTransactionTypeEnum case — the sentinel the backend's
    // CustomerTransactionNewLinkResource uses when a link's "matched against"
    // side is a reconciliation rather than a payment (mirrors the supplier
    // helper's id 9).
    9: 'customers/reconciliations',
};

export function customerTransactionPath( type, id) {
    const segment = PATHS[type];

    return segment ? `/${segment}/${id}` : null;
}

// Some endpoints (the customer reconcile debit/credit transaction lists,
// customer transaction links) return `type` as this same enum's display
// label instead of its numeric id — reverse-map it and delegate.
const LABEL_TYPE_IDS = {
    Invoice: 1,
    'Credit Note': 2,
    Payment: 3,
    'Gift Card': 4,
    Refund: 5,
    Journal: 6,
};

export function customerTransactionPathForLabel(label, id) {
    return customerTransactionPath(LABEL_TYPE_IDS[label], id);
}
