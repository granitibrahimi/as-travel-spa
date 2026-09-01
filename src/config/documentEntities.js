/**
 * Transaction types the generic document store (`/api/v1/documents`) accepts.
 * Values MUST match Modules\Documents\Enums\DocumentEntityEnum on the API.
 */
export const DOCUMENT_ENTITY = Object.freeze({
    CUSTOMER_INVOICE: 1,
    CUSTOMER_CREDIT_NOTE: 2,
    CUSTOMER_PAYMENT: 3,
    SUPPLIER_BILL: 4,
    SUPPLIER_CREDIT_NOTE: 5,
    SUPPLIER_PAYMENT: 6,
    SUPPLIER_DEPOSIT: 7,
    BANK_DEPOSIT: 8,
    SUPPLIER_RECONCILIATION: 9,
    SUPPLIER_REFUND: 10,
    SUPPLIER_GIFT_CARD: 11,
});

/** Customer-invoice document categories (CustomerInvoiceDocumentTypeEnum). */
export const CUSTOMER_INVOICE_DOCUMENT_CATEGORIES = Object.freeze({
    1: 'Tickets',
    2: 'Hotel',
    3: 'Visa',
    4: 'Transfer',
});
