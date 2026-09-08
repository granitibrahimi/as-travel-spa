import { useDoubleTap } from './useDoubleTap';

/**
 * Fires `onTrigger` on a clean double-tap of the Shift key — the "search
 * everywhere" gesture JetBrains IDEs use. Thin wrapper over `useDoubleTap`;
 * see there for the timing/reset semantics and the call-site lifetime note.
 */
export function useDoubleShift(onTrigger, options) {
    useDoubleTap('Shift', onTrigger, options);
}
