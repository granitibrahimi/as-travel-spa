import { useFormOptionsStore } from '../stores/formOptions';

// Repository over the cached payment-method form options. Reads from the
// formOptions store (localStorage-backed, synced on login / "Update data" and
// kept warm by the router guard's `ensure()` on every page), so nothing here
// hits the network.
//
// Select helpers mirror the platform's PaymentMethodRepository, e.g.
//   $this->paymentMethods->getIncomingSelectList()
//       ->map(fn (string $label, int $value) => ['value' => $value, 'label' => $label])
// returning `[{ value, label }]` ready for the SearchSelect component.

// Map full payment-method resources to SearchSelect options.
function toSelect(methods) {
    return methods.map((method) => ({ value: method.id, label: method.name }));
}

export function usePaymentMethodsRepository() {
    const formOptions = useFormOptionsStore();

    // All cached payment methods (full resource objects).
    const all = () => formOptions.paymentMethods;

    return {
        all,

        // Incoming methods only, as [{ value, label }] for SearchSelect.
        incoming: () => toSelect(all().filter((method) => method.incoming)),

        // Outgoing methods only, as [{ value, label }] for SearchSelect.
        outgoing: () => toSelect(all().filter((method) => method.outgoing)),
    };
}