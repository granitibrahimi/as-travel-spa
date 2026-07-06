import './app.css';
import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initTheme } from './helpers/theme';
import { setUnauthenticatedHandler } from './helpers/api';

// Apply the saved/OS theme before anything renders (no flash of wrong theme).
initTheme();
import { useAuthStore } from './stores/auth';
import { usePresenceStore } from './stores/presence';
import { useIdleStore } from './stores/idle';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const auth = useAuthStore();
const presence = usePresenceStore();
const idle = useIdleStore();

// A 401 from the API drops the token; send the user back to login.
setUnauthenticatedHandler(() => {
    auth.reset();
    router.push({ name: 'login' });
});

// Resolve any persisted token into a user before the first render, so the
// route guard sees the correct auth state and we don't flash the login page.
auth.bootstrap().finally(() => {
    app.use(router);

    // Join/leave the online-users presence channel + arm the idle auto-logout
    // with auth state. Echo is already connected by the auth store on
    // login/bootstrap.
    watch(() => auth.isAuthenticated, (isAuthenticated) => {
        if (isAuthenticated) {
            presence.join();

            // Warn then log out after a spell of inactivity. The redirect carries
            // a hint so the login page can explain why the session ended.
            idle.start(async () => {
                await auth.logout();
                router.push({ name: 'login', query: { reason: 'idle' } });
            });
        } else {
            presence.leave();
            idle.stop();
        }
    }, { immediate: true });

    // Broadcast our current location to the channel on every navigation.
    router.afterEach((to) => presence.setLocation(to.fullPath));

    app.mount('#app');
});
