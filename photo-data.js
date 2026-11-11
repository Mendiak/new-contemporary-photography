const SIZE_FIELDS = [
  { url: 'url_k', width: 'width_k', height: 'height_k' },
  { url: 'url_h', width: 'width_h', height: 'height_h' },
  { url: 'url_b', width: 'width_b', height: 'height_b' },
  { url: 'url_c', width: 'width_c', height: 'height_c' },
  { url: 'url_z', width: 'width_z', height: 'height_z' },
  { url: 'url_w', width: 'width_w', height: 'height_w' },
  { url: 'url_m', width: 'width_m', height: 'height_m' },
];

const PHOTO_EXTRAS = [
  'owner_name',
  'description',
  'tags',
  'datetaken',
  'dateadded',
  ...SIZE_FIELDS.flatMap(size => [size.url, size.width, size.height]),
].join(',');

const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/gi, entity => HTML_ENTITIES[entity.toLowerCase()] || entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizePhoto(photo) {
  const normalized = {
    id: String(photo.id),
    owner: photo.owner || '',
    ownername: photo.ownername || 'Unknown photographer',
    title: (photo.title || '').trim() || 'Untitled',
    description: stripHtml(photo.description && photo.description._content).slice(0, 1200),
    tags: String(photo.tags || '')
      .split(/\s+/)
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 12),
    dateadded: photo.dateadded || null,
    datetaken: photo.datetaken || null,
  };

  for (const size of SIZE_FIELDS) {
    if (photo[size.url]) {
      normalized[size.url] = photo[size.url];
      normalized[size.width] = Number(photo[size.width]) || null;
      normalized[size.height] = Number(photo[size.height]) || null;
    }
  }

  return normalized;
}

function photoSizes(photo) {
  return SIZE_FIELDS
    .filter(size => photo[size.url])
    .map(size => ({
      url: photo[size.url],
      width: Number(photo[size.width]) || null,
      height: Number(photo[size.height]) || null,
    }))
    .sort((a, b) => (b.width || 0) - (a.width || 0));
}

module.exports = {
  PHOTO_EXTRAS,
  normalizePhoto,
  photoSizes,
};
