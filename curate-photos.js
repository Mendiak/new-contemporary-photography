const fs = require('node:fs');
const path = require('node:path');
const { PHOTO_EXTRAS, normalizePhoto, photoSizes } = require('./photo-data');

const API_URL = 'https://api.flickr.com/services/rest/';
const MANIFEST_PATH = path.join(__dirname, 'photo-manifest.json');
const CURATE_COUNT = Math.min(Math.max(Number(process.env.CURATE_COUNT) || 200, 1), 500);
const MAX_PHOTOS = Math.min(Math.max(Number(process.env.MAX_MANIFEST_PHOTOS) || 240, 1), 1000);

function readManifest() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    return Array.isArray(parsed.photos) ? parsed.photos : [];
  } catch (error) {
    return [];
  }
}

async function fetchLatestPhotos() {
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
    per_page: String(CURATE_COUNT),
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

async function main() {
  const existing = readManifest();
  const latest = await fetchLatestPhotos();

  if (!latest.length) {
    throw new Error('Flickr returned no photos with available images.');
  }

  const fetchedIds = new Set(latest.map(photo => photo.id));
  const merged = [
    ...latest,
    ...existing.filter(photo => !fetchedIds.has(photo.id)),
  ].slice(0, MAX_PHOTOS);

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    photos: merged,
  }, null, 2)}\n`);

  console.log(`✅ photo-manifest.json now contains ${merged.length} photos (${latest.length} fetched).`);
}

main().catch(error => {
  console.error('🔴 Could not update the photo manifest:', error.message);
  process.exitCode = 1;
});
