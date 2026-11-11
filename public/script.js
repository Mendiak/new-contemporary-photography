'use strict';

const CONFIG = window.ENV || {};
const flickrApiKey = CONFIG.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = CONFIG.NEXT_PUBLIC_FLICKR_GROUP_ID;

const FLICKR_API_URL = 'https://api.flickr.com/services/rest/';
const AUTOPLAY_DELAY = 10000;
const THEME_STORAGE_KEY = 'ncp-theme';
const SITE_URL = 'https://new-contemporary-photography.vercel.app/';
const PHOTO_EXTRAS = 'owner_name,url_k,url_h,url_b,url_c,url_z,url_w,url_n,url_m';
const PHOTO_URL_FIELDS = ['url_k', 'url_h', 'url_b', 'url_c', 'url_z', 'url_w', 'url_n', 'url_m'];
const PHOTO_PAGE_SIZE = 10;
const MAX_PHOTO_ATTEMPTS = 5;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const dom = {
  viewer: document.getElementById('viewer'),
  loadButton: document.getElementById('load-photo'),
  autoplayButton: document.getElementById('toggle-autoplay'),
  autoplayLabel: document.getElementById('autoplay-label'),
  fullscreenButton: document.getElementById('toggle-fullscreen'),
  darkModeButton: document.getElementById('toggle-dark-mode'),
  photoStage: document.getElementById('photo-stage'),
  photoInfo: document.getElementById('photo-info'),
  errorBox: document.getElementById('viewer-error'),
  titleButton: document.querySelector('.title-button'),
  stageSkeleton: document.querySelector('.stage-skeleton'),
};

let nextPhotoPromise = null;
let autoplayTimer = null;
let isAutoplayActive = false;
let isDisplaying = false;

/* Helpers */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

function flickrText(value) {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : (value._content || '');
}

function trackEvent(name, params = {}) {
  if (typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', name, params);
}

/* Flickr API */

async function flickrRequest({ method = 'flickr.groups.pools.getPhotos', ...params } = {}) {
  const url = new URL(FLICKR_API_URL);
  url.search = new URLSearchParams({
    method,
    api_key: flickrApiKey,
    format: 'json',
    nojsoncallback: '1',
    ...params,
  }).toString();

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Flickr request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.stat !== 'ok') {
    throw new Error(data.message || 'Flickr API error');
  }

  return data;
}

async function flickrGet(params = {}) {
  const data = await flickrRequest({
    method: 'flickr.groups.pools.getPhotos',
    group_id: flickrGroupId,
    ...params,
  });

  return data.photos;
}

function buildImageUrl(photo, size) {
  return `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
}

function preloadImage(url, alt) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.alt = alt;
    img.decoding = 'async';
    img.src = url;

    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
      return;
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
  });
}

function getPhotoUrl(photo) {
  for (const field of PHOTO_URL_FIELDS) {
    if (photo[field]) {
      return photo[field];
    }
  }

  // Last resort: build a URL for a size that is almost always available.
  return buildImageUrl(photo, 'z');
}

async function loadPhotoImage(photo) {
  const alt = photo.title
    ? `Photograph titled "${photo.title}"`
    : 'Photograph from the New Contemporary Photography group';

  const photoUrl = getPhotoUrl(photo);
  const img = await preloadImage(photoUrl, alt);

  return { img, photoUrl };
}

async function fetchAndPreloadPhoto() {
  // Use the same page size for the page count and the photo request,
  // otherwise the random page falls outside Flickr's valid range.
  const gallery = await flickrGet({ per_page: String(PHOTO_PAGE_SIZE) });
  const totalPages = Math.max(1, Math.min(Number(gallery.pages) || 1, 4000));

  let lastError = null;

  // Photographs in a public pool can be deleted or restricted at any time,
  // so try a few different ones before giving up.
  for (let attempt = 0; attempt < MAX_PHOTO_ATTEMPTS; attempt += 1) {
    const randomPage = Math.floor(Math.random() * totalPages) + 1;

    try {
      const page = await flickrGet({
        per_page: String(PHOTO_PAGE_SIZE),
        page: String(randomPage),
        extras: PHOTO_EXTRAS,
      });

      const candidates = page.photo || [];
      if (!candidates.length) {
        throw new Error('No photos were returned for this page');
      }

      const photo = candidates[Math.floor(Math.random() * candidates.length)];

      const { img, photoUrl } = await loadPhotoImage(photo);

      return { photo, img, photoUrl, via: 'random' };
    } catch (error) {
      lastError = error;
      console.warn(`Photo attempt ${attempt + 1} failed:`, error);
    }
  }

  throw lastError || new Error('No photo could be loaded');
}

function queueNextPhoto() {
  nextPhotoPromise = fetchAndPreloadPhoto().catch(error => {
    console.warn('Next photo preload failed:', error);
    return null;
  });
}

function getPermalinkPhotoId() {
  try {
    const id = new URL(window.location.href).searchParams.get('photo');
    return /^\d+$/.test(id || '') ? id : null;
  } catch (error) {
    return null;
  }
}

function buildPhotoPageUrl(photoId) {
  return `${SITE_URL}photo/${encodeURIComponent(photoId)}/`;
}

function buildPhotoPermalink(photoId) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('photo', photoId);
  return url.toString();
}

function updatePhotoPermalink(photoId) {
  try {
    window.history.replaceState({ photoId }, '', buildPhotoPermalink(photoId));
  } catch (error) {
    // History API can be unavailable in embedded or local file contexts.
  }
}

async function fetchPhotoById(photoId) {
  const info = await flickrRequest({
    method: 'flickr.photos.getInfo',
    photo_id: photoId,
  });

  const sizesData = await flickrRequest({
    method: 'flickr.photos.getSizes',
    photo_id: photoId,
  });

  const sizes = (sizesData.sizes && sizesData.sizes.size) || [];
  if (!sizes.length) {
    throw new Error('No sizes available for this photo');
  }

  // Pick the largest version up to 2048px wide.
  const sortedSizes = [...sizes].sort((a, b) => Number(b.width) - Number(a.width));
  const size = sortedSizes.find(item => Number(item.width) <= 2048) || sortedSizes[sortedSizes.length - 1];

  const photo = {
    id: info.photo.id,
    owner: info.photo.owner && (info.photo.owner.nsid || info.photo.owner.id),
    ownername: info.photo.owner && (info.photo.owner.username || info.photo.owner.realname),
    title: flickrText(info.photo.title),
  };

  const alt = photo.title
    ? `Photograph titled "${photo.title}"`
    : 'Photograph from the New Contemporary Photography group';

  const img = await preloadImage(size.source, alt);

  return { photo, img, photoUrl: size.source, via: 'permalink' };
}

async function loadInitialPhoto() {
  const photoId = getPermalinkPhotoId();

  if (!photoId) {
    return fetchAndPreloadPhoto();
  }

  try {
    return await fetchPhotoById(photoId);
  } catch (error) {
    console.warn('Could not load the permalink photo, falling back to a random one:', error);
    return fetchAndPreloadPhoto();
  }
}

/* Rendering */

async function swapImage(img) {
  const current = dom.photoStage.querySelector('img');

  if (current) {
    current.classList.remove('fade-in');
    current.classList.add('fade-out');
    await wait(reducedMotion.matches ? 0 : 220);
    current.remove();
  }

  img.classList.add('hidden');
  dom.photoStage.appendChild(img);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      img.classList.remove('hidden');
      img.classList.add('fade-in');
    });
  });
}

function renderPhotoInfo(photo, photoUrl, sitePhotoUrl) {
  const title = photo.title || 'Untitled';
  const owner = photo.ownername || 'Unknown photographer';
  const ownerId = photo.owner || '';
  const flickrPhotoUrl = `https://www.flickr.com/photos/${encodeURIComponent(ownerId)}/${encodeURIComponent(photo.id)}`;
  const safeFileName = (title
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'photo').slice(0, 80);

  dom.photoInfo.innerHTML = `
    <dl class="photo-meta">
      <div class="meta-row">
        <dt class="meta-label">Title</dt>
        <dd class="meta-value">${escapeHtml(title)}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Photographer</dt>
        <dd class="meta-value">
          <a href="${flickrPhotoUrl}" target="_blank" rel="noopener noreferrer" data-flickr-link>${escapeHtml(owner)}</a>
        </dd>
      </div>
    </dl>
    <div class="meta-actions">
      <a class="meta-action" data-save-image href="${photoUrl}" download="ncp_${safeFileName}.jpg">Save</a>
      <button class="meta-action" type="button" data-copy-link><span>Copy link</span></button>
      <a class="meta-action" data-flickr-link href="${flickrPhotoUrl}" target="_blank" rel="noopener noreferrer">Flickr</a>
    </div>
  `;

  const copyButton = dom.photoInfo.querySelector('[data-copy-link]');
  if (copyButton) {
    copyButton.addEventListener('click', () => copyPhotoLink(copyButton, sitePhotoUrl, photo.id));
  }

  const saveLink = dom.photoInfo.querySelector('[data-save-image]');
  if (saveLink) {
    saveLink.addEventListener('click', () => {
      trackEvent('save_image', { photo_id: photo.id });
    });
  }

  dom.photoInfo.querySelectorAll('[data-flickr-link]').forEach(link => {
    link.addEventListener('click', () => {
      trackEvent('outbound_flickr', { photo_id: photo.id });
    });
  });

  document.title = `${title} — New Contemporary Photography`;
}

async function showPhoto({ photo, img, photoUrl, via = 'random' }) {
  revealContent();
  await swapImage(img);

  const sitePhotoUrl = buildPhotoPageUrl(photo.id);
  updatePhotoPermalink(photo.id);
  renderPhotoInfo(photo, photoUrl, sitePhotoUrl);

  trackEvent('photo_view', {
    photo_id: photo.id,
    photographer: photo.ownername || 'Unknown',
    via,
  });
}

function revealContent() {
  dom.viewer.classList.add('is-ready');
}

/* Copy to clipboard */

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed, trying fallback:', error);
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    console.warn('Clipboard fallback failed:', error);
  }

  textarea.remove();
  return copied;
}

async function copyPhotoLink(button, url, photoId) {
  const label = button.querySelector('span');
  const originalLabel = label.textContent;
  const copied = await copyText(url);

  trackEvent('copy_link', {
    target: 'site_photo_page',
    photo_id: photoId,
    success: copied,
  });

  label.textContent = copied ? 'Copied!' : 'Copy failed';
  button.classList.toggle('is-success', copied);

  setTimeout(() => {
    label.textContent = originalLabel;
    button.classList.remove('is-success');
  }, 1800);
}

async function copySiteLink() {
  const originalLabel = dom.titleButton.textContent;
  const copied = await copyText(SITE_URL);

  trackEvent('copy_site_link', { success: copied });

  dom.titleButton.textContent = copied ? 'Link copied!' : 'Copy failed';
  dom.titleButton.classList.toggle('is-success', copied);

  setTimeout(() => {
    dom.titleButton.textContent = originalLabel;
    dom.titleButton.classList.remove('is-success');
  }, 1500);
}

/* Errors */

function hideError() {
  dom.errorBox.hidden = true;
  dom.errorBox.innerHTML = '';
}

function showError(message, { retry = true } = {}) {
  dom.errorBox.innerHTML = `
    <p>${escapeHtml(message)}</p>
    ${retry ? '<button type="button" data-retry>Try again</button>' : ''}
  `;
  dom.errorBox.hidden = false;

  const retryButton = dom.errorBox.querySelector('[data-retry]');
  if (retryButton) {
    retryButton.addEventListener('click', () => {
      hideError();
      trackEvent('photo_retry');
      displayNextPhoto();
    });
  }
}

/* Display flow */

async function displayNextPhoto() {
  if (isDisplaying) {
    return;
  }

  if (!nextPhotoPromise) {
    queueNextPhoto();
  }

  isDisplaying = true;
  pauseAutoplayTimer();
  dom.loadButton.disabled = true;
  dom.loadButton.classList.add('loading');
  hideError();

  try {
    const result = await nextPhotoPromise;
    queueNextPhoto();

    if (!result) {
      throw new Error('The next photo could not be loaded');
    }

    await showPhoto(result);
  } catch (error) {
    console.error('Display failed:', error);
    queueNextPhoto();
    showError('We could not load a photo right now. Check your connection and try again.');
  } finally {
    isDisplaying = false;
    dom.loadButton.disabled = false;
    dom.loadButton.classList.remove('loading');
    scheduleAutoplay();
  }
}

/* Autoplay */

function pauseAutoplayTimer() {
  if (autoplayTimer) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
}

function scheduleAutoplay() {
  pauseAutoplayTimer();

  if (!isAutoplayActive || document.hidden) {
    return;
  }

  autoplayTimer = setTimeout(displayNextPhoto, AUTOPLAY_DELAY);
}

function setAutoplay(active) {
  isAutoplayActive = active;
  dom.autoplayButton.classList.toggle('active', active);
  dom.autoplayButton.setAttribute('aria-pressed', String(active));

  trackEvent('autoplay_toggle', { active });

  if (dom.autoplayLabel) {
    dom.autoplayLabel.textContent = active ? 'Pause' : 'Auto-play';
  }

  if (active) {
    scheduleAutoplay();
  } else {
    pauseAutoplayTimer();
  }
}

/* Theme */

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Storage may be unavailable (private mode, embedded contexts).
  }
}

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function systemTheme() {
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';

  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  dom.darkModeButton.textContent = isDark ? 'Light' : 'Dark';
  dom.darkModeButton.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  dom.darkModeButton.setAttribute(
    'aria-label',
    isDark ? 'Switch to light theme' : 'Switch to dark theme'
  );
  dom.darkModeButton.setAttribute('aria-pressed', String(isDark));
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(nextTheme);
  storeTheme(nextTheme);
  trackEvent('theme_change', { theme: nextTheme });
}

/* Fullscreen */

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }

    trackEvent('fullscreen_toggle', { active: Boolean(document.fullscreenElement) });
  } catch (error) {
    console.error('Fullscreen is not available:', error);
  }
}

function syncFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);

  dom.fullscreenButton.textContent = isFullscreen ? 'Exit' : 'Fullscreen';
  dom.fullscreenButton.setAttribute(
    'aria-label',
    isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
  );
}

/* Events */

function bindEvents() {
  dom.loadButton.addEventListener('click', () => {
    trackEvent('next_photo', { trigger: 'button' });
    displayNextPhoto();
  });

  dom.autoplayButton.addEventListener('click', () => {
    setAutoplay(!isAutoplayActive);
  });

  dom.fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenButton);

  dom.darkModeButton.addEventListener('click', toggleTheme);

  systemThemeQuery.addEventListener('change', () => {
    if (!getStoredTheme()) {
      applyTheme(systemTheme());
    }
  });

  dom.titleButton.addEventListener('click', copySiteLink);

  document.addEventListener('visibilitychange', () => {
    if (!isAutoplayActive) {
      return;
    }

    if (document.hidden) {
      pauseAutoplayTimer();
    } else {
      scheduleAutoplay();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.target.closest('button, a, input, textarea, select, [contenteditable]')) {
      return;
    }

    event.preventDefault();
    trackEvent('next_photo', { trigger: 'keyboard' });
    displayNextPhoto();
  });
}

/* Initialization */

function init() {
  applyTheme(getStoredTheme() || systemTheme());
  syncFullscreenButton();
  bindEvents();

  if (!flickrApiKey || !flickrGroupId) {
    dom.loadButton.disabled = true;
    dom.autoplayButton.disabled = true;

    if (dom.stageSkeleton) {
      dom.stageSkeleton.remove();
    }

    showError(
      'Flickr configuration is missing. Add your API key and group ID to public/config.js and reload the page.',
      { retry: false }
    );
    return;
  }

  nextPhotoPromise = loadInitialPhoto().catch(error => {
    console.warn('Initial photo preload failed:', error);
    return null;
  });
  displayNextPhoto();
}

init();
