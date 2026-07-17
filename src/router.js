import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';

// Route components are lazy-loaded: each page (and its unique deps) is split
// into its own chunk fetched on first navigation, so the initial bundle stays
// small. Shared UI/vendor code is hoisted into common chunks automatically.
const Login = () => import('./pages/Login.vue');
const Home = () => import('./pages/Home.vue');
const NotFound = () => import('./pages/NotFound.vue');
const Forbidden = () => import('./pages/Forbidden.vue');
const SuppliersIndex = () => import('./pages/Suppliers/Suppliers/Index.vue');
const SuppliersManage = () => import('./pages/Suppliers/Suppliers/Manage.vue');
const SuppliersShow = () => import('./pages/Suppliers/Suppliers/Show.vue');
const SuppliersReconcile = () => import('./pages/Suppliers/Suppliers/Reconcile.vue');
const SupplierBillShow = () => import('./pages/Suppliers/Bills/Show.vue');
const SupplierCreditNoteShow = () => import('./pages/Suppliers/CreditNotes/Show.vue');
const SuppliersStatements = () => import('./pages/Suppliers/Suppliers/Statements.vue');
const SuppliersCredentials = () => import('./pages/Suppliers/Suppliers/Credentials.vue');
const SupplierBillsManage = () => import('./pages/Suppliers/Bills/Manage.vue');
const SupplierCreditNotesManage = () => import('./pages/Suppliers/CreditNotes/Manage.vue');
const CustomersIndex = () => import('./pages/Customers/Customers/Index.vue');
const CustomersCreate = () => import('./pages/Customers/Customers/Create.vue');
const CustomersEdit = () => import('./pages/Customers/Customers/Edit.vue');
const CustomersShow = () => import('./pages/Customers/Customers/Show.vue');
const CustomersReconcile = () => import('./pages/Customers/Customers/Reconcile.vue');
const CustomersStatistics = () => import('./pages/Customers/Customers/Statistics.vue');
const CustomersStatements = () => import('./pages/Customers/Customers/Statements.vue');
const CustomerInvoiceShow = () => import('./pages/Customers/Invoices/Show.vue');
const CustomerInvoiceCreate = () => import('./pages/Customers/Invoices/Create.vue');
const CustomerInvoiceEdit = () => import('./pages/Customers/Invoices/Edit.vue');
const CustomerInvoiceChange = () => import('./pages/Customers/Invoices/Change.vue');
const CustomerCreditNoteShow = () => import('./pages/Customers/CreditNotes/Show.vue');
const CustomerCreditNoteCreate = () => import('./pages/Customers/CreditNotes/Create.vue');
const CustomerCreditNoteEdit = () => import('./pages/Customers/CreditNotes/Edit.vue');
const CustomerPaymentShow = () => import('./pages/Customers/Payments/Show.vue');
const CustomerPaymentManage = () => import('./pages/Customers/Payments/Manage.vue');
const CustomerGiftCardShow = () => import('./pages/Customers/GiftCards/Show.vue');
const CustomerGiftCardsIndex = () => import('./pages/Customers/GiftCards/Index.vue');
const CustomerGiftCardsCreate = () => import('./pages/Customers/GiftCards/Create.vue');
const CustomerGiftCardsEdit = () => import('./pages/Customers/GiftCards/Edit.vue');
const CustomerReconciliationsIndex = () => import('./pages/Customers/Reconciliations/Index.vue');
const CustomerReconciliationShow = () => import('./pages/Customers/Reconciliations/Show.vue');
const CustomerTransactionLinksIndex = () => import('./pages/Customers/TransactionLinks/Index.vue');
const CustomerRefundShow = () => import('./pages/Customers/Refunds/Show.vue');
const DeparturesIndex = () => import('./pages/Base/Departures/Index.vue');
const DeparturesOverview = () => import('./pages/Base/Departures/Overview.vue');
const MealTypesIndex = () => import('./pages/MealTypes/Index.vue');
const MealTypesManage = () => import('./pages/MealTypes/Manage.vue');
const CountriesIndex = () => import('./pages/Base/Countries/Index.vue');
const CountriesManage = () => import('./pages/Base/Countries/Manage.vue');
const SentEmailsIndex = () => import('./pages/Base/SentEmails/Index.vue');
const SentEmailsShow = () => import('./pages/Base/SentEmails/Show.vue');
const QuickBooksSyncIndex = () => import('./pages/QuickBooksSync/Index.vue');
const QuickBooksSyncShow = () => import('./pages/QuickBooksSync/Show.vue');
const ProductsIndex = () => import('./pages/Base/Products/Index.vue');
const ProductsManage = () => import('./pages/Base/Products/Manage.vue');
const HotelsIndex = () => import('./pages/Base/Hotels/Index.vue');
const HotelsManage = () => import('./pages/Base/Hotels/Manage.vue');
const DestinationsIndex = () => import('./pages/Base/Destinations/Index.vue');
const DestinationsManage = () => import('./pages/Base/Destinations/Manage.vue');
const DestinationsMerge = () => import('./pages/Base/Destinations/Merge.vue');
const DestinationsParent = () => import('./pages/Base/Destinations/Parent.vue');
const ParentDestinationsIndex = () => import('./pages/Base/ParentDestinations/Index.vue');
const ParentDestinationsManage = () => import('./pages/Base/ParentDestinations/Manage.vue');
const ParentDestinationsChildren = () => import('./pages/Base/ParentDestinations/ChildDestinations.vue');
const FlightDestinationsIndex = () => import('./pages/Flights/Destinations/Index.vue');
const FlightDestinationsManage = () => import('./pages/Flights/Destinations/Manage.vue');
const TravelOptionsIndex = () => import('./pages/Flights/TravelOptions/Index.vue');
const TravelOptionsManage = () => import('./pages/Flights/TravelOptions/Manage.vue');
const FlightSearch = () => import('./pages/Flights/Search.vue');
const AnnouncementsIndex = () => import('./pages/Base/Announcements/Index.vue');
const AnnouncementsManage = () => import('./pages/Base/Announcements/Manage.vue');
const AnnouncementsNew = () => import('./pages/Base/Announcements/New.vue');
const AnnouncementsStatistics = () => import('./pages/Base/Announcements/Statistics.vue');
const MessagesIndex = () => import('./pages/Base/Messages/Index.vue');
const MessagesCreate = () => import('./pages/Base/Messages/Create.vue');
const MessagesShow = () => import('./pages/Base/Messages/Show.vue');
const OnlineCredentialsIndex = () => import('./pages/Suppliers/OnlineSystemCredentials/Index.vue');
const OnlineCredentialsShow = () => import('./pages/Suppliers/OnlineSystemCredentials/Show.vue');
const PaymentMethodsIndex = () => import('./pages/Finance/PaymentMethods/Index.vue');
const PaymentMethodsManage = () => import('./pages/Finance/PaymentMethods/Manage.vue');
const TaxTypesIndex = () => import('./pages/Finance/TaxTypes/Index.vue');
const TaxTypesManage = () => import('./pages/Finance/TaxTypes/Manage.vue');
const InvoicesIndex = () => import('./pages/Customers/Invoices/Index.vue');
const InvoicesDue = () => import('./pages/Customers/Invoices/Due.vue');
const CreditNotesIndex = () => import('./pages/Customers/CreditNotes/Index.vue');
const ProInvoiceCreate = () => import('./pages/Customers/ProInvoices/Create.vue');
const ProjectsList = () => import('./pages/Customers/Projects/List.vue');
const ProjectsCreate = () => import('./pages/Customers/Projects/Create.vue');
const ProjectsShow = () => import('./pages/Customers/Projects/Show.vue');
const AccountTransactionsJournal = () => import('./pages/Finance/AccountTransactions/Journal.vue');
const JournalsIndex = () => import('./pages/Finance/Journals/Index.vue');
const JournalsManage = () => import('./pages/Finance/Journals/Manage.vue');
const JournalsShow = () => import('./pages/Finance/Journals/Show.vue');
const ZReportsIndex = () => import('./pages/Finance/ZReports/Index.vue');
const ZReportsCreate = () => import('./pages/Finance/ZReports/Create.vue');
const ZReportsShow = () => import('./pages/Finance/ZReports/Show.vue');
const AccountsIndex = () => import('./pages/Finance/Accounts/Index.vue');
const AccountsTypes = () => import('./pages/Finance/Accounts/Types.vue');
const AccountsMapping = () => import('./pages/Finance/Accounts/Mapping.vue');
const ExpensesIndex = () => import('./pages/Finance/Expenses/Index.vue');
const ExpensesManage = () => import('./pages/Finance/Expenses/Manage.vue');
const ExpensesShow = () => import('./pages/Finance/Expenses/Show.vue');
const BankDepositsIndex = () => import('./pages/Finance/BankDeposits/Index.vue');
const BankDepositsCreate = () => import('./pages/Finance/BankDeposits/Create.vue');
const BankDepositsShow = () => import('./pages/Finance/BankDeposits/Show.vue');
const AccountTransfersIndex = () => import('./pages/Finance/AccountTransfers/Index.vue');
const AccountTransfersManage = () => import('./pages/Finance/AccountTransfers/Manage.vue');
const AccountTransfersShow = () => import('./pages/Finance/AccountTransfers/Show.vue');
const PettyCashTransfers = () => import('./pages/Finance/PettyCash/TransfersList.vue');
const PettyCashDailyDeposit = () => import('./pages/Finance/PettyCash/DepositFromDailyCash.vue');
const PettyCashBankDeposit = () => import('./pages/Finance/PettyCash/DepositFromBank.vue');
const UsersIndex = () => import('./pages/Users/Users/Index.vue');
const UsersManage = () => import('./pages/Users/Users/Manage.vue');
const UsersShow = () => import('./pages/Users/Users/Show.vue');
const UsersLogs = () => import('./pages/Users/Users/Logs.vue');
const UsersActivityLogs = () => import('./pages/Users/Users/ActivityLogs.vue');
const UsersAuditLogShow = () => import('./pages/Users/Users/AuditLogs/Show.vue');
const UsersPassword = () => import('./pages/Users/Password.vue');
const RolesIndex = () => import('./pages/Users/Roles/Index.vue');
const RolesManage = () => import('./pages/Users/Roles/Manage.vue');
const RolesPermissions = () => import('./pages/Users/Roles/Permissions.vue');
const PermissionsIndex = () => import('./pages/Users/Permissions/Index.vue');
const WorkScheduleCalendar = () => import('./pages/Users/WorkSchedule/Calendar.vue');
const WorkScheduleIndex = () => import('./pages/Users/WorkSchedule/Index.vue');
const OfficialHolidaysIndex = () => import('./pages/OfficialHolidays/Index.vue');
const OfficialHolidaysManage = () => import('./pages/OfficialHolidays/Manage.vue');
const VacationsOverview = () => import('./pages/Users/Vacations/Overview.vue');
const VacationsApply = () => import('./pages/Users/Vacations/Apply.vue');
const VacationsRequests = () => import('./pages/Users/Vacations/Requests.vue');
const VacationsShow = () => import('./pages/Users/Vacations/Show.vue');
const VacationsEdit = () => import('./pages/Users/Vacations/Edit.vue');
const VacationsEditBalance = () => import('./pages/Users/Vacations/EditBalance.vue');
const PersonsIndex = () => import('./pages/Customers/Persons/Index.vue');
const PersonsManage = () => import('./pages/Customers/Persons/Manage.vue');
const PersonsShow = () => import('./pages/Customers/Persons/Show.vue');
const StaticOffersIndex = () => import('./pages/StaticOffers/Index.vue');
const StaticOffersManage = () => import('./pages/StaticOffers/Manage.vue');
const StaticOffersShow = () => import('./pages/StaticOffers/Show.vue');
const TasksIndex = () => import('./pages/Tasks/Index.vue');
const TasksDashboard = () => import('./pages/Tasks/Dashboard.vue');
const TasksCreate = () => import('./pages/Tasks/Create.vue');
const TasksShow = () => import('./pages/Tasks/Show.vue');
const NotificationsIndex = () => import('./pages/Base/Notifications/Index.vue');
const NotificationsShow = () => import('./pages/Base/Notifications/Show.vue');
const OnlineUsers = () => import('./pages/Users/OnlineUsers.vue');
const SupportIndex = () => import('./pages/Support/Index.vue');
const SupportCreate = () => import('./pages/Support/Create.vue');
const SupportShow = () => import('./pages/Support/Show.vue');
const SupplierDepositsIndex = () => import('./pages/Suppliers/Deposits/Index.vue');
const SupplierDepositsManage = () => import('./pages/Suppliers/Deposits/Manage.vue');
const SupplierDepositsShow = () => import('./pages/Suppliers/Deposits/Show.vue');
const SupplierPaymentsIndex = () => import('./pages/Suppliers/Payments/Index.vue');
const SupplierPaymentsManage = () => import('./pages/Suppliers/Payments/Manage.vue');
const SupplierPaymentsShow = () => import('./pages/Suppliers/Payments/Show.vue');
const SupplierGiftCardsIndex = () => import('./pages/Suppliers/GiftCards/Index.vue');
const SupplierGiftCardsManage = () => import('./pages/Suppliers/GiftCards/Manage.vue');
const SupplierGiftCardsShow = () => import('./pages/Suppliers/GiftCards/Show.vue');
const SupplierRefundsIndex = () => import('./pages/Suppliers/Refunds/Index.vue');
const SupplierRefundsManage = () => import('./pages/Suppliers/Refunds/Manage.vue');
const SupplierRefundsShow = () => import('./pages/Suppliers/Refunds/Show.vue');
const Me = () => import('./pages/Me.vue');
const ReportCountInvoices = () => import('./pages/Statistics/CountInvoices.vue');
const ReportSalesWithSvc = () => import('./pages/Statistics/SalesWithSvc.vue');
const ReportDaysBeforeEvent = () => import('./pages/Statistics/DaysBeforeEvent.vue');
const ReportEmployeeContribution = () => import('./pages/Statistics/EmployeeContribution.vue');
const ReportMonthConcentration = () => import('./pages/Statistics/MonthConcentration.vue');
const ReportRanking = () => import('./pages/Statistics/EmployeeRanking.vue');
const ReportCustomers = () => import('./pages/Statistics/Customers.vue');
const ReportAllCounts = () => import('./pages/Statistics/AllCounts.vue');

const routes = [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', name: 'home', component: Home },
    { path: '/suppliers', name: 'suppliers.list', component: SuppliersIndex },
    { path: '/suppliers/create', name: 'suppliers.create', component: SuppliersManage },
    { path: '/suppliers/:supplierId/bills/create', name: 'supplierBills.create', component: SupplierBillsManage },
    { path: '/suppliers/:supplierId/credit-notes/create', name: 'supplierCreditNotes.create', component: SupplierCreditNotesManage },
    { path: '/suppliers/:supplierId/deposits/create', name: 'supplierDeposits.create', component: SupplierDepositsManage },
    { path: '/suppliers/:supplierId/payments/create', name: 'supplierPayments.create', component: SupplierPaymentsManage },
    { path: '/suppliers/:supplierId/gift-cards/create', name: 'supplierGiftCards.create', component: SupplierGiftCardsManage },
    { path: '/suppliers/:supplierId/refunds/create', name: 'supplierRefunds.create', component: SupplierRefundsManage },
    { path: '/suppliers/:id/statements', name: 'suppliers.statements', component: SuppliersStatements },
    { path: '/suppliers/:id/credentials', name: 'suppliers.credentials', component: SuppliersCredentials },
    { path: '/suppliers/:id/edit', name: 'suppliers.edit', component: SuppliersManage },
    { path: '/suppliers/:id/reconcile', name: 'suppliers.reconcile', component: SuppliersReconcile },
    { path: '/suppliers/:id', name: 'suppliers.show', component: SuppliersShow },
    { path: '/supplier-bills/:id', name: 'supplierBills.show', component: SupplierBillShow },
    { path: '/supplier-credit-notes/:id', name: 'supplierCreditNotes.show', component: SupplierCreditNoteShow },
    { path: '/supplier-deposits', name: 'supplierDeposits.list', component: SupplierDepositsIndex },
    { path: '/supplier-deposits/:id/edit', name: 'supplierDeposits.edit', component: SupplierDepositsManage },
    { path: '/supplier-deposits/:id', name: 'supplierDeposits.show', component: SupplierDepositsShow },
    { path: '/supplier-payments', name: 'supplierPayments.list', component: SupplierPaymentsIndex },
    { path: '/supplier-payments/:id/edit', name: 'supplierPayments.edit', component: SupplierPaymentsManage },
    { path: '/supplier-payments/:id', name: 'supplierPayments.show', component: SupplierPaymentsShow },
    { path: '/supplier-gift-cards', name: 'supplierGiftCards.list', component: SupplierGiftCardsIndex },
    { path: '/supplier-gift-cards/:id/edit', name: 'supplierGiftCards.edit', component: SupplierGiftCardsManage },
    { path: '/supplier-gift-cards/:id', name: 'supplierGiftCards.show', component: SupplierGiftCardsShow },
    { path: '/supplier-refunds', name: 'supplierRefunds.list', component: SupplierRefundsIndex },
    { path: '/supplier-refunds/:id/edit', name: 'supplierRefunds.edit', component: SupplierRefundsManage },
    { path: '/supplier-refunds/:id', name: 'supplierRefunds.show', component: SupplierRefundsShow },
    { path: '/customers', name: 'customers.list', component: CustomersIndex },
    { path: '/customers/create', name: 'customers.create', component: CustomersCreate },
    { path: '/customers/invoices', name: 'customerInvoices.list', component: InvoicesIndex },
    { path: '/customers/invoices/due', name: 'customerInvoices.due', component: InvoicesDue },
    { path: '/customers/credit-notes', name: 'customerCreditNotes.list', component: CreditNotesIndex },
    { path: '/customers/:customer/invoices/create', name: 'customerInvoices.create', component: CustomerInvoiceCreate },
    { path: '/customers/:customer/credit-notes/create', name: 'customerCreditNotes.create', component: CustomerCreditNoteCreate },
    { path: '/customers/:customer/pro-invoices/create', name: 'customerProInvoices.create', component: ProInvoiceCreate },
    { path: '/customers/:customer/payments/create', name: 'customerPayments.create', component: CustomerPaymentManage },
    { path: '/customers/:customer/gift-cards/create', name: 'customerGiftCards.create', component: CustomerGiftCardsCreate },
    { path: '/projects', name: 'customerProjects.list', component: ProjectsList, props: { mode: 'active' } },
    { path: '/projects/finished', name: 'customerProjects.finished', component: ProjectsList, props: { mode: 'finished' } },
    { path: '/projects/create', name: 'customerProjects.create', component: ProjectsCreate },
    { path: '/projects/:id', name: 'customerProjects.show', component: ProjectsShow },
    { path: '/customers/:id/reconcile', name: 'customers.reconcile', component: CustomersReconcile },
    { path: '/customers/:id/statistics', name: 'customers.statistics', component: CustomersStatistics },
    { path: '/customers/:id/statements', name: 'customers.statements', component: CustomersStatements },
    { path: '/customers/:id/edit', name: 'customers.edit', component: CustomersEdit },
    { path: '/customers/:id', name: 'customers.show', component: CustomersShow },
    { path: '/customer-invoices/:id/edit', name: 'customerInvoices.edit', component: CustomerInvoiceEdit },
    { path: '/customer-invoices/:id/change-customer', name: 'customerInvoices.changeCustomer', component: CustomerInvoiceChange, props: { field: 'customer' } },
    { path: '/customer-invoices/:id/change-agent', name: 'customerInvoices.changeAgent', component: CustomerInvoiceChange, props: { field: 'agent' } },
    { path: '/customer-invoices/:id/change-date', name: 'customerInvoices.changeDate', component: CustomerInvoiceChange, props: { field: 'date' } },
    { path: '/customer-invoices/:id/change-due-date', name: 'customerInvoices.changeDueDate', component: CustomerInvoiceChange, props: { field: 'dueDate' } },
    { path: '/customer-invoices/:id', name: 'customerInvoices.show', component: CustomerInvoiceShow },
    { path: '/customer-credit-notes/:id/edit', name: 'customerCreditNotes.edit', component: CustomerCreditNoteEdit },
    { path: '/customer-credit-notes/:id', name: 'customerCreditNotes.show', component: CustomerCreditNoteShow },
    { path: '/customer-payments/:id/edit', name: 'customerPayments.edit', component: CustomerPaymentManage },
    { path: '/customer-payments/:id', name: 'customerPayments.show', component: CustomerPaymentShow },
    { path: '/customer-gift-cards', name: 'customerGiftCards.list', component: CustomerGiftCardsIndex },
    { path: '/customer-reconciliations', name: 'customerReconciliations.list', component: CustomerReconciliationsIndex },
    { path: '/customer-reconciliations/:id', name: 'customerReconciliations.show', component: CustomerReconciliationShow },
    { path: '/customer-transaction-links', name: 'customerTransactionLinks.list', component: CustomerTransactionLinksIndex },
    { path: '/customer-gift-cards/:id/edit', name: 'customerGiftCards.edit', component: CustomerGiftCardsEdit },
    { path: '/customer-gift-cards/:id', name: 'customerGiftCards.show', component: CustomerGiftCardShow },
    { path: '/customer-refunds/:id', name: 'customerRefunds.show', component: CustomerRefundShow },
    { path: '/finance/account-transactions/journal/:type/:reference', name: 'accountTransactions.journal', component: AccountTransactionsJournal },
    { path: '/departures', name: 'departures.list', component: DeparturesIndex },
    { path: '/departures/overview', name: 'departures.overview', component: DeparturesOverview },
    { path: '/meal-types', name: 'mealTypes.list', component: MealTypesIndex },
    { path: '/meal-types/create', name: 'mealTypes.create', component: MealTypesManage },
    { path: '/meal-types/:id/edit', name: 'mealTypes.edit', component: MealTypesManage },
    { path: '/countries', name: 'countries.list', component: CountriesIndex },
    { path: '/countries/:id/edit', name: 'countries.edit', component: CountriesManage },
    { path: '/products', name: 'products.list', component: ProductsIndex },
    { path: '/products/create', name: 'products.create', component: ProductsManage },
    { path: '/products/:id/edit', name: 'products.edit', component: ProductsManage },
    { path: '/hotels', name: 'hotels.list', component: HotelsIndex },
    { path: '/hotels/create', name: 'hotels.create', component: HotelsManage },
    { path: '/hotels/:id/edit', name: 'hotels.edit', component: HotelsManage },
    { path: '/destinations', name: 'destinations.list', component: DestinationsIndex },
    { path: '/destinations/create', name: 'destinations.create', component: DestinationsManage },
    { path: '/destinations/merge', name: 'destinations.merge', component: DestinationsMerge },
    { path: '/destinations/parent', name: 'destinations.parent', component: DestinationsParent },
    { path: '/destinations/:id/edit', name: 'destinations.edit', component: DestinationsManage },
    { path: '/parent-destinations', name: 'parentDestinations.list', component: ParentDestinationsIndex },
    { path: '/parent-destinations/create', name: 'parentDestinations.create', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/edit', name: 'parentDestinations.edit', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/destinations', name: 'parentDestinations.children', component: ParentDestinationsChildren },
    { path: '/flight-destinations', name: 'flightDestinations.list', component: FlightDestinationsIndex },
    { path: '/flight-destinations/create', name: 'flightDestinations.create', component: FlightDestinationsManage },
    { path: '/flight-destinations/:id/edit', name: 'flightDestinations.edit', component: FlightDestinationsManage },
    { path: '/travel-options', name: 'travelOptions.list', component: TravelOptionsIndex },
    { path: '/travel-options/create', name: 'travelOptions.create', component: TravelOptionsManage },
    { path: '/travel-options/:id/edit', name: 'travelOptions.edit', component: TravelOptionsManage },
    { path: '/flight-search', name: 'flights.search', component: FlightSearch },
    { path: '/announcements', name: 'announcements.list', component: AnnouncementsIndex },
    { path: '/announcements/create', name: 'announcements.create', component: AnnouncementsManage },
    { path: '/announcements/new', name: 'announcements.new', component: AnnouncementsNew },
    { path: '/announcements/:id/edit', name: 'announcements.edit', component: AnnouncementsManage },
    { path: '/announcements/:id/statistics', name: 'announcements.statistics', component: AnnouncementsStatistics },
    { path: '/messages', name: 'messages.list', component: MessagesIndex },
    { path: '/messages/create', name: 'messages.create', component: MessagesCreate },
    { path: '/messages/:id', name: 'messages.show', component: MessagesShow },
    { path: '/online-credentials', name: 'onlineCredentials.list', component: OnlineCredentialsIndex },
    { path: '/online-credentials/:id', name: 'onlineCredentials.show', component: OnlineCredentialsShow },
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
    { path: '/users', name: 'users.list', component: UsersIndex },
    { path: '/users/create', name: 'users.create', component: UsersManage },
    { path: '/users/logs', name: 'users.logs', component: UsersLogs },
    { path: '/users/activity-logs', name: 'users.activityLogs', component: UsersActivityLogs },
    { path: '/users/activity-logs/:id', name: 'users.activityLogAudit', component: UsersAuditLogShow },
    { path: '/users/:id/edit', name: 'users.edit', component: UsersManage },
    { path: '/users/:id', name: 'users.show', component: UsersShow },
    { path: '/password', name: 'users.editPassword', component: UsersPassword },
    { path: '/roles', name: 'roles.list', component: RolesIndex },
    { path: '/roles/create', name: 'roles.create', component: RolesManage },
    { path: '/roles/:id/edit', name: 'roles.edit', component: RolesManage },
    { path: '/roles/:id/permissions', name: 'roles.permissions', component: RolesPermissions },
    { path: '/permissions', name: 'permissions.list', component: PermissionsIndex },
    { path: '/work-schedule', name: 'workSchedule.calendar', component: WorkScheduleCalendar },
    { path: '/work-schedule/edit', name: 'workSchedule.list', component: WorkScheduleIndex },
    { path: '/official-holidays', name: 'officialHolidays.list', component: OfficialHolidaysIndex },
    { path: '/official-holidays/create', name: 'officialHolidays.create', component: OfficialHolidaysManage },
    { path: '/official-holidays/:id/edit', name: 'officialHolidays.edit', component: OfficialHolidaysManage },
    { path: '/vacations', name: 'vacations.list', component: VacationsOverview },
    { path: '/vacations/apply', name: 'vacations.apply', component: VacationsApply },
    { path: '/vacations/requests', name: 'vacations.requests', component: VacationsRequests },
    { path: '/vacations/:userId/balance', name: 'vacations.balance', component: VacationsEditBalance },
    { path: '/vacations/:id/edit', name: 'vacations.edit', component: VacationsEdit },
    { path: '/vacations/:id', name: 'vacations.show', component: VacationsShow },
    { path: '/travelers', name: 'persons.list', component: PersonsIndex },
    { path: '/travelers/create', name: 'persons.create', component: PersonsManage },
    { path: '/travelers/:id/edit', name: 'persons.edit', component: PersonsManage },
    { path: '/travelers/:id', name: 'persons.show', component: PersonsShow },
    { path: '/offers', name: 'staticOffers.list', component: StaticOffersIndex },
    { path: '/offers/create', name: 'staticOffers.create', component: StaticOffersManage },
    { path: '/offers/:id/edit', name: 'staticOffers.edit', component: StaticOffersManage },
    { path: '/offers/:id', name: 'staticOffers.show', component: StaticOffersShow },
    { path: '/tasks', name: 'tasks.list', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/statistics/count-invoices', name: 'statistics.countInvoices', component: ReportCountInvoices },
    { path: '/statistics/sales-with-svc', name: 'statistics.salesWithSvc', component: ReportSalesWithSvc },
    { path: '/statistics/days-before-event', name: 'statistics.daysBeforeEvent', component: ReportDaysBeforeEvent },
    { path: '/statistics/employee-contribution', name: 'statistics.employeeContribution', component: ReportEmployeeContribution },
    { path: '/statistics/month-concentration', name: 'statistics.monthConcentration', component: ReportMonthConcentration },
    { path: '/statistics/ranking', name: 'statistics.ranking', component: ReportRanking },
    { path: '/statistics/customers', name: 'statistics.customers', component: ReportCustomers },
    { path: '/statistics/all-counts', name: 'statistics.allCounts', component: ReportAllCounts },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/sent-emails', name: 'sentEmails.list', component: SentEmailsIndex },
    { path: '/sent-emails/:id', name: 'sentEmails.show', component: SentEmailsShow },
    { path: '/quickbooks/sync', name: 'quickBooksSync.list', component: QuickBooksSyncIndex },
    { path: '/quickbooks/sync/:id', name: 'quickBooksSync.show', component: QuickBooksSyncShow },
    { path: '/notifications', name: 'notifications.list', component: NotificationsIndex },
    { path: '/notifications/:id', name: 'notifications.show', component: NotificationsShow },
    { path: '/online-users', name: 'online-users', component: OnlineUsers },
    { path: '/support', name: 'support.list', component: SupportIndex },
    { path: '/support/create', name: 'support.create', component: SupportCreate },
    { path: '/support/:id', name: 'support.show', component: SupportShow },
    { path: '/me', name: 'me', component: Me },
    { path: '/403', name: 'forbidden', component: Forbidden },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
];


const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Guard: public routes are always allowed; everything else needs a token.
// A logged-in user hitting /login is sent home.
router.beforeEach((to) => {
    const auth = useAuthStore();

    if (!to.meta.public && !auth.isAuthenticated) {
        return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
    }

    if (to.name === 'login' && auth.isAuthenticated) {
        return { name: 'home' };
    }

    return true;
});

export default router;
