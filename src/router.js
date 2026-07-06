import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import Login from './pages/Login.vue';
import Home from './pages/Home.vue';
import NotFound from './pages/NotFound.vue';
import SuppliersIndex from './pages/Suppliers/Index.vue';
import SuppliersManage from './pages/Suppliers/Manage.vue';
import SuppliersShow from './pages/Suppliers/Show.vue';
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
import ProductsIndex from './pages/Products/Index.vue';
import ProductsManage from './pages/Products/Manage.vue';
import HotelsIndex from './pages/Hotels/Index.vue';
import HotelsManage from './pages/Hotels/Manage.vue';
import DestinationsIndex from './pages/Destinations/Index.vue';
import DestinationsManage from './pages/Destinations/Manage.vue';
import DestinationsMerge from './pages/Destinations/Merge.vue';
import DestinationsParent from './pages/Destinations/Parent.vue';
import ParentDestinationsIndex from './pages/ParentDestinations/Index.vue';
import ParentDestinationsManage from './pages/ParentDestinations/Manage.vue';
import ParentDestinationsChildren from './pages/ParentDestinations/ChildDestinations.vue';
import AnnouncementsIndex from './pages/Base/Announcements/Index.vue';
import AnnouncementsManage from './pages/Base/Announcements/Manage.vue';
import AnnouncementsNew from './pages/Base/Announcements/New.vue';
import AnnouncementsStatistics from './pages/Base/Announcements/Statistics.vue';
import MessagesIndex from './pages/Messages/Index.vue';
import MessagesCreate from './pages/Messages/Create.vue';
import MessagesShow from './pages/Messages/Show.vue';
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
import AccountTransactionsJournal from './pages/Finance/AccountTransactions/Journal.vue';
import JournalsIndex from './pages/Journals/Index.vue';
import JournalsManage from './pages/Journals/Manage.vue';
import JournalsShow from './pages/Journals/Show.vue';
import ZReportsIndex from './pages/Finance/ZReports/Index.vue';
import ZReportsCreate from './pages/Finance/ZReports/Create.vue';
import ZReportsShow from './pages/Finance/ZReports/Show.vue';
import AccountsIndex from './pages/Finance/Accounts/Index.vue';
import AccountsTypes from './pages/Finance/Accounts/Types.vue';
import AccountsMapping from './pages/Finance/Accounts/Mapping.vue';
import UsersIndex from './pages/Users/Index.vue';
import UsersManage from './pages/Users/Manage.vue';
import UsersShow from './pages/Users/Show.vue';
import UsersLogs from './pages/Users/Logs.vue';
import RolesIndex from './pages/Roles/Index.vue';
import RolesManage from './pages/Roles/Manage.vue';
import RolesPermissions from './pages/Roles/Permissions.vue';
import PermissionsIndex from './pages/Permissions/Index.vue';
import WorkScheduleIndex from './pages/WorkSchedule/Index.vue';
import OfficialHolidaysIndex from './pages/OfficialHolidays/Index.vue';
import OfficialHolidaysManage from './pages/OfficialHolidays/Manage.vue';
import VacationsOverview from './pages/Vacations/Overview.vue';
import VacationsApply from './pages/Vacations/Apply.vue';
import VacationsRequests from './pages/Vacations/Requests.vue';
import VacationsShow from './pages/Vacations/Show.vue';
import VacationsEdit from './pages/Vacations/Edit.vue';
import VacationsEditBalance from './pages/Vacations/EditBalance.vue';
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
import NotificationsIndex from './pages/Notifications/Index.vue';
import OnlineUsers from './pages/OnlineUsers.vue';
import Me from './pages/Me.vue';

const routes = [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', name: 'home', component: Home },
    { path: '/suppliers', name: 'suppliers.index', component: SuppliersIndex },
    { path: '/suppliers/create', name: 'suppliers.create', component: SuppliersManage },
    { path: '/suppliers/:id', name: 'suppliers.show', component: SuppliersShow },
    { path: '/customers', name: 'customers.index', component: CustomersIndex },
    { path: '/customers/create', name: 'customers.create', component: CustomersManage },
    { path: '/customers/invoices', name: 'customerInvoices.index', component: InvoicesIndex },
    { path: '/customers/invoices/due', name: 'customerInvoices.due', component: InvoicesDue },
    { path: '/customers/credit-notes', name: 'customerCreditNotes.index', component: CreditNotesIndex },
    { path: '/customers/:customer/pro-invoices/create', name: 'customerProInvoices.create', component: ProInvoiceCreate },
    { path: '/customers/:id', name: 'customers.show', component: CustomersShow },
    { path: '/finance/account-transactions/journal/:type/:reference', name: 'accountTransactions.journal', component: AccountTransactionsJournal },
    { path: '/departures', name: 'departures.index', component: DeparturesIndex },
    { path: '/departures/overview', name: 'departures.overview', component: DeparturesOverview },
    { path: '/meal-types', name: 'mealTypes.index', component: MealTypesIndex },
    { path: '/meal-types/create', name: 'mealTypes.create', component: MealTypesManage },
    { path: '/meal-types/:id/edit', name: 'mealTypes.edit', component: MealTypesManage },
    { path: '/countries', name: 'countries.index', component: CountriesIndex },
    { path: '/countries/:id/edit', name: 'countries.edit', component: CountriesManage },
    { path: '/products', name: 'products.index', component: ProductsIndex },
    { path: '/products/create', name: 'products.create', component: ProductsManage },
    { path: '/products/:id/edit', name: 'products.edit', component: ProductsManage },
    { path: '/hotels', name: 'hotels.index', component: HotelsIndex },
    { path: '/hotels/create', name: 'hotels.create', component: HotelsManage },
    { path: '/hotels/:id/edit', name: 'hotels.edit', component: HotelsManage },
    { path: '/destinations', name: 'destinations.index', component: DestinationsIndex },
    { path: '/destinations/create', name: 'destinations.create', component: DestinationsManage },
    { path: '/destinations/merge', name: 'destinations.merge', component: DestinationsMerge },
    { path: '/destinations/parent', name: 'destinations.parent', component: DestinationsParent },
    { path: '/destinations/:id/edit', name: 'destinations.edit', component: DestinationsManage },
    { path: '/parent-destinations', name: 'parentDestinations.index', component: ParentDestinationsIndex },
    { path: '/parent-destinations/create', name: 'parentDestinations.create', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/edit', name: 'parentDestinations.edit', component: ParentDestinationsManage },
    { path: '/parent-destinations/:id/destinations', name: 'parentDestinations.children', component: ParentDestinationsChildren },
    { path: '/announcements', name: 'announcements.index', component: AnnouncementsIndex },
    { path: '/announcements/create', name: 'announcements.create', component: AnnouncementsManage },
    { path: '/announcements/new', name: 'announcements.new', component: AnnouncementsNew },
    { path: '/announcements/:id/edit', name: 'announcements.edit', component: AnnouncementsManage },
    { path: '/announcements/:id/statistics', name: 'announcements.statistics', component: AnnouncementsStatistics },
    { path: '/messages', name: 'messages.index', component: MessagesIndex },
    { path: '/messages/create', name: 'messages.create', component: MessagesCreate },
    { path: '/messages/:id', name: 'messages.show', component: MessagesShow },
    { path: '/online-credentials', name: 'onlineCredentials.index', component: OnlineCredentialsIndex },
    { path: '/online-credentials/:id', name: 'onlineCredentials.show', component: OnlineCredentialsShow },
    { path: '/payment-methods', name: 'paymentMethods.index', component: PaymentMethodsIndex },
    { path: '/payment-methods/create', name: 'paymentMethods.create', component: PaymentMethodsManage },
    { path: '/payment-methods/:id/edit', name: 'paymentMethods.edit', component: PaymentMethodsManage },
    { path: '/tax-types', name: 'taxTypes.index', component: TaxTypesIndex },
    { path: '/tax-types/create', name: 'taxTypes.create', component: TaxTypesManage },
    { path: '/tax-types/:id/edit', name: 'taxTypes.edit', component: TaxTypesManage },
    { path: '/journals', name: 'journals.index', component: JournalsIndex },
    { path: '/journals/create', name: 'journals.create', component: JournalsManage },
    { path: '/journals/:id/edit', name: 'journals.edit', component: JournalsManage },
    { path: '/journals/:id', name: 'journals.show', component: JournalsShow },
    { path: '/z-reports', name: 'zReports.index', component: ZReportsIndex },
    { path: '/z-reports/create', name: 'zReports.create', component: ZReportsCreate },
    { path: '/z-reports/:id', name: 'zReports.show', component: ZReportsShow },
    { path: '/accounts', name: 'accounts.index', component: AccountsIndex },
    { path: '/accounts/types', name: 'accounts.types', component: AccountsTypes },
    { path: '/accounts/mapping', name: 'accounts.mapping', component: AccountsMapping },
    { path: '/users', name: 'users.index', component: UsersIndex },
    { path: '/users/create', name: 'users.create', component: UsersManage },
    { path: '/users/logs', name: 'users.logs', component: UsersLogs },
    { path: '/users/:id/edit', name: 'users.edit', component: UsersManage },
    { path: '/users/:id', name: 'users.show', component: UsersShow },
    { path: '/roles', name: 'roles.index', component: RolesIndex },
    { path: '/roles/create', name: 'roles.create', component: RolesManage },
    { path: '/roles/:id/edit', name: 'roles.edit', component: RolesManage },
    { path: '/roles/:id/permissions', name: 'roles.permissions', component: RolesPermissions },
    { path: '/permissions', name: 'permissions.index', component: PermissionsIndex },
    { path: '/work-schedule', name: 'workSchedule.index', component: WorkScheduleIndex },
    { path: '/official-holidays', name: 'officialHolidays.index', component: OfficialHolidaysIndex },
    { path: '/official-holidays/create', name: 'officialHolidays.create', component: OfficialHolidaysManage },
    { path: '/official-holidays/:id/edit', name: 'officialHolidays.edit', component: OfficialHolidaysManage },
    { path: '/vacations', name: 'vacations.index', component: VacationsOverview },
    { path: '/vacations/apply', name: 'vacations.apply', component: VacationsApply },
    { path: '/vacations/requests', name: 'vacations.requests', component: VacationsRequests },
    { path: '/vacations/:userId/balance', name: 'vacations.balance', component: VacationsEditBalance },
    { path: '/vacations/:id/edit', name: 'vacations.edit', component: VacationsEdit },
    { path: '/vacations/:id', name: 'vacations.show', component: VacationsShow },
    { path: '/travelers', name: 'persons.index', component: PersonsIndex },
    { path: '/travelers/create', name: 'persons.create', component: PersonsManage },
    { path: '/travelers/:id/edit', name: 'persons.edit', component: PersonsManage },
    { path: '/travelers/:id', name: 'persons.show', component: PersonsShow },
    { path: '/offers', name: 'staticOffers.index', component: StaticOffersIndex },
    { path: '/offers/create', name: 'staticOffers.create', component: StaticOffersManage },
    { path: '/offers/:id/edit', name: 'staticOffers.edit', component: StaticOffersManage },
    { path: '/offers/:id', name: 'staticOffers.show', component: StaticOffersShow },
    { path: '/tasks', name: 'tasks.index', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/sent-emails', name: 'sentEmails.index', component: SentEmailsIndex },
    { path: '/sent-emails/:id', name: 'sentEmails.show', component: SentEmailsShow },
    { path: '/quickbooks/sync', name: 'quickBooksSync.index', component: QuickBooksSyncIndex },
    { path: '/quickbooks/sync/:id', name: 'quickBooksSync.show', component: QuickBooksSyncShow },
    { path: '/notifications', name: 'notifications.index', component: NotificationsIndex },
    { path: '/online-users', name: 'online-users', component: OnlineUsers },
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
