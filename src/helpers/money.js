/**
 * Format a value as money: two decimals with a trailing Euro sign.
 * e.g. money(1234.5) => "1,234.50 €"
 *
 * Registered globally as `$money` (usable in any template) and importable
 * as `import { money } from '.../helpers/money'` inside <script setup>.
 */
export function money(value) {
    const number = Number(value ?? 0);
    let safe = Number.isFinite(number) ? number : 0;

    // Avoid rendering "-0.00" for values that are zero, or negative but
    // round to zero at 2 decimals (e.g. -0, or a -0.001 rounding artifact).
    if (Math.round(safe * 100) === 0) {
        safe = 0;
    }

    return `${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
}
