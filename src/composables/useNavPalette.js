import { ref } from 'vue';

/**
 * Shared open-state for the navigation palette (NavPalette.vue). Module-level
 * so any component can drive the same overlay: the double-tap Ctrl / Cmd+K
 * handler inside NavPalette itself, and the header logo, which double-tap opens
 * the palette on touch devices where those keyboard gestures aren't available.
 */
const isOpen = ref(false);

// Timestamp of the last logo tap, kept at module scope so it survives the
// header remounting when the first tap navigates home.
let lastLogoTapAt = 0;

export function useNavPalette() {
    return {
        isOpen,
        open: () => { isOpen.value = true; },
        close: () => { isOpen.value = false; },
        toggle: () => { isOpen.value = !isOpen.value; },

        /**
         * Record a logo tap. Returns true when it completes a double-tap within
         * `withinMs` — the palette is opened and the caller should suppress the
         * logo's normal navigation.
         */
        registerLogoTap: (withinMs = 400) => {
            const now = Date.now();

            if (now - lastLogoTapAt < withinMs) {
                lastLogoTapAt = 0;
                isOpen.value = true;

                return true;
            }

            lastLogoTapAt = now;

            return false;
        },
    };
}
