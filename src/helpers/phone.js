// Phone numbers of contacts are stored as digits with the country code
// (37744159481, the way WhatsApp sends them) and shown as +377 44 159 481.
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

const DEFAULT_COUNTRY_CODE = '383';
const PHONE_LIKE = /^\+?[\d\s().\-/]+$/;

/** Digits with country code (same rules as the API); other values unchanged. */
export function normalizePhone(value) {
    const text = String(value ?? '').trim();
    if (!text || !PHONE_LIKE.test(text)) {
        return value;
    }

    let digits = text.replace(/\D+/g, '');
    if (!text.startsWith('+')) {
        if (digits.startsWith('00')) {
            digits = digits.slice(2);
        } else if (digits.startsWith('0')) {
            digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
        }
    }

    return digits.length >= 7 ? digits : value;
}

/** "+377 44 159 481" for anything that looks like a phone number; other values unchanged. */
export function formatPhone(value) {
    const digits = normalizePhone(value);
    if (typeof digits !== 'string' || !/^\d{7,}$/.test(digits)) {
        return value;
    }

    return parsePhoneNumberFromString(`+${digits}`)?.formatInternational() ?? `+${digits}`;
}
