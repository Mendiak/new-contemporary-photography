const fs = require('node:fs');
const path = require('node:path');
const { PHOTO_EXTRAS, normalizePhoto, photoSizes } = require('./photo-data');

const BASE_URL = 'https://new-contemporary-photography.vercel.app';
const API_URL = 'https://api.flickr.com/services/rest/';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MANIFEST_PATH = path.join(__dirname, 'photo-manifest.json');
const ARCHIVE_PAGE_SIZE = 48;
const ABOUT_URL = `${BASE_URL}/about/`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function srcsetFor(sizes) {
  return [...sizes]
    .reverse()
    .filter(size => size.width)
    .map(size => `${size.url} ${size.width}w`)
    .join(', ');
}

function dateParts(photo) {
  const raw = (photo.datetaken || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const timestamp = Number(photo.dateadded);
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : null;
}

function displayAddedDate(photo) {
  const timestamp = Number(photo.dateadded);
  if (!timestamp) {
    return null;
  }

  const iso = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function latestPhotoDate(photos, fallback) {
  const dates = photos.map(dateParts).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : fallback;
}

function flickrUrls(photo) {
  return {
    photo: `https://www.flickr.com/photos/${encodeURIComponent(photo.owner)}/${encodeURIComponent(photo.id)}/`,
    profile: `https://www.flickr.com/photos/${encodeURIComponent(photo.owner)}/`,
  };
}

function photoPagePath(photo) {
  return `/photo/${encodeURIComponent(photo.id)}/`;
}

function archivePagePath(page) {
  return page === 1 ? '/archive/' : `/archive/${page}/`;
}

function pageHead({
  title,
  description,
  canonical,
  image,
  structuredData,
  ogType = 'website',
  imageWidth,
  imageHeight,
}) {
  const jsonLd = JSON.stringify(structuredData, null, 2).replace(/</g, '\\u003c');
  const imageDimensions = imageWidth && imageHeight
    ? `
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">`
    : '';

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
  <meta property="og:site_name" content="New Contemporary Photography">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="${escapeHtml(title)}">${imageDimensions}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="icon" type="image/x-icon" href="/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://live.staticflickr.com" crossorigin>
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
      <a href="/about/">About</a>
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
      <a href="/about/">About</a> ·
      <a href="https://github.com/Mendiak/new-contemporary-photography" target="_blank" rel="noopener noreferrer">GitHub</a> ·
      <a href="https://www.buymeacoffee.com/Mendiak" target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
    </p>
  </footer>
  <script src="/static.js" defer></script>
</body>
</html>
`;
}

function renderBreadcrumbs(items) {
  const list = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const content = item.href && !isLast
      ? `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
      : escapeHtml(item.label);
    return `<li${isLast ? ' aria-current="page"' : ''}>${content}</li>`;
  }).join('');

  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${list}</ol></nav>`;
}

function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  };
}

function photoSchema(photo, canonical, best) {
  const links = flickrUrls(photo);
  const published = dateParts(photo);

  return {
    '@type': 'Photograph',
    '@id': canonical,
    name: photo.title,
    description: photo.description || `Photograph "${photo.title}" by ${photo.ownername}, shared in the New Contemporary Photography Flickr group.`,
    contentUrl: best.url,
    thumbnailUrl: best.url,
    url: canonical,
    ...(published ? { datePublished: published } : {}),
    ...(best.width && best.height ? { width: best.width, height: best.height } : {}),
    creator: {
      '@type': 'Person',
      name: photo.ownername,
      url: links.profile,
    },
    creditText: `${photo.ownername} / New Contemporary Photography`,
    isPartOf: {
      '@type': 'CollectionPage',
      name: 'New Contemporary Photography',
      url: `${BASE_URL}/archive/`,
    },
  };
}

function renderPhotoPage(photo, previous, next) {
  const sizes = photoSizes(photo);
  const best = sizes[0];
  const links = flickrUrls(photo);
  const canonical = `${BASE_URL}${photoPagePath(photo)}`;
  const description = `Photograph "${photo.title}" by ${photo.ownername}, shared in the New Contemporary Photography Flickr group.`;
  const display = displayAddedDate(photo);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Archive', href: '/archive/' },
    { label: photo.title, href: photoPagePath(photo) },
  ];

  const descriptionBlock = photo.description
    ? `<p class="photo-description">${escapeHtml(photo.description)}</p>`
    : '';

  const tagsBlock = photo.tags && photo.tags.length
    ? `<ul class="photo-tags" aria-label="Tags">${photo.tags.map(tag => `<li>#${escapeHtml(tag)}</li>`).join('')}</ul>`
    : '';

  const pagination = `<nav class="photo-pagination" aria-label="Photo navigation">
    ${previous ? `<a href="${photoPagePath(previous)}" rel="prev">&larr; Previous</a>` : '<span></span>'}
    ${next ? `<a href="${photoPagePath(next)}" rel="next">Next &rarr;</a>` : ''}
  </nav>`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      photoSchema(photo, canonical, best),
      breadcrumbSchema(breadcrumbs),
    ],
  };

  const srcset = srcsetFor(sizes);

  return `${pageHead({
    title: `${photo.title} by ${photo.ownername} — New Contemporary Photography`,
    description,
    canonical,
    image: best.url,
    imageWidth: best.width,
    imageHeight: best.height,
    structuredData,
    ogType: 'article',
  })}
  <main class="static-main">
    ${renderBreadcrumbs(breadcrumbs)}
    <article class="photo-page">
      <figure class="photo-page-figure">
        <img
          src="${escapeHtml(best.url)}"
          ${srcset ? `srcset="${escapeHtml(srcset)}"` : ''}
          sizes="(max-width: 860px) 100vw, 900px"
          alt="Photograph titled &quot;${escapeHtml(photo.title)}&quot; by ${escapeHtml(photo.ownername)}"
          ${best.width && best.height ? `width="${best.width}" height="${best.height}"` : ''}
          fetchpriority="high"
        >
      </figure>

      <div class="photo-page-info">
        <p class="static-eyebrow">Photograph</p>
        <h1>${escapeHtml(photo.title)}</h1>
        <p class="photo-byline">
          by <a href="${escapeHtml(links.profile)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.ownername)}</a>
        </p>

        ${descriptionBlock}
        ${tagsBlock}

        <dl class="photo-facts">
          <div>
            <dt>Collection</dt>
            <dd><a href="/archive/">New Contemporary Photography</a></dd>
          </div>
          ${display ? `<div><dt>Added</dt><dd>${escapeHtml(display)}</dd></div>` : ''}
          <div>
            <dt>Original</dt>
            <dd><a href="${escapeHtml(links.photo)}" target="_blank" rel="noopener noreferrer">View on Flickr</a></dd>
          </div>
        </dl>

        <div class="static-actions">
          <a class="link-button primary" href="/?photo=${encodeURIComponent(photo.id)}">Open in viewer</a>
          <a class="link-button" href="/archive/">Browse archive</a>
        </div>

        ${pagination}
      </div>
    </article>
  </main>
${pageFooter()}`;
}

function renderArchiveCard(photo) {
  const sizes = photoSizes(photo);
  const previewSizes = sizes.filter(size => size.width && size.width <= 1024);
  const preview = previewSizes[0] || sizes[sizes.length - 1] || sizes[0];
  const srcset = srcsetFor(previewSizes);

  return `        <li class="archive-card">
          <a href="${photoPagePath(photo)}">
            <img
              src="${escapeHtml(preview.url)}"
              ${srcset ? `srcset="${escapeHtml(srcset)}"` : ''}
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
              alt="Photograph titled &quot;${escapeHtml(photo.title)}&quot; by ${escapeHtml(photo.ownername)}"
              ${preview.width && preview.height ? `width="${preview.width}" height="${preview.height}"` : ''}
              loading="lazy"
              decoding="async"
            >
            <h2>${escapeHtml(photo.title)}</h2>
            <p>${escapeHtml(photo.ownername)}</p>
          </a>
        </li>`;
}

function renderArchivePage({ photos, page, totalPages, latestDate }) {
  const canonical = `${BASE_URL}${archivePagePath(page)}`;
  const title = page === 1
    ? 'Archive — New Contemporary Photography'
    : `Archive — Page ${page} — New Contemporary Photography`;
  const description = page === 1
    ? 'Selected photographs from the New Contemporary Photography Flickr group. Browse the archive and open any image in the viewer.'
    : `Page ${page} of the New Contemporary Photography archive, featuring photographs from the Flickr group.`;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...(page > 1 ? [{ label: 'Archive', href: '/archive/' }] : []),
    { label: page === 1 ? 'Archive' : `Page ${page}`, href: archivePagePath(page) },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: title,
        description,
        url: canonical,
        isPartOf: {
          '@type': 'WebSite',
          name: 'New Contemporary Photography',
          url: `${BASE_URL}/`,
        },
      },
      breadcrumbSchema(breadcrumbs),
    ],
  };

  const pagination = `<nav class="archive-pagination" aria-label="Archive pages">
    ${page > 1 ? `<a href="${archivePagePath(page - 1)}" rel="prev">&larr; Previous</a>` : '<span></span>'}
    <span>Page ${page} of ${totalPages}</span>
    ${page < totalPages ? `<a href="${archivePagePath(page + 1)}" rel="next">Next &rarr;</a>` : ''}
  </nav>`;

  return `${pageHead({
    title,
    description,
    canonical,
    image: `${BASE_URL}/assets/screenshot.jpg`,
    structuredData,
  })}
  <main class="static-main">
    ${renderBreadcrumbs(breadcrumbs)}
    <header class="archive-header">
      <p class="static-eyebrow">Archive${page > 1 ? ` · Page ${page}` : ''}</p>
      <h1>${page === 1 ? 'New Contemporary Photography' : `Archive — Page ${page}`}</h1>
      <p class="archive-intro">${page === 1
        ? 'Selected photographs from the group pool. Each image links to its own page, to the photographer and to the original Flickr photograph.'
        : 'More photographs from the New Contemporary Photography archive.'}</p>
      <div class="static-actions">
        <a class="link-button primary" href="/">Open the viewer</a>
        <a class="link-button" href="/about/">About the group</a>
      </div>
    </header>

    <ul class="archive-grid">
${photos.map(renderArchiveCard).join('\n')}
    </ul>

    ${pagination}
  </main>
${pageFooter()}`;
}

function renderAboutPage(latestDate) {
  const canonical = ABOUT_URL;
  const title = 'About — New Contemporary Photography';
  const description = 'About New Contemporary Photography: a Flickr group and a quiet showcase of contemporary photography, curated by its admin Mikel Aramendia.';
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about/' },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        name: title,
        description,
        url: canonical,
        mainEntity: {
          '@type': 'Person',
          name: 'Mikel Aramendia',
          url: 'https://mendiak.github.io/portfolio/',
          sameAs: [
            'https://github.com/Mendiak',
            'https://mendiak.github.io/portfolio/',
          ],
          jobTitle: 'Group admin',
          affiliation: {
            '@type': 'Organization',
            name: 'New Contemporary Photography',
            url: 'https://www.flickr.com/groups/newcontemporaryphotography/',
          },
        },
      },
      breadcrumbSchema(breadcrumbs),
    ],
  };

  return `${pageHead({
    title,
    description,
    canonical,
    image: `${BASE_URL}/assets/screenshot.jpg`,
    structuredData,
  })}
  <main class="static-main">
    ${renderBreadcrumbs(breadcrumbs)}
    <article class="about-page">
      <p class="static-eyebrow">About</p>
      <h1>Contemporary photography, one frame at a time.</h1>
      <p class="about-lead">New Contemporary Photography is a Flickr group and a quiet showcase of the photographs shared there. The site is a personal tribute to the group and to everything its photographers have taught me over the years.</p>

      <div class="about-body">
        <p>The viewer draws from the group pool and presents one photograph on a white passe-partout, with its title, photographer and a link back to the original Flickr page. The archive collects a stable selection of recent work so that each photograph has a page of its own, can be shared, and can be found by search engines.</p>
        <p>The group is open to contemporary photography of all kinds. I help administer it, and this project is my way of giving something back: a calm, typography-led home for the work, without ads, carousels or visual noise.</p>
        <p>Every photograph belongs to its author. Credits, titles and links are kept with each image, and the original Flickr page is always one click away.</p>
      </div>

      <dl class="photo-facts">
        <div>
          <dt>Group</dt>
          <dd><a href="https://www.flickr.com/groups/newcontemporaryphotography/" target="_blank" rel="noopener noreferrer">New Contemporary Photography on Flickr</a></dd>
        </div>
        <div>
          <dt>Curated by</dt>
          <dd><a href="https://mendiak.github.io/portfolio/" target="_blank" rel="noopener noreferrer">Mikel Aramendia</a>, group admin</dd>
        </div>
        <div>
          <dt>Last archive update</dt>
          <dd>${escapeHtml(latestDate || 'Recently')}</dd>
        </div>
      </dl>

      <div class="static-actions">
        <a class="link-button primary" href="/archive/">Browse the archive</a>
        <a class="link-button" href="https://github.com/Mendiak/new-contemporary-photography" target="_blank" rel="noopener noreferrer">View source</a>
      </div>
    </article>
  </main>
${pageFooter()}`;
}

function renderSitemap({ photos, archivePages, latestDate, manifestDate }) {
  const entries = [
    `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${escapeXml(latestDate || manifestDate)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    `  <url>
    <loc>${BASE_URL}/archive/</loc>
    <lastmod>${escapeXml(latestDate || manifestDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    `  <url>
    <loc>${ABOUT_URL}</loc>
    <lastmod>${escapeXml(manifestDate)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`,
  ];

  for (let page = 2; page <= archivePages; page += 1) {
    entries.push(`  <url>
    <loc>${BASE_URL}${archivePagePath(page)}</loc>
    <lastmod>${escapeXml(latestDate || manifestDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  for (const photo of photos) {
    const sizes = photoSizes(photo);
    const best = sizes[0];
    const modified = dateParts(photo) || manifestDate;

    entries.push(`  <url>
    <loc>${BASE_URL}${photoPagePath(photo)}</loc>
    <lastmod>${escapeXml(modified)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${escapeXml(best.url)}</image:loc>
      <image:title>${escapeXml(photo.title)}</image:title>
      <image:caption>${escapeXml(`${photo.ownername} — New Contemporary Photography`)}</image:caption>
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

function readManifest() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    return {
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    return { photos: [], updatedAt: new Date().toISOString() };
  }
}

async function fetchFallbackPhotos() {
  const apiKey = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
  const groupId = process.env.NEXT_PUBLIC_FLICKR_GROUP_ID;

  if (!apiKey || !groupId) {
    throw new Error('Flickr credentials are missing and photo-manifest.json was not found.');
  }

  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    method: 'flickr.groups.pools.getPhotos',
    api_key: apiKey,
    group_id: groupId,
    format: 'json',
    nojsoncallback: '1',
    per_page: '60',
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
    .map(normalizePhoto)
    .filter(photo => photo.id && photoSizes(photo).length > 0);
}

function writePages(photos, manifestDate) {
  const photoRoot = path.join(PUBLIC_DIR, 'photo');
  const archiveDir = path.join(PUBLIC_DIR, 'archive');
  const aboutDir = path.join(PUBLIC_DIR, 'about');

  fs.rmSync(photoRoot, { recursive: true, force: true });
  fs.rmSync(archiveDir, { recursive: true, force: true });
  fs.rmSync(aboutDir, { recursive: true, force: true });

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const dir = path.join(photoRoot, photo.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      renderPhotoPage(photo, photos[index - 1], photos[index + 1])
    );
  }

  const totalArchivePages = Math.max(1, Math.ceil(photos.length / ARCHIVE_PAGE_SIZE));
  const latestDate = latestPhotoDate(photos, manifestDate);

  for (let page = 1; page <= totalArchivePages; page += 1) {
    const dir = page === 1 ? archiveDir : path.join(archiveDir, String(page));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderArchivePage({
      photos: photos.slice((page - 1) * ARCHIVE_PAGE_SIZE, page * ARCHIVE_PAGE_SIZE),
      page,
      totalPages: totalArchivePages,
      latestDate,
    }));
  }

  fs.mkdirSync(aboutDir, { recursive: true });
  fs.writeFileSync(path.join(aboutDir, 'index.html'), renderAboutPage(latestDate));

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemap({
    photos,
    archivePages: totalArchivePages,
    latestDate,
    manifestDate,
  }));

  console.log(`✅ Generated ${photos.length} photo pages, ${totalArchivePages} archive pages, /about/ and sitemap.xml`);
}

async function main() {
  try {
    const manifest = readManifest();
    const photos = manifest.photos.length
      ? manifest.photos
      : await fetchFallbackPhotos();

    if (!photos.length) {
      throw new Error('No photos with available images were found.');
    }

    writePages(photos, manifest.updatedAt.slice(0, 10));
  } catch (error) {
    console.warn('⚠️  Skipping static page generation:', error.message);
    // Never block a deployment because of a transient Flickr/API failure.
  }
}

main();
