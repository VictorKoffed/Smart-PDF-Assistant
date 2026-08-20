# AGENTS.md för Smart PDF Frontend

## Utvecklingsmiljö & Tech Stack
- **Framework:** React 18 (Vite)
- **Kommandon:** `npm run dev` (Startar server), `npm install` (Beroenden)
- **Styling:** Ren CSS (Ingen Tailwind eller Bootstrap!). Alla design-tokens finns som CSS-variabler i `App.css` och `index.css`.
- **API-anrop:** Använder inbyggda `fetch()`. Base-URL hämtas från `import.meta.env.VITE_API_URL`.

## Regler för kodgenerering
1. **Behåll CSS-struktur:** Skapa inte inline-styles och lägg inte till Tailwind-klasser. Fortsätt använda de existerande klasserna (t.ex. `.message-bubble`, `.ai-pop-animation`) och CSS-variablerna (t.ex. `var(--accent)`, `var(--bg)`).
2. **Sessionshantering:** Alla anrop mot `/upload` och `/ask` MÅSTE inkludera headern `'X-Session-ID'`. Detta värde hämtas från `sessionIdRef.current`.
3. **Animeringar:** Appen använder CSS-animationer (som `ai-pop-animation`) som triggas om komponenten renderas om (tvingas fram via dynamiska `key`-props i React). Rör inte denna logik om du inte uttryckligen ombeds.
4. **Komponenter:** Håll all kod funktionell (Functional Components) och använd React Hooks (`useState`, `useEffect`, `useRef`).
5. **DOM-manipulation:** Undvik att använda `document.getElementById` eller liknande. Använd alltid React-refs (`useRef`).
