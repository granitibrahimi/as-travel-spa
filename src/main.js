import './app.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { setUnauthenticatedHandler } from './helpers/api';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const auth = useAuthStore();

// A 401 from the API drops the token; send the user back to login.
setUnauthenticatedHandler(() => {
    auth.reset();
    router.push({ name: 'login' });
});

// Resolve any persisted token into a user before the first render, so the
// route guard sees the correct auth state and we don't flash the login page.
auth.bootstrap().finally(() => {
    app.use(router);
    app.mount('#app');
});
