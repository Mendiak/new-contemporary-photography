# New Contemporary Photography

[![Live Demo](https://img.shields.io/badge/Live-Demo-d13a00?style=for-the-badge)](https://new-contemporary-photography.vercel.app/)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=flat-square&logo=javascript&logoColor=000)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Flickr API](https://img.shields.io/badge/Flickr-API-0063dc?style=flat-square&logo=flickr&logoColor=fff)](https://www.flickr.com/services/api/)
[![License](https://img.shields.io/badge/License-ISC-111111?style=flat-square)](LICENSE)

A quiet photography showcase for the [New Contemporary Photography](https://www.flickr.com/groups/newcontemporaryphotography/) Flickr group. One photograph at a time, framed by typography rather than decoration.

[![Screenshot of the New Contemporary Photography viewer](assets/screenshot.jpg)](https://new-contemporary-photography.vercel.app/)

## About

The site pulls a random photograph from the group pool and presents it on a white passe-partout. On desktop, the photograph fills the viewport while the metadata lives in a sidebar; on mobile, the same content becomes a single, readable column.

Every photograph has a permalink (`?photo=ID`), so a shared link opens that exact image instead of another random one. Photographer credit, the original Flickr page, and save/copy actions are always one click away.

## Features

- **Desktop viewer** — photograph stage plus a metadata sidebar, sized to the viewport with no page scrolling for portrait or landscape images.
- **Mobile-first layout** — a single column that keeps the photograph, credit, and controls readable on small screens.
- **Photo permalinks** — `?photo=ID` URLs that open that exact image in the viewer.
- **Static photo pages** — generated `/photo/{id}/` pages with title, photographer, description, tags, original Flickr link and structured data.
- **Stable archive** — a curated `photo-manifest.json` with 195 photographs, paginated at `/archive/`, so indexed URLs do not disappear between builds.
- **Photo context** — breadcrumbs, previous/next navigation, capture details and Flickr tags on every photo page.
- **About page** — `/about/` with the group story, curation approach and `Person` structured data.
- **Auto-play** — cycles through the pool every 10 seconds.
- **Fullscreen mode** — a distraction-free view of the current photograph.
- **Light and dark themes** — follows the system preference by default, remembers the visitor's choice.
- **Copy and save** — copy the site permalink or download the current image, with a visible Flickr credit.
- **GA4 events** — photo views, next/autoplay, saves, link copies, Flickr clicks, theme and fullscreen changes.
- **Accessible by default** — keyboard navigation (`Space` / `Enter`), visible focus states, `aria-live` metadata, and reduced-motion support.

## Design Principles

- **Photography first.** The image sits on a constant white passe-partout; the interface stays quiet around it.
- **Typography over decoration.** IBM Plex Mono carries the hierarchy through size, weight, and whitespace.
- **One accent.** Safety orange in light mode, electric blue in dark mode, used only for focus, hover, and link underlines.
- **Silence by default.** Flat surfaces, 1px rules, generous whitespace. Motion is used only where it explains a change.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19+ (uses `--env-file-if-exists`)
- A [Flickr API key](https://www.flickr.com/services/apps/create/apply/)
- The Flickr group ID: `1023374@N21`

### Local development

1. **Clone the repository**

   ```bash
   git clone https://github.com/Mendiak/new-contemporary-photography.git
   cd new-contemporary-photography
   ```

2. **Configure your credentials**

   Create `.env.local` in the project root:

   ```dotenv
   NEXT_PUBLIC_FLICKR_API_KEY=YOUR_KEY_HERE
   NEXT_PUBLIC_FLICKR_GROUP_ID=1023374@N21
   ```

3. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   The dev script generates `public/config.js` and the static photo/archive pages from `.env.local`, then serves the site at [http://localhost:3000](http://localhost:3000).

### Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Generate config and pages, then start the local server on port 3000 |
| `npm run config` | Generate `public/config.js` only |
| `npm run curate` | Fetch recent photos and merge them into `photo-manifest.json` |
| `npm run pages` | Generate `/archive/`, `/about/`, `/photo/{id}/` and the sitemap from the manifest |
| `npm run build` | Generate config and pages (used by Vercel) |
| `npm start` | Alias for `npm run dev` |

> The project has no runtime dependencies: all scripts use only Node.js built-ins. The archive is built from `photo-manifest.json`; run `npm run curate` when you want to add new photographs.

## Project Structure

```text
.
├── public/
│   ├── index.html        # Markup, metadata and structured data
│   ├── styles.css        # Design tokens, viewer grid and responsive rules
│   ├── pages.css         # Static archive and photo page layout
│   ├── script.js         # Flickr API, viewer, permalinks and GA4 events
│   ├── static.js         # Theme handling for the static pages
│   ├── robots.txt
│   ├── favicon.png
│   └── assets/
│       └── screenshot.jpg
├── assets/screenshot.jpg # Screenshot used by the README
├── dev-server.js         # Zero-dependency local static server
├── generate-config.js    # Writes public/config.js from environment variables
├── generate-pages.js     # Generates /archive/, /about/, /photo/{id}/ and sitemap.xml
├── curate-photos.js      # Merges recent Flickr photos into photo-manifest.json
├── photo-data.js         # Shared photo size and metadata helpers
└── photo-manifest.json   # Stable list of selected photographs
```

The `public/archive/`, `public/photo/`, `public/about/` and `public/sitemap.xml`
files are generated at build time and are not committed.

## Deployment

The site is deployed on [Vercel](https://vercel.com/) and serves the `public` directory as a static site.

Set these environment variables in the Vercel project:

```text
NEXT_PUBLIC_FLICKR_API_KEY
NEXT_PUBLIC_FLICKR_GROUP_ID
```

The build step runs `npm run build`, which writes the credentials to `public/config.js` and generates the archive, about page, photo pages and sitemap from `photo-manifest.json` before deployment. To add new photographs, run `npm run curate` locally and commit the updated manifest.

## Analytics and SEO

- **Google Analytics 4** (`G-EDG153PWJP`) is linked to Search Console and receives custom events for the viewer interactions listed above.
- **Search Console** can verify the site through the existing meta tag.
- The generated `sitemap.xml` includes the archive pages, the about page and every photo page, plus an image sitemap with titles and captions.
- Static `/photo/{id}/` pages carry unique titles, descriptions, canonical URLs, `Photograph` and `BreadcrumbList` structured data.
- `photo-manifest.json` keeps photo URLs stable across builds, avoiding 404s after indexing.
- The viewer keeps `?photo=ID` permalinks for sharing, while `robots.txt` disallows crawling those query variants; each shared image points to its static photo page.

## Dedication

> "Web desarrollada en homenaje a los grandes trabajos fotográficos de este grupo y a todo lo aprendido gracias a ellos en mis años en Flickr."

A personal tribute to the photographers who inspired my journey.

## Credits

Designed and maintained by [Mikel Aramendia](https://mendiak.github.io/portfolio/), group admin. Find his photography on [Flickr](https://www.flickr.com/photos/mikelaramendia/). Photographs belong to their respective authors and are linked back to their original Flickr pages.

If you enjoy the project, you can [buy me a coffee](https://buymeacoffee.com/Mendiak).
