const flickrApiKey = window.ENV?.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = window.ENV?.NEXT_PUBLIC_FLICKR_GROUP_ID;

// Function to get a random photo
async function getRandomPhoto() {
  console.log("⏳ Requesting a new photo...");

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
        newImg.src = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`;
        newImg.alt = photo.title;
        newImg.classList.add("hidden"); // Initially hide the image

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
            showNewPhoto(newImg, photoUrl, photo);
          });
        } else {
          showNewPhoto(newImg, photoUrl, photo);
        }
      } else {
        console.warn("⚠️ No photos found.");
        document.getElementById('photo-info').innerHTML = "No photos found.";
      }
    } else {
      console.warn("⚠️ Unable to retrieve the total number of pages.");
      document.getElementById('photo-info').innerHTML = "Unable to retrieve the total number of pages.";
    }
  } catch (error) {
    console.error("❌ Error retrieving the photo:", error.message);
    document.getElementById('photo-info').innerHTML = `Error retrieving the photo: ${error.message}`;
  }
}

// Helper function to display the new image with fade-in effect
function showNewPhoto(imgElement, photoUrl, photo) {
  console.log("📥 Loading new image...");

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
