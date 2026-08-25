import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Fires `onTrigger` when the Shift key is pressed twice in a row within
 * `withinMs`, with no other key in between — the same "search everywhere"
 * gesture JetBrains IDEs use. Any other keydown (including Shift+key combos
 * like Shift+Tab or Shift+ArrowLeft for text selection) resets the streak, so
 * it only fires on two clean, standalone Shift presses. Listens for as long
 * as the owning component stays mounted — gate that lifetime at the call site
 * (e.g. only while the user is signed in).
 */
export function useDoubleShift(onTrigger, { withinMs = 400 } = {}) {
    let armed = false;
    let lastTime = 0;

    function onKeydown(event) {
        if (event.key !== 'Shift') {
            armed = false;
            return;
        }

        // Holding Shift down auto-repeats keydown; that's not a second press.
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
