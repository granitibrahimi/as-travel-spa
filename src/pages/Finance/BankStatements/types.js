import { routeUrl } from '../../../helpers/route.js';

// The two reconciliation tools share these pages (backend BankStatementKindEnum).
export const KINDS = {
    1: {
        value: 1,
        title: 'Barazimi i Bankave',
        list: 'bankReconciliations.list',
        create: 'bankReconciliations.create',
        noun: 'bank statement',
        hint: 'The statement you download from the bank (ProCredit .xls, or any bank filled into the Excel template).',
        accountHint: 'The bank account in the chart of accounts, e.g. PCB.',
        inLabel: 'In',
        outLabel: 'Out',
        balanceLabel: 'Balance',
    },
    2: {
        value: 2,
        title: 'Barazimi i Kartelave',
        list: 'cardReconciliations.list',
        create: 'cardReconciliations.create',
        noun: 'card statement',
        hint: 'The card statement the bank sends (TEB Starcard or BKT PDF).',
        accountHint: 'The card account in the chart of accounts.',
        inLabel: 'Payments',
        outLabel: 'Charges',
        balanceLabel: 'Debt',
    },
};

export const kindOf = (value) => KINDS[Number(value)] ?? KINDS[1];

// Balances come in the ledger sign (debit positive). A card's debt is a
// negative balance on its account, so cards show it turned to a positive debt.
export const shownBalance = (kind, value) => (value === null || value === undefined ? null : (Number(kind) === 2 ? -value : value));

// Show pages per posting type label (AccountTransactionType::name()), as on Account History.
const SHOW_ROUTES = {
    Transfer: 'accountTransfers.show',
    Journal: 'journals.show',
    Expense: 'expenses.show',
    'Bank Deposit': 'bankDeposits.show',
    'Customer Invoice': 'customerInvoices.show',
    'Customer Payment': 'customerPayments.show',
    'Customer Refund': 'customerRefunds.show',
    'Customer CreditNote': 'customerCreditNotes.show',
    'Customer Financial Credit Note': 'customerGiftCards.show',
    'Supplier Bill': 'supplierBills.show',
    'Supplier Payment': 'supplierPayments.show',
    'Supplier Credit': 'supplierCreditNotes.show',
    'Supplier GiftCard': 'supplierGiftCards.show',
    'Supplier Deposit': 'supplierDeposits.show',
    'Supplier Reimbursement': 'supplierRefunds.show',
};

export function postingLink(posting) {
    const name = SHOW_ROUTES[posting?.document];

    return name && posting.reference_id ? routeUrl(name, posting.reference_id) : null;
}

export function payeeLink(payee) {
    if (! payee?.id) {
        return null;
    }

    if (payee.type === 'customer') {
        return routeUrl('customers.show', payee.id);
    }

    if (payee.type === 'supplier') {
        return routeUrl('suppliers.show', payee.id);
    }

    return null;
}

// Where to go to create what a statement row stands for when the app has
// nothing for it yet. Opens in a new tab; Refresh then matches it.
export function createOptions(line, can) {
    const options = line.amount < 0
        ? [
            { label: 'New Expense', route: 'expenses.create', can: 'expenses.create' },
            { label: 'Supplier Payment (pick the supplier)', route: 'supplierPayments.list', can: 'supplierPayments.create' },
            { label: 'Customer Refund (from the customer)', route: 'customerPayments.list', can: 'customerRefunds.create' },
            { label: 'New Account Transfer', route: 'accountTransfers.create', can: 'accountTransfers.create' },
            { label: 'New Journal', route: 'journals.create', can: 'journals.create' },
        ]
        : [
            { label: 'Customer Payment (pick the customer)', route: 'customerPayments.list', can: 'customerPayments.create' },
            { label: 'New Bank Deposit', route: 'bankDeposits.create', can: 'bankDeposits.create' },
            { label: 'Supplier Refund (pick the supplier)', route: 'supplierRefunds.list', can: 'supplierRefunds.create' },
            { label: 'New Account Transfer', route: 'accountTransfers.create', can: 'accountTransfers.create' },
            { label: 'New Journal', route: 'journals.create', can: 'journals.create' },
        ];

    return options
        .filter((option) => can(option.can))
        .map((option) => ({ label: option.label, action: () => window.open(routeUrl(option.route), '_blank') }));
}
