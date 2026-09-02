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
const BspSyncIndex = () => import('../../pages/Finance/BspSync/Index.vue');
const BspSyncPay = () => import('../../pages/Finance/BspSync/Pay.vue');
const AccountTransfersIndex = () => import('../../pages/Finance/AccountTransfers/Index.vue');
const AccountTransfersManage = () => import('../../pages/Finance/AccountTransfers/Manage.vue');
const AccountTransfersShow = () => import('../../pages/Finance/AccountTransfers/Show.vue');
const PettyCashTransfers = () => import('../../pages/Finance/PettyCash/TransfersList.vue');
const PettyCashDailyDeposit = () => import('../../pages/Finance/PettyCash/DepositFromDailyCash.vue');
const PettyCashBankDeposit = () => import('../../pages/Finance/PettyCash/DepositFromBank.vue');
const AccountsIndex = () => import('../../pages/Finance/Accounts/Index.vue');
const AccountsTypes = () => import('../../pages/Finance/Accounts/Types.vue');
const AccountsMapping = () => import('../../pages/Finance/Accounts/Mapping.vue');
const AccountsHistory = () => import('../../pages/Finance/Accounts/History.vue');
const ReportsCustomerInvoices = () => import('../../pages/Finance/Reports/CustomerInvoices.vue');
const ReportsAccountsReceivable = () => import('../../pages/Finance/Reports/AccountsReceivable.vue');
const ReportsAccountsPayable = () => import('../../pages/Finance/Reports/AccountsPayable.vue');
const ReportsAccountComparison = () => import('../../pages/Finance/Reports/AccountComparison.vue');
const ReportsSalesBook = () => import('../../pages/Finance/Reports/SalesBook.vue');
const ReportsPurchasesBook = () => import('../../pages/Finance/Reports/PurchasesBook.vue');
const ReportsBalanceSheet = () => import('../../pages/Finance/Reports/BalanceSheet.vue');
const ReportsChartOfAccounts = () => import('../../pages/Finance/Reports/ChartOfAccounts.vue');

export default [
    { path: '/finance/account-transactions/journal/:type/:reference', name: 'accountTransactions.journal', component: AccountTransactionsJournal },
    { path: '/finance/payment-methods', name: 'paymentMethods.list', component: PaymentMethodsIndex },
    { path: '/finance/payment-methods/create', name: 'paymentMethods.create', component: PaymentMethodsManage },
    { path: '/finance/payment-methods/:id/edit', name: 'paymentMethods.edit', component: PaymentMethodsManage },
    { path: '/finance/tax-types', name: 'taxTypes.list', component: TaxTypesIndex },
    { path: '/finance/tax-types/create', name: 'taxTypes.create', component: TaxTypesManage },
    { path: '/finance/tax-types/:id/edit', name: 'taxTypes.edit', component: TaxTypesManage },
    { path: '/finance/journals', name: 'journals.list', component: JournalsIndex },
    { path: '/finance/journals/create', name: 'journals.create', component: JournalsManage },
    { path: '/finance/journals/:id/edit', name: 'journals.edit', component: JournalsManage },
    { path: '/finance/journals/:id', name: 'journals.show', component: JournalsShow },
    { path: '/finance/z-reports', name: 'zReports.list', component: ZReportsIndex },
    { path: '/finance/z-reports/create', name: 'zReports.create', component: ZReportsCreate },
    { path: '/finance/z-reports/:id', name: 'zReports.show', component: ZReportsShow },
    { path: '/finance/expenses', name: 'expenses.list', component: ExpensesIndex },
    { path: '/finance/expenses/create', name: 'expenses.create', component: ExpensesManage },
    { path: '/finance/expenses/:id/edit', name: 'expenses.edit', component: ExpensesManage },
    { path: '/finance/expenses/:id', name: 'expenses.show', component: ExpensesShow },
    { path: '/finance/bank-deposits', name: 'bankDeposits.list', component: BankDepositsIndex },
    { path: '/finance/bank-deposits/create', name: 'bankDeposits.create', component: BankDepositsCreate },
    { path: '/finance/bank-deposits/:id', name: 'bankDeposits.show', component: BankDepositsShow },
    { path: '/finance/bsp-sync', name: 'bspSync.index', component: BspSyncIndex },
    { path: '/finance/bsp-sync/:hash/pay', name: 'bspSync.pay', component: BspSyncPay },
    { path: '/finance/account-transfers', name: 'accountTransfers.list', component: AccountTransfersIndex },
    { path: '/finance/account-transfers/create', name: 'accountTransfers.create', component: AccountTransfersManage },
    { path: '/finance/account-transfers/:id/edit', name: 'accountTransfers.edit', component: AccountTransfersManage },
    { path: '/finance/account-transfers/:id', name: 'accountTransfers.show', component: AccountTransfersShow },
    { path: '/finance/petty-cash', name: 'pettyCash.list', component: PettyCashTransfers },
    { path: '/finance/petty-cash/deposit', name: 'pettyCash.deposit', component: PettyCashDailyDeposit },
    { path: '/finance/petty-cash/deposit-from-bank', name: 'pettyCash.depositFromBank', component: PettyCashBankDeposit },
    { path: '/finance/accounts', name: 'accounts.list', component: AccountsIndex },
    { path: '/finance/accounts/types', name: 'accounts.types', component: AccountsTypes },
    { path: '/finance/accounts/mapping', name: 'accounts.mapping', component: AccountsMapping },
    { path: '/finance/accounts/:id/history', name: 'accounts.history', component: AccountsHistory },
    { path: '/finance/reports/customer-invoices', name: 'financeReports.customerInvoices', component: ReportsCustomerInvoices },
    { path: '/finance/reports/accounts-receivable', name: 'financeReports.accountsReceivable', component: ReportsAccountsReceivable },
    { path: '/finance/reports/accounts-payable', name: 'financeReports.accountsPayable', component: ReportsAccountsPayable },
    { path: '/finance/reports/4000-vs-5000', name: 'financeReports.accountComparison', component: ReportsAccountComparison },
    { path: '/finance/reports/sales-book', name: 'financeReports.salesBook', component: ReportsSalesBook },
    { path: '/finance/reports/purchases-book', name: 'financeReports.purchasesBook', component: ReportsPurchasesBook },
    { path: '/finance/reports/balance-sheet', name: 'financeReports.balanceSheet', component: ReportsBalanceSheet },
    { path: '/finance/reports/chart-of-accounts', name: 'financeReports.chartOfAccounts', component: ReportsChartOfAccounts },
];
