// Date/time conventions for the AS Travel API.
//
// STANDARD: dates are `d.m.Y` (e.g. 15.07.2026) everywhere — received from the
// API, sent to the API, held in component models, and shown to the user. Pages
// should NOT convert: bind date fields with the `DateInput` component
// (src/components/Form/DateInput.vue), whose v-model is `d.m.Y`, and send/receive
// that value verbatim.
//
// The `toInputDate`/`toApiDate` (+ datetime) helpers below exist only for the
// native `<input type="date">` boundary INSIDE DateInput — application code
// should not need them. `todayApiDate()` gives today's date for "defaults to
// now" fields; `parseApiDate()` turns an API string into a Date for
// sorting/comparisons.

/**
 * API `d.m.Y` (or `d.m.Y H:i:s`) → `<input type="date">` value `Y-m-d`.
 * Any time component is dropped.
 */
export function toInputDate(apiDate) {
    if (!apiDate) {
        return '';
    }

    const [date] = String(apiDate).split(' ');
    const [d, m, y] = date.split('.');

    return d && m && y ? `${y}-${m}-${d}` : '';
}

/** `<input type="date">` value `Y-m-d` → API `d.m.Y`. */
export function toApiDate(inputDate) {
    if (!inputDate) {
        return '';
    }

    const [y, m, d] = String(inputDate).split('-');

    return y && m && d ? `${d}.${m}.${y}` : '';
}

/** API `d.m.Y H:i:s` → `<input type="datetime-local">` value `Y-m-dTH:i`. */
export function toInputDateTime(apiDateTime) {
    if (!apiDateTime) {
        return '';
    }

    const [date, time = ''] = String(apiDateTime).split(' ');
    const day = toInputDate(date);

    if (!day) {
        return '';
    }

    const [h = '00', min = '00'] = time.split(':');

    return `${day}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`;
}

/** `<input type="datetime-local">` value `Y-m-dTH:i[:s]` → API `d.m.Y H:i:s`. */
export function toApiDateTime(inputDateTime) {
    if (!inputDateTime) {
        return '';
    }

    const [date, time = '00:00'] = String(inputDateTime).split('T');
    const day = toApiDate(date);

    if (!day) {
        return '';
    }

    const [h = '00', min = '00', s = '00'] = time.split(':');

    return `${day} ${h.padStart(2, '0')}:${min.padStart(2, '0')}:${s.padStart(2, '0')}`;
}

/** Today's local date as an API `d.m.Y` string (for "defaults to now" fields). */
export function todayApiDate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
}

export function apiDaysAfter(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function apiDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}



/**
 * Parse an API `d.m.Y` / `d.m.Y H:i:s` string into a local Date (for sorting,
 * comparisons, relative time). Returns null when the input is empty/invalid.
 */
export function parseApiDate(apiDate) {
    if (!apiDate) {
        return null;
    }

    const [date, time = '00:00:00'] = String(apiDate).split(' ');
    const [d, m, y] = date.split('.').map(Number);
    const [h, min, s] = time.split(':').map(Number);

    if (!y || !m || !d) {
        return null;
    }

    return new Date(y, m - 1, d, h || 0, min || 0, s || 0);
}
