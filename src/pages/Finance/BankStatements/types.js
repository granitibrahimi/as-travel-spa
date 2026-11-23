// Kinds of bank transactions a statement line can be matched to
// (platform BankTransactionTypeEnum values).
export const transactionTypes = [
    { value: 6, label: 'Customer Payment' },
    { value: 7, label: 'Customer Refund' },
    { value: 4, label: 'Supplier Payment' },
    { value: 5, label: 'Supplier Refund' },
    { value: 1, label: 'Bank Deposit' },
    { value: 2, label: 'Expense' },
    { value: 3, label: 'Account Transfer' },
];

// Bank accounts first: payment methods of type Bank (2), else all of them.
export function bankAccountOptions(paymentMethods) {
    const banks = paymentMethods.filter((method) => Number(method.type) === 2);

    return (banks.length ? banks : paymentMethods).map((method) => ({ value: method.id, label: method.name }));
}
