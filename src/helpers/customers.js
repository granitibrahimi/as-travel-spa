// Customer type ids (platform CustomerTypeEnum).
export const CUSTOMER_TYPE_AQP = 5;

// Only AQP customers (institutions) have departments, and only their invoices
// can be assigned to one. Accepts the customer resource ({ type: { id } }).
export function hasDepartments(customer) {
    return Number(customer?.type?.id ?? customer?.type) === CUSTOMER_TYPE_AQP;
}
