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
import OnlineUsers from './pages/OnlineUsers.vue';

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
    { path: '/sent-emails', name: 'sentEmails.index', component: SentEmailsIndex },
    { path: '/sent-emails/:id', name: 'sentEmails.show', component: SentEmailsShow },
    { path: '/online-users', name: 'online-users', component: OnlineUsers },
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
