// Badge colours for simple request statuses (ids from the API's SimpleTaskStatus).
export function requestStatusClass(status) {
    return {
        1: 'bg-red-100 text-red-700',
        2: 'bg-amber-100 text-amber-700',
        3: 'bg-green-100 text-green-700',
        4: 'bg-gray-200 text-gray-600',
    }[status?.id ?? status] ?? 'bg-gray-100 text-gray-600';
}
