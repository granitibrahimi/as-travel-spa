import router from '../router';

/**
 * Resolve a named route to its URL path string — the SPA equivalent of
 * Laravel's `route()` helper. Use this instead of hardcoding URLs so that
 * changing a path in `src/router/routes/*` only requires updating it there;
 * every call site keeps working as long as the route `name` is unchanged.
 *
 * Route names mirror the platform's route names (e.g. `customers.show`,
 * `customerInvoices.create`). The returned value is a plain path string
 * (e.g. `/customers/customers/42`), so it's a drop-in replacement anywhere a
 * URL is used today — `:to`, `router.push()`, `href`, etc.
 *
 * Params can be passed three ways, just like Laravel:
 *
 *   // positional — mapped to the route's `:params` in declaration order
 *   routeUrl('customers.show', 42)                 // '/customers/customers/42'
 *   routeUrl('customerInvoices.create', 42, 7)     // two params, in order
 *   routeUrl('customerInvoices.create', [42, 7])   // same, as an array
 *
 *   // object — keys matching a `:param` become params, the rest become query
 *   routeUrl('customers.show', { id: 42 })
 *   routeUrl('customerInvoices.list', { q: 'x' })  // '/customers/invoices?q=x'
 *   routeUrl('customers.show', { id: 42, tab: 'invoices' }) // param + query
 *
 * @param {string} name Route name (see `src/router/routes/*`).
 * @param {...*}    args Positional param values, or a single object / array.
 * @returns {string} The resolved path (with query), or '#' if the name is unknown.
 */
export function routeUrl(name, ...args) {
    const names = paramNames(name);
    const params = {};
    const query = {};

    if (args.length === 1 && isPlainObject(args[0])) {
        // Object form: split keys into route params vs query (Laravel-style).
        for (const [key, value] of Object.entries(args[0])) {
            if (names.includes(key)) params[key] = value;
            else query[key] = value;
        }
    } else {
        // Positional form: scalars (or a single array) map to params in order.
        const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        values.forEach((value, i) => {
            if (names[i] != null) params[names[i]] = value;
        });
    }

    try {
        return router.resolve({ name, params, query }).href;
    } catch (e) {
        if (import.meta.env.DEV) {
            console.warn(`[routeUrl] could not resolve route "${name}":`, e?.message ?? e);
        }
        return '#';
    }
}

/**
 * Param names of a route, in declaration order — e.g. `/customers/:customer/
 * invoices/:id` → `['customer', 'id']`. Used to map positional args to params.
 */
function paramNames(name) {
    const record = router.getRoutes().find((r) => r.name === name);
    if (!record) return [];
    return (record.path.match(/:([A-Za-z0-9_]+)/g) || []).map((token) => token.slice(1));
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export default routeUrl;