// "5% pension, income tax 0% to 80 €, 4% to 250 €, 8% to 450 €, 10% above" —
// from the rates the API returns in `payroll` ({ pension_rate,
// employer_pension_rate, income_tax_bands: [[upper | null, rate], …] }).
export function payrollSummary(payroll) {
    if (! payroll) {
        return '5% pension, income tax by band';
    }

    const percent = (rate) => `${Math.round(rate * 1000) / 10}%`;
    const bands = payroll.income_tax_bands
        .map(([upper, rate]) => (upper === null ? `${percent(rate)} above` : `${percent(rate)} to ${upper} €`))
        .join(', ');

    return `${percent(payroll.pension_rate)} pension, income tax ${bands}`;
}
