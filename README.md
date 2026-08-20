# Liara Cloud Console — Next.js + shadcn/ui

An RTL cloud dashboard rebuilt with Next.js App Router, Tailwind CSS v4, and locally owned shadcn/ui components.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm start
```

## Structure

- `app/` — Next.js App Router shell, metadata, and page
- `src/main.jsx` — interactive dashboard and application-creation flow
- `components/ui/` — shadcn/ui components owned by the project
- `lib/utils.js` — shadcn `cn()` class utility
- `components.json` — shadcn CLI configuration
- `src/index.css` — Tailwind v4 theme and global motion tokens

You can add more shadcn components later with:

```bash
npx shadcn@latest add dialog dropdown-menu toast
```
