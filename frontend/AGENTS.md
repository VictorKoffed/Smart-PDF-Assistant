# AGENTS.md for Smart PDF Frontend

## Development Environment & Tech Stack
- **Framework:** React 18 (Vite)
- **Commands:** `npm run dev` (Starts the development server), `npm install` (Installs dependencies)
- **Styling:** Plain CSS (No Tailwind or Bootstrap!). All design tokens are defined as CSS variables in `App.css` and `index.css`.
- **API requests:** Uses the built-in `fetch()`. The base URL is read from `import.meta.env.VITE_API_URL`.

## Code Generation Rules
1. **Preserve CSS structure:** Do not create inline styles or add Tailwind classes. Continue using the existing classes (e.g. `.message-bubble`, `.ai-pop-animation`) and CSS variables (e.g. `var(--accent)`, `var(--bg)`).
2. **Session management:** All requests to `/upload` and `/ask` MUST include the `'X-Session-ID'` header. This value is obtained from `sessionIdRef.current`.
3. **Animations:** The application uses CSS animations (such as `ai-pop-animation`) that are triggered when a component is re-rendered (forced through dynamic `key` props in React). Do not modify this logic unless explicitly requested.
4. **Components:** Keep all code functional (Functional Components) and use React Hooks (`useState`, `useEffect`, `useRef`).
5. **DOM manipulation:** Avoid using `document.getElementById` or similar APIs. Always use React refs (`useRef`).
