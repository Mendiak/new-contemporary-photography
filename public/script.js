const flickrApiKey = window.ENV?.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = window.ENV?.NEXT_PUBLIC_FLICKR_GROUP_ID;
const loadButton = document.getElementById('load-photo');

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
// Function to get a random photo
async function getRandomPhoto() {
  console.log("⏳ Requesting a new photo...");

  // Disable button at the start of the request
  loadButton.classList.add('loading');
  loadButton.disabled = true;

  try {
    // Step 1: Get the total number of pages to determine a random page
    // We only need 1 photo per page to get the total page count. This is more efficient.
    const responsePages = await flickrApi.get('', {
      params: { per_page: 1 }
    });
    
    // Explicitly check for a failed API status from Flickr.
    if (responsePages.data.stat !== 'ok') {
      // Log the specific error message from Flickr to help with debugging.
      console.error("🔴 Flickr API returned an error:", responsePages.data);
      // Throw a more specific error to be caught below.
      throw new Error(`Flickr API Error: ${responsePages.data.message} (Code: ${responsePages.data.code})`);
    }

    const totalPages = responsePages.data.photos.pages;
    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    console.log(`📄 Total pages: ${totalPages}, randomly selecting page: ${randomPage}`);

    // Step 2: Get a photo from the randomly selected page
    const responsePhoto = await flickrApi.get('', {
      params: {
        per_page: 1,
        page: randomPage,
        extras: 'owner_name'
      }
    });

    if (responsePhoto.data.stat !== 'ok' || responsePhoto.data.photos.photo.length === 0) {
      console.warn("⚠️ No photo found on the selected page. Retrying...");
      throw new Error("No photo found on page."); // Force retry via catch block
    }

    const photo = responsePhoto.data.photos.photo[0];
    const photoUrl = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
    console.log(`📸 Selected photo: ${photo.title} (${photoUrl})`);

    const newImg = document.createElement('img');
    newImg.src = photoUrl;
    newImg.alt = photo.title;
    newImg.classList.add("hidden"); // Initially hide the image

    // The 'onload' event will handle re-enabling the button and showing the image.
    // This prevents the button from being enabled before the image is ready.
    newImg.onload = () => {
      const photoContainer = document.getElementById('photo-info');
      const currentImg = photoContainer.querySelector('img');

      if (currentImg) {
        console.log("🔄 Applying fade-out to the current image...");
        currentImg.classList.remove("fade-in");
        currentImg.classList.add("fade-out");

        // Wait for the fade-out to finish before showing the new image
        currentImg.addEventListener('transitionend', () => {
          currentImg.remove();
          showNewPhoto(newImg, photo);
        }, { once: true }); // Use { once: true } for automatic cleanup
      } else {
        showNewPhoto(newImg, photo);
      }
      // Re-enable the button only when the new image is fully loaded and ready to be shown.
      loadButton.classList.remove('loading');
      loadButton.disabled = false;
    };

    newImg.onerror = () => {
      console.error("❌ Error loading the image file. Retrying...");
      setTimeout(getRandomPhoto, 2000);
    };

  } catch (error) {
    console.error("❌ Error during API request. Retrying in 2 seconds...");
    // Log the detailed error from Axios/Flickr to see the real problem
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx. This is the most likely case.
      console.error("Flickr API Response Error:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from Flickr:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Axios setup error:", error.message);
    }
    // If anything fails, re-enable the button and try again after a delay.
    loadButton.classList.remove('loading');
    loadButton.disabled = false;
    setTimeout(getRandomPhoto, 2000);
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
function showNewPhoto(imgElement, photo) {
  console.log("📥 Displaying new image...");
  revealContent(); // Hide skeleton and show real content containers

  const flickrPhotoUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;

  const photoContainer = document.getElementById('photo-info');
  // Clear previous content and add new info
  photoContainer.innerHTML = `
    <p><strong>Author:</strong> <a href="${flickrPhotoUrl}" target="_blank" rel="noopener noreferrer">${photo.ownername} <i class="bi bi-box-arrow-up-right"></i></a></p>
  `;

  photoContainer.appendChild(imgElement);

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
  getRandomPhoto();
}

// Load a random photo when the DOM is ready
// Using DOMContentLoaded is slightly more efficient than window.onload
document.addEventListener('DOMContentLoaded', main);

// Event listener for the button
loadButton.addEventListener('click', getRandomPhoto);

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