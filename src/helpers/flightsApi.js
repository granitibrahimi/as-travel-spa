import axios from 'axios';

/**
 * Axios client for the standalone AS Flights API (charter-flight search plus the
 * destinations / travel-options routing table). This is a SEPARATE service from
 * the platform API in `api.js`: it is stateless and has no bearer-token auth, so
 * we deliberately don't attach an Authorization header here (doing so would only
 * add a needless CORS preflight).
 *
 * VITE_FLIGHTS_API_URL is the full base URL including `/api`, so request paths
 * are relative, e.g. flightsApi.get('/destinations').
 *
 * Unlike the platform API, list endpoints here return a plain JSON array (not a
 * `{ data, pagination }` envelope) and single resources are the bare record.
 */
const flightsApi = axios.create({
    baseURL: import.meta.env.VITE_FLIGHTS_API_URL ?? '/api',
    headers: {
        Accept: 'application/json',
    },
});

export default flightsApi;
