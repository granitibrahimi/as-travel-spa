// Shape definitions + normalizers for reference data passed around the app.
// Plain JS (no TS): the @typedef gives editor autocomplete/hints and the
// factory turns a raw API payload into an object with the defined fields.

/**
 * A list paginator's meta, as returned by the API.
 *
 * @typedef {Object} PaginationMeta
 * @property {number} current_page  1-based index of the current page.
 * @property {number} per_page      Rows requested per page.
 * @property {number} from          1-based index of the first row on this page.
 * @property {number} to            1-based index of the last row on this page.
 * @property {number} total         Total rows across all pages.
 * @property {number} last_page     Index of the final page.
 */

/**
 * Normalize a paginator meta object into a {@link PaginationMeta} with safe
 * defaults. Callers pass the meta directly (e.g. `invoices.pagination`).
 *
 * @param {Object} [src]
 * @returns {PaginationMeta}
 */
export function normalizePagination(src = {}) {
    src = src ?? {};

    return {
        current_page: Number(src.current_page) || 1,
        per_page: Number(src.per_page) || 0,
        from: Number(src.from) || 0,
        to: Number(src.to) || 0,
        total: Number(src.total) || 0,
        last_page: Number(src.last_page) || 1,
    };
}