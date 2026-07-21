// Shape definitions + casts for the platform's standard JSON envelopes.
//
// Every standard endpoint wraps its payload in `Modules\Base\DTO\JsonResponseObject`
// and tags it with a `type` discriminator (see the platform's
// `Modules\Base\Enums\ResponseType` and `Modules\Base\Responses\*`). This file
// mirrors those shapes as @typedefs (editor hints only — plain JS, no TS) and
// exposes small cast helpers that turn a raw axios response body into a
// normalized, predictable object.
//
// Usage — you almost always know the endpoint's kind, so call the specific cast:
//
//   const { data } = await api.get('/users/me');
//   const user = castResource(data);                 // the resource object
//
//   const { data } = await api.get('/customers/customers');
//   const { data: rows, pagination } = castPaginated(data);
//
//   const { data } = await api.post('/expenses', payload);
//   const { id } = castMutation(data);               // works for create AND update
//
// When you DON'T know the kind (e.g. a generic interceptor), `castResponse(body)`
// dispatches on the `type` field and returns a tagged, normalized result.

import { normalizePagination } from './pagination.js';

/** @typedef {import('./pagination.js').PaginationMeta} PaginationMeta */

/**
 * Discriminator values emitted by the platform — keep in sync with
 * `Modules\Base\Enums\ResponseType`.
 *
 * @readonly
 * @enum {string}
 */
export const ResponseType = Object.freeze({
    RESOURCE: 'resource',
    PAGINATED: 'paginated',
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    DISPATCHED: 'dispatched',
});

// ---------------------------------------------------------------------------
// Envelope shapes (as received on the wire)
// ---------------------------------------------------------------------------

/**
 * A single resource / arbitrary keyed payload.
 * `ShowResourceJsonResponse`, `GetResourceJsonResponse`.
 *
 * @typedef {Object} ResourceEnvelope
 * @property {Object} data           The resource object.
 * @property {'resource'} [type]
 */

/**
 * A paginated list. `PaginatedResourceJsonResponse`.
 *
 * @typedef {Object} PaginatedEnvelope
 * @property {{ items: Array, pagination: PaginationMeta, extra: Object }} data
 * @property {'paginated'} [type]
 */

/**
 * A freshly created or updated resource. `CreateResourceJsonResponse` and
 * `UpdateResourceJsonResponse` share the same shape: `id` nested under `data`,
 * a `message`, distinguished only by `type`.
 *
 * @typedef {Object} MutationEnvelope
 * @property {string} [message]
 * @property {{ id: (number|null) }} data
 * @property {('created'|'updated')} [type]
 */

/**
 * A message-only response. `DeleteResourceJsonResponse`,
 * `DispatchedResourceJsonResponse`.
 *
 * @typedef {Object} MessageEnvelope
 * @property {string} [message]
 * @property {('deleted'|'dispatched')} [type]
 */

// ---------------------------------------------------------------------------
// Normalized results (what the casts return)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PaginatedResult
 * @property {Array}          data        The page's rows.
 * @property {PaginationMeta} pagination  Normalized paginator meta.
 * @property {Object}         extra       Endpoint-specific extras (or `{}`).
 */

/**
 * @typedef {Object} MutationResult
 * @property {number|null} id       The affected resource id (or `null`).
 * @property {string|null} message  Human-readable status message (or `null`).
 */

/**
 * @typedef {Object} CastResult
 * @property {string|null}          type        The discriminator, if present.
 * @property {*}                    value        The kind-appropriate normalized
 *   payload: the resource object (RESOURCE), a {@link PaginatedResult}
 *   (PAGINATED), a {@link MutationResult} (CREATED/UPDATED), or `{ message }`
 *   (DELETED/DISPATCHED).
 */

// ---------------------------------------------------------------------------
// Casts
// ---------------------------------------------------------------------------

/**
 * Peel the API-Resource envelope: returns the inner `data` when present, else
 * the body itself. Tolerant of already-unwrapped payloads.
 *
 * @param {Object} [body]
 * @returns {*}
 */
export function unwrap(body) {
    return body?.data ?? body ?? null;
}

/**
 * Cast a resource envelope to its inner object.
 * For `ShowResourceJsonResponse` / `GetResourceJsonResponse`.
 *
 * @param {ResourceEnvelope|Object} [body]
 * @returns {Object|null}
 */
export function castResource(body) {
    return unwrap(body);
}

/**
 * Cast a paginated envelope to `{ data, pagination, extra }`.
 *
 * @param {PaginatedEnvelope|Object} [body]
 * @returns {PaginatedResult}
 */
export function castPaginated(body) {
    const inner = body?.data ?? body ?? {};

    return {
        data: Array.isArray(inner.items) ? inner.items : (Array.isArray(inner) ? inner : []),
        pagination: normalizePagination(inner.pagination),
        extra: (inner.extra && !Array.isArray(inner.extra)) ? inner.extra : {},
    };
}

/**
 * Cast a create OR update envelope to a common `{ id, message }`. Reads `id`
 * from `data.id` (current shape); tolerates a top-level `id` as a fallback.
 *
 * @param {MutationEnvelope|Object} [body]
 * @returns {MutationResult}
 */
export function castMutation(body) {
    return {
        id: body?.data?.id ?? body?.id ?? null,
        message: body?.message ?? null,
    };
}

/**
 * Cast a message-only envelope to `{ message }`.
 *
 * @param {MessageEnvelope|Object} [body]
 * @returns {{ message: (string|null) }}
 */
export function castMessage(body) {
    return { message: body?.message ?? null };
}

/**
 * Generic dispatcher: pick the right cast from the `type` discriminator. Use
 * this only when the endpoint kind isn't known at the call site (e.g. a shared
 * interceptor); otherwise prefer the specific cast above. Falls back to a
 * best-effort shape guess when `type` is absent (older/un-tagged responses).
 *
 * @param {Object} [body]
 * @returns {CastResult}
 */
export function castResponse(body) {
    const type = body?.type ?? null;

    switch (type) {
        case ResponseType.PAGINATED:
            return { type, value: castPaginated(body) };
        case ResponseType.CREATED:
        case ResponseType.UPDATED:
            return { type, value: castMutation(body) };
        case ResponseType.DELETED:
        case ResponseType.DISPATCHED:
            return { type, value: castMessage(body) };
        case ResponseType.RESOURCE:
            return { type, value: castResource(body) };
        default:
            // Untagged: infer from structure.
            if (body?.data && Array.isArray(body.data.items)) {
                return { type: ResponseType.PAGINATED, value: castPaginated(body) };
            }
            return { type, value: unwrap(body) };
    }
}
