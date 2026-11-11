const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'https://new-contemporary-photography.vercel.app';
const API_URL = 'https://api.flickr.com/services/rest/';
const PUBLIC_DIR = path.join(__dirname, 'public');
const PHOTO_COUNT = Math.min(Math.max(Number(process.env.PAGES_PHOTO_COUNT) || 60, 1), 200);

const PHOTO_EXTRAS = [
  'owner_name',
  'datetaken',
  'url_k', 'width_k', 'height_k',
  'url_h', 'width_h', 'height_h',
  'url_b', 'width_b', 'height_b',
  'url_c', 'width_c', 'height_c',
  'url_z', 'width_z', 'height_z',
  'url_w', 'width_w', 'height_w',
  'url_m', 'width_m', 'height_m',
].join(',');

const SIZES = [
  { url: 'url_k', width: 'width_k', height: 'height_k' },
  { url: 'url_h', width: 'width_h', height: 'height_h' },
  { url: 'url_b', width: 'width_b', height: 'height_b' },
  { url: 'url_c', width: 'width_c', height: 'height_c' },
  { url: 'url_z', width: 'width_z', height: 'height_z' },
  { url: 'url_w', width: 'width_w', height: 'height_w' },
  { url: 'url_m', width: 'width_m', height: 'height_m' },
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeXml(value) {
  return escapeHtml(value);
}

function photoSizes(photo) {
  return SIZES
    .filter(size => photo[size.url])
    .map(size => ({
      url: photo[size.url],
      width: Number(photo[size.width]) || null,
      height: Number(photo[size.height]) || null,
    }))
    .sort((a, b) => (b.width || 0) - (a.width || 0));
}

function srcsetFor(sizes) {
  return [...sizes]
    .reverse()
    .filter(size => size.width)
    .map(size => `${size.url} ${size.width}w`)
    .join(', ');
}

function dateFor(photo) {
  const timestamp = Number(photo.dateadded);
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function flickrUrls(photo) {
  return {
    photo: `https://www.flickr.com/photos/${encodeURIComponent(photo.owner)}/${encodeURIComponent(photo.id)}/`,
    profile: `https://www.flickr.com/photos/${encodeURIComponent(photo.owner)}/`,
  };
}

function pageHead({ title, description, canonical, image, jsonLd, ogType = 'website' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="icon" type="image/x-icon" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages.css">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header class="static-header">
    <a class="static-brand" href="/">New Contemporary Photography</a>
    <nav class="static-nav" aria-label="Site">
      <a href="/archive/">Archive</a>
      <a href="https://www.flickr.com/groups/newcontemporaryphotography/" target="_blank" rel="noopener noreferrer">Flickr group</a>
      <button type="button" class="tool-button" data-theme-toggle aria-pressed="false">Dark</button>
    </nav>
  </header>
`;
}

function pageFooter() {
  return `  <footer class="site-footer">
    <p>
      Website by <a href="https://mendiak.github.io/portfolio/" target="_blank" rel="noopener noreferrer">Mikel Aramendia</a> ·
      <a href="/archive/">Archive</a> ·
      <a href="https://github.com/Mendiak/new-contemporary-photography" target="_blank" rel="noopener noreferrer">GitHub</a> ·
      <a href="https://www.buymeacoffee.com/Mendiak" target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
    </p>
  </footer>
  <script src="/static.js" defer></script>
</body>
</html>
`;
}

function renderPhotoPage(photo) {
  const sizes = photoSizes(photo);
  const best = sizes[0];
  const title = photo.title || 'Untitled';
  const author = photo.ownername || 'Unknown photographer';
  const links = flickrUrls(photo);
  const canonical = `${BASE_URL}/photo/${photo.id}/`;
  const description = `Photograph "${title}" by ${author}, shared in the New Contemporary Photography Flickr group.`;
  const srcset = srcsetFor(sizes);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Photograph',
    name: title,
    description,
    contentUrl: best.url,
    thumbnailUrl: best.url,
    url: canonical,
    creator: {
      '@type': 'Person',
      name: author,
      url: links.profile,
    },
    creditText: `${author} / New Contemporary Photography`,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'New Contemporary Photography',
      url: `${BASE_URL}/archive/`,
    },
  }, null, 2).replace(/</g, '\\u003c');

  const dimensions = best.width && best.height
    ? ` width="${best.width}" height="${best.height}"`
    : '';

  return `${pageHead({
    title: `${title} by ${author} — New Contemporary Photography`,
    description,
    canonical,
    image: best.url,
    jsonLd,
    ogType: 'article',
  })}
  <main class="static-main">
    <article class="photo-page">
      <figure class="photo-page-figure">
        <img
          src="${escapeHtml(best.url)}"
          ${srcset ? `srcset="${escapeHtml(srcset)}"` : ''}
          sizes="(max-width: 860px) 100vw, 900px"
          alt="Photograph titled &quot;${escapeHtml(title)}&quot; by ${escapeHtml(author)}"
          ${dimensions}
          fetchpriority="high"
        >
      </figure>

      <div class="photo-page-info">
        <p class="static-eyebrow">Photograph</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="photo-byline">
          by <a href="${escapeHtml(links.profile)}" target="_blank" rel="noopener noreferrer">${escapeHtml(author)}</a>
        </p>

        <dl class="photo-facts">
          <div>
            <dt>Collection</dt>
            <dd><a href="/archive/">New Contemporary Photography</a></dd>
          </div>
          <div>
            <dt>Original</dt>
            <dd><a href="${escapeHtml(links.photo)}" target="_blank" rel="noopener noreferrer">View on Flickr</a></dd>
          </div>
        </dl>

        <div class="static-actions">
          <a class="link-button primary" href="/?photo=${encodeURIComponent(photo.id)}">Open in viewer</a>
          <a class="link-button" href="/archive/">Browse archive</a>
        </div>
      </div>
    </article>
  </main>
${pageFooter()}`;
}

function renderArchivePage(photos) {
  const canonical = `${BASE_URL}/archive/`;
  const description = 'Selected photographs from the New Contemporary Photography Flickr group. Browse the archive and open any image in the viewer.';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Archive — New Contemporary Photography',
    description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: 'New Contemporary Photography',
      url: `${BASE_URL}/`,
    },
  }, null, 2).replace(/</g, '\\u003c');

  const cards = photos.map(photo => {
    const sizes = photoSizes(photo);
    const preview = sizes.find(size => size.width && size.width <= 1024) || sizes[sizes.length - 1] || sizes[0];
    const title = photo.title || 'Untitled';
    const author = photo.ownername || 'Unknown photographer';
    const dimensions = preview.width && preview.height
      ? ` width="${preview.width}" height="${preview.height}"`
      : '';

    return `        <li class="archive-card">
          <a href="/photo/${encodeURIComponent(photo.id)}/">
            <img src="${escapeHtml(preview.url)}" alt="Photograph titled &quot;${escapeHtml(title)}&quot; by ${escapeHtml(author)}"${dimensions} loading="lazy" decoding="async">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(author)}</p>
          </a>
        </li>`;
  }).join('\n');

  return `${pageHead({
    title: 'Archive — New Contemporary Photography',
    description,
    canonical,
    image: `${BASE_URL}/assets/screenshot.jpg`,
    jsonLd,
  })}
  <main class="static-main">
    <header class="archive-header">
      <p class="static-eyebrow">Archive</p>
      <h1>New Contemporary Photography</h1>
      <p class="archive-intro">Selected photographs from the group pool. Each image links to its own page, to the photographer and to the original Flickr photograph.</p>
      <a class="link-button primary" href="/">Open the viewer</a>
    </header>

    <ul class="archive-grid">
${cards}
    </ul>
  </main>
${pageFooter()}`;
}

function renderSitemap(photos) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    `  <url>
    <loc>${BASE_URL}/archive/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  ];

  for (const photo of photos) {
    const sizes = photoSizes(photo);
    const best = sizes[0];
    const modified = dateFor(photo) || today;

    entries.push(`  <url>
    <loc>${BASE_URL}/photo/${photo.id}/</loc>
    <lastmod>${modified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${escapeXml(best.url)}</image:loc>
    </image:image>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`;
}

async function fetchPhotos() {
  const apiKey = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
  const groupId = process.env.NEXT_PUBLIC_FLICKR_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error('Flickr credentials are missing.');
  }

  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    method: 'flickr.groups.pools.getPhotos',
    api_key: apiKey,
    group_id: groupId,
    format: 'json',
    nojsoncallback: '1',
    per_page: String(PHOTO_COUNT),
    page: '1',
    extras: PHOTO_EXTRAS,
  }).toString();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Flickr request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.stat !== 'ok') {
    throw new Error(data.message || 'Flickr API error');
  }

  return (data.photos.photo || [])
    .filter(photo => photo.id && photoSizes(photo).length > 0);
}

function writePages(photos) {
  const photoRoot = path.join(PUBLIC_DIR, 'photo');
  const archiveDir = path.join(PUBLIC_DIR, 'archive');

  fs.rmSync(photoRoot, { recursive: true, force: true });
  fs.rmSync(archiveDir, { recursive: true, force: true });
  fs.mkdirSync(archiveDir, { recursive: true });

  for (const photo of photos) {
    const dir = path.join(photoRoot, photo.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPhotoPage(photo));
  }

  fs.writeFileSync(path.join(archiveDir, 'index.html'), renderArchivePage(photos));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemap(photos));

  console.log(`✅ Generated ${photos.length} photo pages, /archive/ and sitemap.xml`);
}

async function main() {
  try {
    const photos = await fetchPhotos();

    if (!photos.length) {
      throw new Error('Flickr returned no photos with available images.');
    }

    writePages(photos);
  } catch (error) {
    console.warn('⚠️  Skipping static page generation:', error.message);
    // Never block a deployment because of a transient Flickr/API failure.
  }
}

main();
