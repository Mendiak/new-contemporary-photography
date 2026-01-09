const flickrApiKey = window.ENV?.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = window.ENV?.NEXT_PUBLIC_FLICKR_GROUP_ID;
const loadButton = document.getElementById('load-photo');
const autoplayButton = document.getElementById('toggle-autoplay');
const fullscreenButton = document.getElementById('toggle-fullscreen');
const progressBar = document.getElementById('progress-bar');

let idlePromptTimer = null;   
let nextPhotoPromise = null;  
let autoplayInterval = null;
let isAutoplayActive = false;
const AUTOPLAY_DELAY = 10000; // 10 seconds

// Reusable Axios instance
const flickrApi = axios.create({
  baseURL: 'https://api.flickr.com/services/rest/',
  params: {
    method: 'flickr.groups.pools.getPhotos',
    api_key: flickrApiKey,
    group_id: flickrGroupId,
    format: 'json',
    nojsoncallback: 1,
  }
});

function updateProgressBar(percentage) {
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}

async function fetchAndPreloadPhoto() {
  console.log("🤫 Preloading next photo...");
  updateProgressBar(20);
  
  try {
    const responsePages = await flickrApi.get('', { params: { per_page: 1 } });
    if (responsePages.data.stat !== 'ok') throw new Error(responsePages.data.message);
    
    updateProgressBar(40);
    const totalPages = Math.min(responsePages.data.photos.pages, 4000); // Flickr limit-ish
    const randomPage = Math.floor(Math.random() * totalPages) + 1;

    const responsePhoto = await flickrApi.get('', { params: { per_page: 1, page: randomPage, extras: 'owner_name' } });
    if (responsePhoto.data.stat !== 'ok' || responsePhoto.data.photos.photo.length === 0) throw new Error("No photo found");

    updateProgressBar(60);
    const photo = responsePhoto.data.photos.photo[0];
    const photoUrl = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;

    const imgElement = document.createElement('img');
    imgElement.src = photoUrl;
    imgElement.alt = photo.title;
    imgElement.classList.add("hidden");

    return new Promise((resolve, reject) => {
      imgElement.onload = () => {
        updateProgressBar(100);
        setTimeout(() => updateProgressBar(0), 400); // Reset after a short delay
        resolve({ photo, imgElement, photoUrl });
      };
      imgElement.onerror = reject;
    });
  } catch (error) {
    updateProgressBar(0);
    throw error;
  }
}

async function displayNextPhoto() {
  if (idlePromptTimer) clearTimeout(idlePromptTimer);
  stopAutoplayTimer(); // Pause autoplay timer while loading

  loadButton.classList.add('loading');
  loadButton.disabled = true;

  try {
    const { photo, imgElement, photoUrl } = await nextPhotoPromise;
    
    // Start preloading the NEXT one immediately
    nextPhotoPromise = fetchAndPreloadPhoto().catch(e => console.warn("Next preload failed", e));

    const photoContainer = document.getElementById('photo-info');
    const currentImg = photoContainer.querySelector('img');

    if (currentImg) {
      currentImg.classList.add("fade-out");
      currentImg.classList.remove("fade-in");
      await new Promise(r => setTimeout(r, 500)); // Wait for CSS transition
      currentImg.remove();
    }
    
    showNewPhoto(imgElement, photo, photoUrl);

    loadButton.classList.remove('loading');
    loadButton.disabled = false;

    if (isAutoplayActive) startAutoplayTimer();

    idlePromptTimer = setTimeout(() => {
      loadButton.classList.add('prompt-attention');
    }, 30000);
  } catch (error) {
    console.error("Display failed, retrying...", error);
    nextPhotoPromise = fetchAndPreloadPhoto();
    setTimeout(displayNextPhoto, 1000);
  }
}

function showNewPhoto(imgElement, photo, photoUrl) {
  revealContent();
  const flickrPhotoUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;
  const safeTitle = (photo.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  const photoContainer = document.getElementById('photo-info');
  photoContainer.innerHTML = `
    <p>
      <span><strong>${photo.title || 'Untitled'}</strong> by <a href="${flickrPhotoUrl}" target="_blank">${photo.ownername}</a></span>
      <span class="separator">/</span>
      <a href="${photoUrl}" download="photography_${safeTitle}.jpg"><i class="bi bi-download"></i> Save</a>
      <span class="separator">/</span>
      <a href="#" id="copy-link-button" class="copy-link-button">Copy Link</a>
    </p>
  `;

  photoContainer.appendChild(imgElement);

  document.getElementById('copy-link-button').addEventListener('click', (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(flickrPhotoUrl).then(() => {
      const btn = e.target;
      const old = btn.innerText;
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = old, 2000);
    });
  });

  requestAnimationFrame(() => {
    imgElement.classList.remove("hidden");
    imgElement.classList.add("fade-in");
  });
}

function revealContent() {
  const skeleton = document.querySelector('.skeleton-loader');
  if (skeleton) skeleton.style.display = 'none';
  document.querySelectorAll('.content').forEach(el => el.style.display = 'block');
}

function startAutoplayTimer() {
  stopAutoplayTimer();
  autoplayInterval = setInterval(displayNextPhoto, AUTOPLAY_DELAY);
}

function stopAutoplayTimer() {
  if (autoplayInterval) clearInterval(autoplayInterval);
}

// Event Listeners
autoplayButton.addEventListener('click', () => {
  isAutoplayActive = !isAutoplayActive;
  autoplayButton.classList.toggle('active');
  const icon = autoplayButton.querySelector('i');
  
  if (isAutoplayActive) {
    icon.className = 'bi bi-pause-fill';
    startAutoplayTimer();
  } else {
    icon.className = 'bi bi-play-fill';
    stopAutoplayTimer();
  }
});

fullscreenButton.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener('fullscreenchange', () => {
  const icon = fullscreenButton.querySelector('i');
  icon.className = document.fullscreenElement ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen';
});

document.getElementById('site-title').addEventListener('click', () => {
  navigator.clipboard.writeText('https://new-contemporary-photography.vercel.app/').then(() => {
    const title = document.getElementById('site-title');
    const originalText = title.innerText;
    title.innerText = 'Link Copied!';
    title.style.color = 'var(--accent-color)';
    setTimeout(() => {
      title.innerText = originalText;
      title.style.color = '';
    }, 1500);
  });
});

loadButton.addEventListener('click', displayNextPhoto);

document.getElementById('toggle-dark-mode').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const icon = document.querySelector('#toggle-dark-mode i');
  icon.classList.toggle('bi-moon');
  icon.classList.toggle('bi-sun');
});

document.addEventListener('keydown', (e) => {
  if (loadButton.disabled) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    displayNextPhoto();
  }
});

// Initialization
if (!flickrApiKey || !flickrGroupId) {
  document.getElementById('info').innerHTML = `<h1>Config Missing</h1><p>Check your environment variables.</p>`;
} else {
  nextPhotoPromise = fetchAndPreloadPhoto();
  displayNextPhoto();
}
