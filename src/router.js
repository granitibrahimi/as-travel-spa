import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import Login from './pages/Login.vue';
import Home from './pages/Home.vue';
import NotFound from './pages/NotFound.vue';
import SuppliersIndex from './pages/Suppliers/Suppliers/Index.vue';
import SuppliersManage from './pages/Suppliers/Suppliers/Manage.vue';
import SuppliersShow from './pages/Suppliers/Suppliers/Show.vue';
import SuppliersStatements from './pages/Suppliers/Suppliers/Statements.vue';
import SuppliersCredentials from './pages/Suppliers/Suppliers/Credentials.vue';
import SupplierBillsManage from './pages/Suppliers/Bills/Manage.vue';
import SupplierCreditNotesManage from './pages/Suppliers/CreditNotes/Manage.vue';
import CustomersIndex from './pages/Customers/Customers/Index.vue';
import CustomersManage from './pages/Customers/Customers/Manage.vue';
import CustomersShow from './pages/Customers/Customers/Show.vue';
import DeparturesIndex from './pages/Departures/Index.vue';
import DeparturesOverview from './pages/Departures/Overview.vue';
import MealTypesIndex from './pages/MealTypes/Index.vue';
import MealTypesManage from './pages/MealTypes/Manage.vue';
import CountriesIndex from './pages/Base/Countries/Index.vue';
import CountriesManage from './pages/Base/Countries/Manage.vue';
import SentEmailsIndex from './pages/SentEmails/Index.vue';
import SentEmailsShow from './pages/SentEmails/Show.vue';
import QuickBooksSyncIndex from './pages/QuickBooksSync/Index.vue';
import QuickBooksSyncShow from './pages/QuickBooksSync/Show.vue';
import ProductsIndex from './pages/Base/Products/Index.vue';
import ProductsManage from './pages/Base/Products/Manage.vue';
import HotelsIndex from './pages/Base/Hotels/Index.vue';
import HotelsManage from './pages/Base/Hotels/Manage.vue';
import DestinationsIndex from './pages/Base/Destinations/Index.vue';
import DestinationsManage from './pages/Base/Destinations/Manage.vue';
import DestinationsMerge from './pages/Base/Destinations/Merge.vue';
import DestinationsParent from './pages/Base/Destinations/Parent.vue';
import ParentDestinationsIndex from './pages/Base/ParentDestinations/Index.vue';
import ParentDestinationsManage from './pages/Base/ParentDestinations/Manage.vue';
import ParentDestinationsChildren from './pages/Base/ParentDestinations/ChildDestinations.vue';
import AnnouncementsIndex from './pages/Base/Announcements/Index.vue';
import AnnouncementsManage from './pages/Base/Announcements/Manage.vue';
import AnnouncementsNew from './pages/Base/Announcements/New.vue';
import AnnouncementsStatistics from './pages/Base/Announcements/Statistics.vue';
import MessagesIndex from './pages/Base/Messages/Index.vue';
import MessagesCreate from './pages/Base/Messages/Create.vue';
import MessagesShow from './pages/Base/Messages/Show.vue';
import OnlineCredentialsIndex from './pages/OnlineSystemCredentials/Index.vue';
import OnlineCredentialsShow from './pages/OnlineSystemCredentials/Show.vue';
import PaymentMethodsIndex from './pages/Finance/PaymentMethods/Index.vue';
import PaymentMethodsManage from './pages/Finance/PaymentMethods/Manage.vue';
import TaxTypesIndex from './pages/Finance/TaxTypes/Index.vue';
import TaxTypesManage from './pages/Finance/TaxTypes/Manage.vue';
import InvoicesIndex from './pages/Customers/Invoices/Index.vue';
import InvoicesDue from './pages/Customers/Invoices/Due.vue';
import CreditNotesIndex from './pages/Customers/CreditNotes/Index.vue';
import ProInvoiceCreate from './pages/Customers/ProInvoices/Create.vue';
import ProjectsList from './pages/Customers/Projects/List.vue';
import ProjectsCreate from './pages/Customers/Projects/Create.vue';
import ProjectsShow from './pages/Customers/Projects/Show.vue';
import AccountTransactionsJournal from './pages/Finance/AccountTransactions/Journal.vue';
import JournalsIndex from './pages/Finance/Journals/Index.vue';
import JournalsManage from './pages/Finance/Journals/Manage.vue';
import JournalsShow from './pages/Finance/Journals/Show.vue';
import ZReportsIndex from './pages/Finance/ZReports/Index.vue';
import ZReportsCreate from './pages/Finance/ZReports/Create.vue';
import ZReportsShow from './pages/Finance/ZReports/Show.vue';
import AccountsIndex from './pages/Finance/Accounts/Index.vue';
import AccountsTypes from './pages/Finance/Accounts/Types.vue';
import AccountsMapping from './pages/Finance/Accounts/Mapping.vue';
import UsersIndex from './pages/Users/Users/Index.vue';
import UsersManage from './pages/Users/Users/Manage.vue';
import UsersShow from './pages/Users/Users/Show.vue';
import UsersLogs from './pages/Users/Users/Logs.vue';
import RolesIndex from './pages/Users/Roles/Index.vue';
import RolesManage from './pages/Users/Roles/Manage.vue';
import RolesPermissions from './pages/Users/Roles/Permissions.vue';
import PermissionsIndex from './pages/Users/Permissions/Index.vue';
import WorkScheduleCalendar from './pages/Users/WorkSchedule/Calendar.vue';
import WorkScheduleIndex from './pages/Users/WorkSchedule/Index.vue';
import OfficialHolidaysIndex from './pages/OfficialHolidays/Index.vue';
import OfficialHolidaysManage from './pages/OfficialHolidays/Manage.vue';
import VacationsOverview from './pages/Users/Vacations/Overview.vue';
import VacationsApply from './pages/Users/Vacations/Apply.vue';
import VacationsRequests from './pages/Users/Vacations/Requests.vue';
import VacationsShow from './pages/Users/Vacations/Show.vue';
import VacationsEdit from './pages/Users/Vacations/Edit.vue';
import VacationsEditBalance from './pages/Users/Vacations/EditBalance.vue';
import PersonsIndex from './pages/Persons/Index.vue';
import PersonsManage from './pages/Persons/Manage.vue';
import PersonsShow from './pages/Persons/Show.vue';
import StaticOffersIndex from './pages/StaticOffers/Index.vue';
import StaticOffersManage from './pages/StaticOffers/Manage.vue';
import StaticOffersShow from './pages/StaticOffers/Show.vue';
import TasksIndex from './pages/Tasks/Index.vue';
import TasksDashboard from './pages/Tasks/Dashboard.vue';
import TasksCreate from './pages/Tasks/Create.vue';
import TasksShow from './pages/Tasks/Show.vue';
import NotificationsIndex from './pages/Base/Notifications/Index.vue';
import NotificationsShow from './pages/Base/Notifications/Show.vue';
import OnlineUsers from './pages/Users/OnlineUsers.vue';
import SupportIndex from './pages/Support/Index.vue';
import SupportCreate from './pages/Support/Create.vue';
import SupportShow from './pages/Support/Show.vue';
import SupplierDepositsIndex from './pages/Suppliers/Deposits/Index.vue';
import SupplierDepositsManage from './pages/Suppliers/Deposits/Manage.vue';
import SupplierDepositsShow from './pages/Suppliers/Deposits/Show.vue';
import SupplierPaymentsIndex from './pages/Suppliers/Payments/Index.vue';
import SupplierPaymentsManage from './pages/Suppliers/Payments/Manage.vue';
import SupplierPaymentsShow from './pages/Suppliers/Payments/Show.vue';
import SupplierGiftCardsIndex from './pages/Suppliers/GiftCards/Index.vue';
import SupplierGiftCardsManage from './pages/Suppliers/GiftCards/Manage.vue';
import SupplierGiftCardsShow from './pages/Suppliers/GiftCards/Show.vue';
import SupplierRefundsIndex from './pages/Suppliers/Refunds/Index.vue';
import SupplierRefundsManage from './pages/Suppliers/Refunds/Manage.vue';
import SupplierRefundsShow from './pages/Suppliers/Refunds/Show.vue';
import Me from './pages/Me.vue';

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
    { path: '/suppliers/:id', name: 'suppliers.show', component: SuppliersShow },
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
    { path: '/customers/create', name: 'customers.create', component: CustomersManage },
    { path: '/customers/invoices', name: 'customerInvoices.list', component: InvoicesIndex },
    { path: '/customers/invoices/due', name: 'customerInvoices.due', component: InvoicesDue },
    { path: '/customers/credit-notes', name: 'customerCreditNotes.list', component: CreditNotesIndex },
    { path: '/customers/:customer/pro-invoices/create', name: 'customerProInvoices.create', component: ProInvoiceCreate },
    { path: '/projects', name: 'customerProjects.list', component: ProjectsList, props: { mode: 'active' } },
    { path: '/projects/finished', name: 'customerProjects.finished', component: ProjectsList, props: { mode: 'finished' } },
    { path: '/projects/create', name: 'customerProjects.create', component: ProjectsCreate },
    { path: '/projects/:id', name: 'customerProjects.show', component: ProjectsShow },
    { path: '/customers/:id', name: 'customers.show', component: CustomersShow },
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
    { path: '/accounts', name: 'accounts.list', component: AccountsIndex },
    { path: '/accounts/types', name: 'accounts.types', component: AccountsTypes },
    { path: '/accounts/mapping', name: 'accounts.mapping', component: AccountsMapping },
    { path: '/users', name: 'users.list', component: UsersIndex },
    { path: '/users/create', name: 'users.create', component: UsersManage },
    { path: '/users/logs', name: 'users.logs', component: UsersLogs },
    { path: '/users/:id/edit', name: 'users.edit', component: UsersManage },
    { path: '/users/:id', name: 'users.show', component: UsersShow },
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
