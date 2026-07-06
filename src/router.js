import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth';
import Login from './pages/Login.vue';
import Home from './pages/Home.vue';
import NotFound from './pages/NotFound.vue';
import SuppliersIndex from './pages/Suppliers/Index.vue';
import SuppliersManage from './pages/Suppliers/Manage.vue';
import SuppliersShow from './pages/Suppliers/Show.vue';
import CustomersIndex from './pages/Customers/Index.vue';
import CustomersManage from './pages/Customers/Manage.vue';
import CustomersShow from './pages/Customers/Show.vue';
import DeparturesIndex from './pages/Departures/Index.vue';
import DeparturesOverview from './pages/Departures/Overview.vue';
import MealTypesIndex from './pages/MealTypes/Index.vue';
import MealTypesManage from './pages/MealTypes/Manage.vue';
import CountriesIndex from './pages/Countries/Index.vue';
import CountriesManage from './pages/Countries/Manage.vue';
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
import AnnouncementsIndex from './pages/Announcements/Index.vue';
import AnnouncementsManage from './pages/Announcements/Manage.vue';
import AnnouncementsNew from './pages/Announcements/New.vue';
import AnnouncementsStatistics from './pages/Announcements/Statistics.vue';
import MessagesIndex from './pages/Messages/Index.vue';
import MessagesCreate from './pages/Messages/Create.vue';
import MessagesShow from './pages/Messages/Show.vue';
import OnlineCredentialsIndex from './pages/OnlineSystemCredentials/Index.vue';
import OnlineCredentialsShow from './pages/OnlineSystemCredentials/Show.vue';
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
    { path: '/customers/:id', name: 'customers.show', component: CustomersShow },
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
    { path: '/sent-emails', name: 'sentEmails.index', component: SentEmailsIndex },
    { path: '/sent-emails/:id', name: 'sentEmails.show', component: SentEmailsShow },
    { path: '/quickbooks/sync', name: 'quickBooksSync.index', component: QuickBooksSyncIndex },
    { path: '/quickbooks/sync/:id', name: 'quickBooksSync.show', component: QuickBooksSyncShow },
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
