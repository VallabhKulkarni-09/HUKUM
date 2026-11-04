// Deck element lookup shared by the deal animation modules.

export interface DeckRefs {
    anchor: HTMLElement;
    body: HTMLElement;
    shadow: HTMLElement;
    glintBar: HTMLElement;
    cards: HTMLElement[];
    sparks: HTMLElement[];
    flights: HTMLElement[];
    probe: HTMLElement | null;
}

/** Find the deck's elements inside a mounted layer (null if markup is missing). */
export function collectDeck(layer: HTMLElement): DeckRefs | null {
    const q = (s: string) => layer.querySelector<HTMLElement>(s);
    const all = (s: string) => Array.from(layer.querySelectorAll<HTMLElement>(s));
    const anchor = q('.deal-anchor'), body = q('.deal-body'), shadow = q('.deal-shadow'), glintBar = q('.deal-glint-bar');
    const cards = all('.deal-card');
    if (!anchor || !body || !shadow || !glintBar || cards.length === 0) return null;
    return { anchor, body, shadow, glintBar, cards, sparks: all('.deal-spark'), flights: all('.deal-flight'), probe: q('.deal-probe') };
}
