const flickrApiKey = window.ENV?.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = window.ENV?.NEXT_PUBLIC_FLICKR_GROUP_ID;
const loadButton = document.getElementById('load-photo');

let idlePromptTimer = null;   // Timer to prompt user attention
let nextPhotoPromise = null;  // This will hold the promise for the next preloaded image
// Create a reusable Axios instance for the Flickr API to avoid repeating parameters.
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

// This function fetches the photo metadata and preloads the image file in the background.
// It returns a promise that resolves with the photo data and the loaded <img> element.
function fetchAndPreloadPhoto() {
  console.log("🤫 Preloading next photo in the background...");
  return new Promise(async (resolve, reject) => {
    try {
      // Step 1: Get total pages to pick a random one
      const responsePages = await flickrApi.get('', { params: { per_page: 1 } });
      if (responsePages.data.stat !== 'ok') {
        throw new Error(`Flickr API Error: ${responsePages.data.message}`);
      }
      const totalPages = responsePages.data.photos.pages;
      const randomPage = Math.floor(Math.random() * totalPages) + 1;

      // Step 2: Get photo data from the random page
      const responsePhoto = await flickrApi.get('', { params: { per_page: 1, page: randomPage, extras: 'owner_name' } });
      if (responsePhoto.data.stat !== 'ok' || responsePhoto.data.photos.photo.length === 0) {
        throw new Error("No photo found on page.");
      }

      const photo = responsePhoto.data.photos.photo[0];
      const photoUrl = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;

      // Step 3: Create an image element in memory to trigger the download
      const imgElement = document.createElement('img');
      imgElement.src = photoUrl;
      imgElement.alt = photo.title;
      imgElement.classList.add("hidden");

      imgElement.onload = () => {
        console.log(`✅ Preloaded: ${photo.title}`);
        resolve({ photo, imgElement, photoUrl }); // Resolve the promise with the data, the loaded element, and the URL
      };
      imgElement.onerror = () => {
        console.error(`❌ Failed to preload image: ${photoUrl}`);
        reject(new Error('Image preload failed.'));
      };
    } catch (error) {
      console.error("❌ Error during preloading API request:", error);
      reject(error); // Reject the promise if the API call fails
    }
  });
}

// Function to display the preloaded photo
async function displayNextPhoto() {
  // Clear any existing idle timer and remove the animation class
  if (idlePromptTimer) {
    clearTimeout(idlePromptTimer);
  }
  loadButton.classList.remove('prompt-attention');

  console.log("⏳ Waiting for preloaded photo...");

  // Disable button at the start of the request
  loadButton.classList.add('loading');
  loadButton.disabled = true;

  try {
    // Wait for the currently preloading image to be ready
    const { photo, imgElement, photoUrl } = await nextPhotoPromise;
    console.log(`📸 Displaying preloaded photo: ${photo.title}`);

    // As soon as we have the current photo, immediately start preloading the next one.
    nextPhotoPromise = fetchAndPreloadPhoto();
    // We also add a catch to the new promise to prevent unhandled rejection errors if the *next* preload fails.
    nextPhotoPromise.catch(err => {
        console.warn("A background preload failed, will retry on next click.", err.message);
    });

    const photoContainer = document.getElementById('photo-info');
    const currentImg = photoContainer.querySelector('img');

    if (currentImg) {
      currentImg.classList.remove("fade-in");
      currentImg.classList.add("fade-out");
      currentImg.addEventListener('transitionend', () => {
        currentImg.remove();
        showNewPhoto(imgElement, photo, photoUrl);
      }, { once: true });
    } else {
      showNewPhoto(imgElement, photo, photoUrl);
    }

    loadButton.classList.remove('loading');
    loadButton.disabled = false;

    idlePromptTimer = setTimeout(() => {
      loadButton.classList.add('prompt-attention');
    }, 15000);
  } catch (error) {
    console.error("❌ Failed to display photo. The preload might have failed. Retrying...", error);
    loadButton.classList.remove('loading');
    loadButton.disabled = false;
    // Attempt to start a new preload and then try displaying again after a delay
    nextPhotoPromise = fetchAndPreloadPhoto();
    setTimeout(displayNextPhoto, 2000);
  }
}

// Function to hide skeleton and show content
function revealContent() {
  const skeleton = document.querySelector('.skeleton-loader');
  if (skeleton) {
    skeleton.style.display = 'none';
  }
  document.querySelectorAll('.content').forEach(el => {
    el.style.display = 'block';
  });
}


// Helper function to display the new image with fade-in effect
function showNewPhoto(imgElement, photo, photoUrl) {
  console.log("📥 Displaying new image...");
  revealContent(); // Hide skeleton and show real content containers

  const flickrPhotoUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;
  const safeTitle = (photo.title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const downloadFilename = `new-contemporary_${safeTitle}_${photo.id}.jpg`;

  const photoContainer = document.getElementById('photo-info');
  // Clear previous content and add new info
  photoContainer.innerHTML = `
    <p><strong>Author:</strong> <a href="${flickrPhotoUrl}" target="_blank" rel="noopener noreferrer">${photo.ownername} <i class="bi bi-box-arrow-up-right"></i></a>
    <span class="separator">|</span>
    <a href="${photoUrl}" download="${downloadFilename}" class="download-link">Download <i class="bi bi-download"></i></a>
    <span class="separator">|</span>
    <a href="#" id="copy-link-button" class="copy-link-button" title="Copy link to this photo's page">Copy Link <i class="bi bi-clipboard"></i></a>
    </p>
  `;

  photoContainer.appendChild(imgElement);

  // Add event listener for the new copy button
  const copyButton = document.getElementById('copy-link-button');
  if (copyButton) {
    copyButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (copyButton.classList.contains('disabled')) return;

      navigator.clipboard.writeText(flickrPhotoUrl).then(() => {
        const originalContent = copyButton.innerHTML;
        copyButton.innerHTML = 'Copied! <i class="bi bi-check-lg"></i>';
        copyButton.classList.add('disabled', 'copied');

        setTimeout(() => {
          copyButton.innerHTML = originalContent;
          copyButton.classList.remove('disabled', 'copied');
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy link: ', err);
      });
    });
  }

  // Force a reflow to ensure the transition is applied correctly
  void imgElement.offsetWidth;

  // Apply the fade-in effect
  imgElement.classList.remove("hidden");
  imgElement.classList.add("fade-in");
}

function main() {
  // Check if API keys are present before making the first call
  if (!flickrApiKey || !flickrGroupId) {
    console.error("🔴 Flickr API Key or Group ID is missing. Check your config.js file.");
    // Optionally, display an error message to the user on the page
    document.getElementById('info').innerHTML = `
      <h1>Configuration Error</h1>
      <p>Flickr API Key or Group ID is missing. The application cannot be initialized.</p>
    `;
    document.querySelector('.skeleton-loader').style.display = 'none';
    loadButton.disabled = true;
    return;
  }
  // Kick off the very first preload
  console.log("🚀 Kicking off initial photo preload.");
  nextPhotoPromise = fetchAndPreloadPhoto();
  // Then display it
  displayNextPhoto();
}

// Load a random photo when the DOM is ready
// Using DOMContentLoaded is slightly more efficient than window.onload
document.addEventListener('DOMContentLoaded', main);

// Event listener for the button
loadButton.addEventListener('click', displayNextPhoto);

// Dark mode toggle functionality with icon swap
const toggleButton = document.getElementById('toggle-dark-mode');
toggleButton.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  // More efficient: just toggle the icon class
  const icon = toggleButton.querySelector('i');
  icon.classList.toggle('bi-moon');
  icon.classList.toggle('bi-sun');
});

// Keyboard navigation: Spacebar or Enter to load the next photo
document.addEventListener('keydown', (event) => {
  // Do nothing if a photo is already being loaded.
  if (loadButton.disabled) {
    return;
  }

  // Only trigger if the user is not typing in an input field (for future-proofing)
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault(); // Prevent scrolling or other default actions.
    loadButton.click();
  }
});