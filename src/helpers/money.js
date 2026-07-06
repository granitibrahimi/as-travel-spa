/**
 * Format a value as money: two decimals with a trailing Euro sign.
 * e.g. money(1234.5) => "1,234.50 €"
 *
 * Registered globally as `$money` (usable in any template) and importable
 * as `import { money } from '.../helpers/money'` inside <script setup>.
 */
export function money(value) {
    const number = Number(value ?? 0);
    const safe = Number.isFinite(number) ? number : 0;

    return `${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
