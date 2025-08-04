const flickrApiKey = window.ENV?.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = window.ENV?.NEXT_PUBLIC_FLICKR_GROUP_ID;

// Function to get a random photo
async function getRandomPhoto() {
  console.log("⏳ Requesting a new photo...");
  
  // Add loading class to the button
  const loadButton = document.getElementById('load-photo');
  loadButton.classList.add('loading');
  loadButton.disabled = true;

  try {
    const responsePages = await axios.get('https://api.flickr.com/services/rest/', {
      params: {
        method: 'flickr.groups.pools.getPhotos',
        api_key: flickrApiKey,
        group_id: flickrGroupId,
        format: 'json',
        nojsoncallback: 1,
        per_page: 1,
        page: 1,
      }
    });

    if (responsePages.data.stat === 'ok' && responsePages.data.photos.pages > 0) {
      const totalPages = responsePages.data.photos.pages;
      const randomPage = Math.floor(Math.random() * totalPages) + 1;
      console.log(`📄 Total pages: ${totalPages}, randomly selecting page: ${randomPage}`);

      const responsePhoto = await axios.get('https://api.flickr.com/services/rest/', {
        params: {
          method: 'flickr.groups.pools.getPhotos',
          api_key: flickrApiKey,
          group_id: flickrGroupId,
          format: 'json',
          nojsoncallback: 1,
          per_page: 1,
          page: randomPage,
          extras: 'owner_name'
        }
      });

      if (responsePhoto.data.stat === 'ok' && responsePhoto.data.photos.photo.length > 0) {
        const photo = responsePhoto.data.photos.photo[0];
        const photoUrl = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`;
        console.log(`📸 Selected photo: ${photo.title} (${photoUrl})`);

        const newImg = document.createElement('img');
        newImg.src = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
        newImg.alt = photo.title;
        newImg.classList.add("hidden"); // Initially hide the image
        
        // Add an event for when the image finishes loading
        newImg.onload = function() {
          // Remove loading class from the button when the image is ready
          loadButton.classList.remove('loading');
          loadButton.disabled = false;
        };

        const photoContainer = document.getElementById('photo-info');
        const currentImg = photoContainer.querySelector('img');

        if (currentImg) {
          console.log("🔄 Applying fade-out to the current image...");
          currentImg.classList.remove("fade-in");
          currentImg.classList.add("fade-out");

          // Wait for the fade-out to finish
          currentImg.addEventListener('transitionend', function handler() {
            currentImg.removeEventListener('transitionend', handler);
            currentImg.remove();
            revealContent(); // Ensure content is visible
            showNewPhoto(newImg, photoUrl, photo);
          });
        } else {
          showNewPhoto(newImg, photoUrl, photo);
        }
      } else {
        console.warn("⚠️ No photos found. Retrying...");
        // If no photo is found, retry the call
        setTimeout(getRandomPhoto, 2000);
      }
    } else {
      console.warn("⚠️ Unable to retrieve the total number of pages. Retrying...");
      setTimeout(getRandomPhoto, 2000);
      // Remove loading class in case of error
      loadButton.classList.remove('loading');
      loadButton.disabled = false;
    }
  } catch (error) {
    console.error("❌ Error retrieving the photo:", error.message, " Retrying...");
    setTimeout(getRandomPhoto, 2000);
    // Remove loading class in case of error
    loadButton.classList.remove('loading');
    loadButton.disabled = false;
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
function showNewPhoto(imgElement, photoUrl, photo) {
  console.log("📥 Loading new image...");
  revealContent(); // Hide skeleton and show real content containers

  const flickrPhotoUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;

  const photoContainer = document.getElementById('photo-info');
  photoContainer.innerHTML = `
    <p><strong>Author:</strong> <a href="${flickrPhotoUrl}" target="_blank">${photo.ownername} <i class="bi bi-box-arrow-up-right"></i></a></p>
  `;

  // Start with the image hidden
  imgElement.classList.add("hidden");
  photoContainer.appendChild(imgElement);

  // Force a reflow and apply fade-in
  imgElement.offsetHeight; // Force reflow
  imgElement.classList.remove("hidden");
  imgElement.classList.add("fade-in");
}

// Load a random photo when the page loads for the first time
window.onload = () => {
  requestAnimationFrame(() => {
    getRandomPhoto();
  });
};

// Event listener for the button
document.getElementById('load-photo').addEventListener('click', getRandomPhoto);

// Dark mode toggle functionality with icon swap
const toggleButton = document.getElementById('toggle-dark-mode');
toggleButton.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    toggleButton.innerHTML = '<i class="bi bi-sun"></i>';
  } else {
    toggleButton.innerHTML = '<i class="bi bi-moon"></i>';
  }
});

// Keyboard navigation: Spacebar or Enter to load the next photo
document.addEventListener('keydown', (event) => {
  const loadButton = document.getElementById('load-photo');

  // If the key press is on the load button itself, let the browser handle the native click event.
  // This prevents the function from firing twice (once on keydown, once on click).
  if ((event.key === ' ' || event.key === 'Enter') && document.activeElement === loadButton) {
    return;
  }

  // Do nothing if a photo is already being loaded.
  if (loadButton.disabled) {
    return;
  }

  // Do not interfere with other interactive elements like links or the theme toggle button.
  if (document.activeElement.tagName === 'A' || document.activeElement.id === 'toggle-dark-mode') {
    return;
  }

  // If the spacebar or enter key is pressed globally, trigger the photo load.
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault(); // Prevent scrolling or other default actions.
    loadButton.click();
  }
});