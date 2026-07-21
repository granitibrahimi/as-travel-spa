// App-shell routes: auth entry, home, current-user, and error pages.
// The catch-all (/:pathMatch) lives in ../index.js so it always sorts last.
const Login = () => import('../../pages/Login.vue');
const Home = () => import('../../pages/Home.vue');
const Me = () => import('../../pages/Me.vue');
const Forbidden = () => import('../../pages/Forbidden.vue');
const OnlineUsers = () => import('../../pages/Users/OnlineUsers.vue');

export default [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/', name: 'home', component: Home },
    { path: '/online-users', name: 'online-users', component: OnlineUsers },
    { path: '/me', name: 'me', component: Me },
    { path: '/403', name: 'forbidden', component: Forbidden },
];
