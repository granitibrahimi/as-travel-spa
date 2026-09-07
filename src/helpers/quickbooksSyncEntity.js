import { routeUrl } from './route.js';

// Maps a QuickBooks sync row's entity type to its in-SPA detail route.
//
// Keyed by `QuickBooksSyncDataEntityEnum` value (platform:
// `modules/QuickBooks/Enums/QuickBooksSyncDataEntityEnum.php`), exposed on the
// API as `entity_value`. The resource also returns `entity_url`, but that
// points at platform `/api/v1/...` endpoints (or `#`) and is useless as a link
// in this SPA — resolve the destination from the entity type here instead.
const ROUTE_NAMES = {
    1: 'customers.show',                // CUSTOMER
    2: 'customerInvoices.show',         // CUSTOMER_INVOICE
    3: 'suppliers.show',                // SUPPLIER
    4: 'suppliers.show',                // ITEM (product, 1-on-1 with a supplier)
    5: 'supplierBills.show',            // SUPPLIER_BILL
    6: 'expenses.show',                 // EXPENSE
    7: 'journals.show',                 // JOURNAL
    8: 'accountTransfers.show',         // ACCOUNT_TRANSFER
    9: 'customerPayments.show',         // CUSTOMER_PAYMENT
    10: 'supplierPayments.show',        // SUPPLIER_PAYMENT
    11: 'supplierCreditNotes.show',     // SUPPLIER_CREDIT_NOTE
    12: 'customerCreditNotes.show',     // CUSTOMER_CREDIT_NOTE
    13: 'bankDeposits.show',            // BANK_DEPOSIT
    14: 'customerGiftCards.show',       // CUSTOMER_GIFT_CARD
    15: 'supplierGiftCards.show',       // SUPPLIER_GIFT_CARD
    17: 'customerRefunds.show',         // CUSTOMER_REFUND
    18: 'supplierRefunds.show',         // SUPPLIER_REFUND
    19: 'supplierDeposits.show',        // SUPPLIER_DEPOSIT
    20: 'customerReconciliations.show', // CUSTOMER_RECONCILIATION
    21: 'supplierReconciliations.show', // SUPPLIER_RECONCILIATION
    // 16 PETTY_CASH_MOVEMENT has no per-record detail page in the SPA.
};

/**
 * In-SPA path for a QuickBooks sync row's linked entity, or null when the
 * entity type has no detail page (render the id as plain text then).
 *
 * @param {number|string} entityValue `entity_value` from the API resource.
 * @param {number|string} entityId    `entity_id` from the API resource.
 * @returns {string|null}
 */
export function quickBooksSyncEntityPath(entityValue, entityId) {
    const name = ROUTE_NAMES[entityValue];

    if (! name || entityId == null || entityId === '') {
        return null;
    }

    const path = routeUrl(name, entityId);

    return path === '#' ? null : path;
}

export default quickBooksSyncEntityPath;
