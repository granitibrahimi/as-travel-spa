const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const number = (value) => String(Math.round(value * 100) / 100);

/**
 * How this year's accumulated vacation days are made up, from a balance with
 * `accumulated_days` and `accrual` ({ months, days_per_month,
 * manually_adjusted }) as the API returns it: every month that has ended adds
 * allowance / 12 (18 / 12 = 1.5), rounded to whole days.
 * e.g. "8 months × 1.5 = 12 (January – August)".
 */
export function accrualNote(balance) {
    const accrual = balance?.accrual;

    if (! accrual) {
        return '';
    }

    if (accrual.months === null) {
        return accrual.manually_adjusted ? 'Set by hand — the full allowance applies.' : 'Full allowance for the year.';
    }

    if (accrual.months === 0) {
        return `No month has ended yet — ${number(accrual.days_per_month)} days are added at the end of each month.`;
    }

    const exact = accrual.days_per_month * accrual.months;
    const rounded = Math.abs(exact - balance.accumulated_days) > 0.001 ? `, rounded to ${balance.accumulated_days}` : '';
    const period = accrual.months === 1 ? monthNames[0] : `${monthNames[0]} – ${monthNames[accrual.months - 1]}`;

    return `${accrual.months} ${accrual.months === 1 ? 'month' : 'months'} × ${number(accrual.days_per_month)} = ${number(exact)}${rounded} (${period})`;
}
