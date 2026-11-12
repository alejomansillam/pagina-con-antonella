# New Hire Onboarding Portal

A knowledge base portal where new hires sign in, read curated onboarding articles by category, search instantly, bookmark what matters, and track their onboarding checklist progress.

## Accounts

- Email + password signup and login, plus Google sign-in.
- Each new hire gets a profile (name, role/department, avatar initials).
- Public landing page explains the portal; everything else requires signing in.

## Knowledge base

Five categories, seeded with real starter articles so the portal is useful immediately:

- Welcome — first day, first week, who to meet
- Company culture — values, ways of working, communication norms
- Department workflows — engineering, sales, support, people ops
- Tools & systems — accounts, access requests, core apps
- FAQs — payroll, time off, expenses, equipment

Each article has a title, short summary, rich body, estimated reading time, and category. Article pages are readable, typography-first, with next/previous navigation inside the category.

## Instant search

A search bar in the header filters across article titles, summaries, and body text as the user types, with category labels on each result and keyboard navigation. Also reachable with a keyboard shortcut.

## Bookmarks

A bookmark toggle on every article and in search results. A "Saved" page lists everything the signed-in user bookmarked, newest first.

## Onboarding checklist

- A per-user reading checklist generated from the required articles.
- Progress bar on the dashboard ("8 of 24 complete"), grouped by category.
- Opening an article can mark it read; users can also check items off manually and un-check them.
- Dashboard shows what to read next and a completion celebration at 100%.

## Pages

- `/` — public landing page with sign-in call to action
- `/auth` — login and signup
- `/dashboard` — checklist progress, continue reading, recent bookmarks
- `/browse` — all categories
- `/category/:slug` — articles in a category
- `/article/:slug` — article reader
- `/saved` — bookmarked articles

## Design direction

Calm, editorial, confidence-building — deep ink navy with a warm amber accent, generous whitespace, strong reading typography. Not a generic purple SaaS dashboard.

## Technical notes

- Lovable Cloud provides auth, database, and storage.
- Tables: `profiles`, `articles`, `categories`, `bookmarks`, `checklist_items` (per-user read state). Row-level security scopes bookmarks and checklist state to the owner; articles and categories are readable by signed-in users.
- Seed migration inserts categories and starter articles as literal rows.
- Search runs client-side over the loaded article set for instant feedback; upgradeable to full-text search later.
- Protected pages live under the authenticated route layout; article/category reads go through server functions.
