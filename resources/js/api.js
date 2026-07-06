import axios from 'axios';

/**
 * Axios client for the AS Travel platform API. Cross-origin, bearer-token
 * authenticated — the token is attached from the auth store's persisted value.
 * VITE_API_URL points at the platform (e.g. https://csrm.test).
 */
const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api`,
    headers: {
        Accept: 'application/json',
    },
});

const TOKEN_KEY = 'as_travel_token';

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// A 401 means the token is gone/expired — drop it and let the router guard
// bounce to the login page. The reference is set by app.js after the store
// exists (avoids a circular import).
let onUnauthenticated = () => {};

export function setUnauthenticatedHandler(handler) {
    onUnauthenticated = handler;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            setToken(null);
            onUnauthenticated();
        }

        return Promise.reject(error);
    },
);

export default api;
