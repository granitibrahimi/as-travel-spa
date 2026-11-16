import { nextTick } from 'vue';

/**
 * FLIP animation for cards that move between lists (e.g. board columns).
 *
 * Call `await flip(container, () => applyNewData())`: card positions are
 * measured before the update, then every card that moved glides from its old
 * spot to the new one, and cards that were not there before pop in. Cards are
 * found by `[data-flip-id]`.
 *
 * @returns {Promise<{moved: string[], added: string[]}>}
 */
export async function flip(container, update, { duration = 650, highlight = [] } = {}) {
    if (!container || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        update();
        await nextTick();
        return { moved: [], added: [] };
    }

    const before = new Map();
    container.querySelectorAll('[data-flip-id]').forEach((el) => {
        before.set(el.dataset.flipId, { rect: el.getBoundingClientRect(), column: el.dataset.flipColumn });
    });

    update();
    await nextTick();

    const moved = [];
    const added = [];
    const highlighted = new Set(highlight.map(String));

    container.querySelectorAll('[data-flip-id]').forEach((el) => {
        const id = el.dataset.flipId;
        const old = before.get(id);

        if (!old) {
            if (before.size > 0) {
                added.push(id);
                el.classList.remove('flip-new');
                void el.offsetWidth;
                el.classList.add('flip-new');
                el.addEventListener('animationend', () => el.classList.remove('flip-new'), { once: true });
            }
            return;
        }

        const now = el.getBoundingClientRect();
        const dx = old.rect.left - now.left;
        const dy = old.rect.top - now.top;
        const changedColumn = old.column !== el.dataset.flipColumn;

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !highlighted.has(id)) {
            return;
        }

        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
            el.style.transition = 'none';
            el.style.transform = `translate(${dx}px, ${dy}px)${changedColumn ? ' scale(1.04)' : ''}`;
            el.style.zIndex = changedColumn ? '20' : '';
            void el.offsetWidth;
            el.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
            el.style.transform = '';
            el.addEventListener('transitionend', () => {
                el.style.transition = '';
                el.style.zIndex = '';
            }, { once: true });
        }

        if (changedColumn || highlighted.has(id)) {
            moved.push(id);
            el.classList.remove('flip-moved');
            void el.offsetWidth;
            el.classList.add('flip-moved');
            el.addEventListener('animationend', () => el.classList.remove('flip-moved'), { once: true });
        }
    });

    return { moved, added };
}
