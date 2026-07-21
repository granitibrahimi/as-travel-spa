import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Routes are split by domain under ./routes/*. Each module exports an array of
// route records with its own lazy `import()`s. They're concatenated below; the
// catch-all stays last so unknown paths fall through to NotFound. Route `name`s
// mirror the platform's route names — navigate with `router.push({ name })`.
import shell from './routes/shell';
import suppliers from './routes/suppliers';
import customers from './routes/customers';
import finance from './routes/finance';
import base from './routes/base';
import flights from './routes/flights';
import hr from './routes/hr';
import crm from './routes/crm';
import users from './routes/users';

const NotFound = () => import('../pages/NotFound.vue');

const routes = [
    ...shell,
    ...suppliers,
    ...customers,
    ...finance,
    ...users,
    ...base,
    ...flights,
    ...hr,
    ...crm,
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
