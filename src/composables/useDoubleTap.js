import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Fires `onTrigger` when `key` (a `KeyboardEvent.key` value such as `'Shift'`
 * or `'Control'`) is pressed twice in a row within `withinMs`, with no other
 * key in between — the "search everywhere" gesture JetBrains IDEs use for
 * double-Shift. Any other keydown (including modifier+key combos like Shift+Tab
 * or Ctrl+C) resets the streak, so it only fires on two clean, standalone
 * presses. Listens for as long as the owning component stays mounted — gate
 * that lifetime at the call site (e.g. only while the user is signed in).
 */
export function useDoubleTap(key, onTrigger, { withinMs = 400 } = {}) {
    let armed = false;
    let lastTime = 0;

    function onKeydown(event) {
        if (event.key !== key) {
            armed = false;
            return;
        }

        // Holding the key down auto-repeats keydown; that's not a second press.
        if (event.repeat) {
            return;
        }

        const now = Date.now();

        if (armed && now - lastTime < withinMs) {
            armed = false;
            onTrigger();
            return;
        }

        armed = true;
        lastTime = now;
    }

    onMounted(() => document.addEventListener('keydown', onKeydown));
    onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
}
