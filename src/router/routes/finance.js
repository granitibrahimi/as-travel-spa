// Finance domain: account transactions, payment methods, tax types, journals,
// z-reports, expenses, bank deposits, account transfers, petty cash, accounts.
const AccountTransactionsJournal = () => import('../../pages/Finance/AccountTransactions/Journal.vue');
const PaymentMethodsIndex = () => import('../../pages/Finance/PaymentMethods/Index.vue');
const PaymentMethodsManage = () => import('../../pages/Finance/PaymentMethods/Manage.vue');
const TaxTypesIndex = () => import('../../pages/Finance/TaxTypes/Index.vue');
const TaxTypesManage = () => import('../../pages/Finance/TaxTypes/Manage.vue');
const JournalsIndex = () => import('../../pages/Finance/Journals/Index.vue');
const JournalsManage = () => import('../../pages/Finance/Journals/Manage.vue');
const JournalsShow = () => import('../../pages/Finance/Journals/Show.vue');
const ZReportsIndex = () => import('../../pages/Finance/ZReports/Index.vue');
const ZReportsCreate = () => import('../../pages/Finance/ZReports/Create.vue');
const ZReportsShow = () => import('../../pages/Finance/ZReports/Show.vue');
const ExpensesIndex = () => import('../../pages/Finance/Expenses/Index.vue');
const ExpensesManage = () => import('../../pages/Finance/Expenses/Manage.vue');
const ExpensesShow = () => import('../../pages/Finance/Expenses/Show.vue');
const BankDepositsIndex = () => import('../../pages/Finance/BankDeposits/Index.vue');
const BankDepositsCreate = () => import('../../pages/Finance/BankDeposits/Create.vue');
const BankDepositsShow = () => import('../../pages/Finance/BankDeposits/Show.vue');
const AccountTransfersIndex = () => import('../../pages/Finance/AccountTransfers/Index.vue');
const AccountTransfersManage = () => import('../../pages/Finance/AccountTransfers/Manage.vue');
const AccountTransfersShow = () => import('../../pages/Finance/AccountTransfers/Show.vue');
const PettyCashTransfers = () => import('../../pages/Finance/PettyCash/TransfersList.vue');
const PettyCashDailyDeposit = () => import('../../pages/Finance/PettyCash/DepositFromDailyCash.vue');
const PettyCashBankDeposit = () => import('../../pages/Finance/PettyCash/DepositFromBank.vue');
const AccountsIndex = () => import('../../pages/Finance/Accounts/Index.vue');
const AccountsTypes = () => import('../../pages/Finance/Accounts/Types.vue');
const AccountsMapping = () => import('../../pages/Finance/Accounts/Mapping.vue');

export default [
    { path: '/finance/account-transactions/journal/:type/:reference', name: 'accountTransactions.journal', component: AccountTransactionsJournal },
    { path: '/payment-methods', name: 'paymentMethods.list', component: PaymentMethodsIndex },
    { path: '/payment-methods/create', name: 'paymentMethods.create', component: PaymentMethodsManage },
    { path: '/payment-methods/:id/edit', name: 'paymentMethods.edit', component: PaymentMethodsManage },
    { path: '/tax-types', name: 'taxTypes.list', component: TaxTypesIndex },
    { path: '/tax-types/create', name: 'taxTypes.create', component: TaxTypesManage },
    { path: '/tax-types/:id/edit', name: 'taxTypes.edit', component: TaxTypesManage },
    { path: '/journals', name: 'journals.list', component: JournalsIndex },
    { path: '/journals/create', name: 'journals.create', component: JournalsManage },
    { path: '/journals/:id/edit', name: 'journals.edit', component: JournalsManage },
    { path: '/journals/:id', name: 'journals.show', component: JournalsShow },
    { path: '/z-reports', name: 'zReports.list', component: ZReportsIndex },
    { path: '/z-reports/create', name: 'zReports.create', component: ZReportsCreate },
    { path: '/z-reports/:id', name: 'zReports.show', component: ZReportsShow },
    { path: '/expenses', name: 'expenses.list', component: ExpensesIndex },
    { path: '/expenses/create', name: 'expenses.create', component: ExpensesManage },
    { path: '/expenses/:id/edit', name: 'expenses.edit', component: ExpensesManage },
    { path: '/expenses/:id', name: 'expenses.show', component: ExpensesShow },
    { path: '/bank-deposits', name: 'bankDeposits.list', component: BankDepositsIndex },
    { path: '/bank-deposits/create', name: 'bankDeposits.create', component: BankDepositsCreate },
    { path: '/bank-deposits/:id', name: 'bankDeposits.show', component: BankDepositsShow },
    { path: '/account-transfers', name: 'accountTransfers.list', component: AccountTransfersIndex },
    { path: '/account-transfers/create', name: 'accountTransfers.create', component: AccountTransfersManage },
    { path: '/account-transfers/:id/edit', name: 'accountTransfers.edit', component: AccountTransfersManage },
    { path: '/account-transfers/:id', name: 'accountTransfers.show', component: AccountTransfersShow },
    { path: '/petty-cash', name: 'pettyCash.list', component: PettyCashTransfers },
    { path: '/petty-cash/deposit', name: 'pettyCash.deposit', component: PettyCashDailyDeposit },
    { path: '/petty-cash/deposit-from-bank', name: 'pettyCash.depositFromBank', component: PettyCashBankDeposit },
    { path: '/accounts', name: 'accounts.list', component: AccountsIndex },
    { path: '/accounts/types', name: 'accounts.types', component: AccountsTypes },
    { path: '/accounts/mapping', name: 'accounts.mapping', component: AccountsMapping },
];
