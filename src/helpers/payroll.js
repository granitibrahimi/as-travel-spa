// "5% pension, income tax 0% to 250 €, 8% to 450 €, 10% above" —
// from the rates the API returns in `payroll` ({ pension_rate,
// employer_pension_rate, income_tax_bands: [[upper | null, rate], …],
// secondary_income_tax_rate }).
export function payrollSummary(payroll) {
    if (! payroll) {
        return '5% pension, income tax by band';
    }

    const percent = (rate) => `${Math.round(rate * 1000) / 10}%`;
    const bands = payroll.income_tax_bands
        .map(([upper, rate]) => (upper === null ? `${percent(rate)} above` : `${percent(rate)} to ${upper} €`))
        .join(', ');

    const secondary = payroll.secondary_income_tax_rate === undefined ? '' : `; secondary job: flat ${percent(payroll.secondary_income_tax_rate)}; in pension: no pension`;

    return `${percent(payroll.pension_rate)} pension, income tax ${bands}${secondary}`;
}

// How a contract / payroll row is taxed when it isn't a primary job:
// "In pension" (no pension contributions), "Secondary job" (flat income tax).
export function taxationLabels(row) {
    return [row?.in_pension && 'In pension', row?.secondary_job && 'Secondary job'].filter(Boolean);
}
