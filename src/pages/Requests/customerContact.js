// Contact fields of a request form: the linked contact reference, or the
// person's data to save for the contact entered (see CustomerSection.vue).

export function emptyContactFields() {
    return {
        customer_name: '',
        customer_contact: '',
        person_contact_reference_id: null,
        person: { first_name: '', last_name: '', email: '' },
        connect_customer: false,
        customer_id: null,
        customer_relation_type: 3,
    };
}

/** Fill the contact fields from a request being edited. */
export function contactFieldsFromTask(task) {
    const fields = emptyContactFields();
    const [first, ...rest] = (task.customer_name ?? '').trim().split(/\s+/);

    fields.customer_name = task.customer_name ?? '';
    fields.customer_contact = task.customer_contact ?? '';
    fields.person_contact_reference_id = task.contact?.id ?? null;
    fields.person.first_name = first ?? '';
    fields.person.last_name = rest.join(' ');

    return fields;
}

/** Whether a contact from this source can be saved to a person. */
export function sourceSavesContact(sources, sourceId) {
    return Boolean(sources.find((s) => s.id === sourceId)?.contact_type);
}

/** The contact part of the payload sent to the API. */
export function contactPayload(form, sources) {
    const customer = form.connect_customer && form.customer_id
        ? { customer_id: form.customer_id, customer_relation_type: form.customer_relation_type }
        : {};

    if (form.person_contact_reference_id) {
        return {
            customer_name: form.customer_name,
            customer_contact: form.customer_contact,
            person_contact_reference_id: form.person_contact_reference_id,
            ...customer,
        };
    }

    const name = `${form.person.first_name ?? ''} ${form.person.last_name ?? ''}`.trim();
    const savesPerson = name !== ''
        && (form.customer_contact ?? '').trim() !== ''
        && sourceSavesContact(sources, form.source);

    return {
        customer_name: name,
        customer_contact: form.customer_contact,
        person_contact_reference_id: null,
        ...(savesPerson ? { person: { ...form.person }, ...customer } : {}),
    };
}

const CONTACT_KEYS = Object.keys(emptyContactFields());

/** The form without its contact fields (those go through contactPayload). */
export function withoutContactFields(form) {
    return Object.fromEntries(Object.entries(form).filter(([key]) => !CONTACT_KEYS.includes(key)));
}

/** Request payload: the other fields plus the contact part. */
export function requestPayload(form, sources) {
    return { ...withoutContactFields(form), ...contactPayload(form, sources) };
}
