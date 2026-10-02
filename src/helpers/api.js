import axios from 'axios';

/**
 * Axios client for the AS Travel platform API. Cross-origin, bearer-token
 * authenticated — the token is attached from the auth store's persisted value.
 * VITE_API_URL is the full API base including the version, e.g.
 * https://csrm.test/api/v1 — so request paths are relative ('/tokens', '/me').
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
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

// A 403 means the user is authenticated but not allowed to perform the action —
// send them to the "unauthorized" page. Set by main.js once the router exists.
let onForbidden = () => {};

export function setForbiddenHandler(handler) {
    onForbidden = handler;
}

// A 404 on a GET means the record the page is loading doesn't exist (bad id,
// or it was deleted) — show the "not found" page instead of a stuck loader.
// Only GETs: a failed mutation shouldn't navigate away. A request where a 404
// is an expected state handles it itself by passing `notFoundRedirect: false`.
// Set by main.js once the router exists.
let onNotFound = () => {};

export function setNotFoundHandler(handler) {
    onNotFound = handler;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            setToken(null);
            onUnauthenticated();
        }

        if (error.response?.status === 403) {
            onForbidden();
        }

        if (error.response?.status === 404 && error.config?.method === 'get' && error.config.notFoundRedirect !== false) {
            onNotFound();
        }

        return Promise.reject(error);
    },
);

//Some functions that can be used to pull generaly used endpoints

export function getDestinationsAutosuggestEndpoint(){
    return '/destinations/autosuggest';
}

export function getParentDestinationsAutosuggestEndpoint(){
    return '/parent-destinations/autosuggest';
}

export function getUsersAutosuggestEndpoint(){
    return '/users/users/autosuggest';
}



export default api;
