const flickrApiKey = process.env.NEXT_PUBLIC_FLICKR_API_KEY;
const flickrGroupId = process.env.NEXT_PUBLIC_FLICKR_GROUP_ID;


// Función para obtener una foto aleatoria
async function getRandomPhoto() {
  console.log("⏳ Solicitando una nueva foto...");

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
      console.log(`📄 Total de páginas: ${totalPages}, eligiendo aleatoriamente la página: ${randomPage}`);

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
        console.log(`📸 Foto seleccionada: ${photo.title} (${photoUrl})`);

        const newImg = document.createElement('img');
        newImg.src = `https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_c.jpg`;
        newImg.alt = photo.title;
        newImg.classList.add("hidden"); // Inicialmente oculta la imagen

        const photoContainer = document.getElementById('photo-info');
        const currentImg = photoContainer.querySelector('img');

        if (currentImg) {
          console.log("🔄 Aplicando fade-out a la imagen actual...");
          currentImg.classList.remove("fade-in");
          currentImg.classList.add("fade-out");
          
          // Esperamos a que termine el fade-out
          currentImg.addEventListener('transitionend', function handler() {
            currentImg.removeEventListener('transitionend', handler);
            currentImg.remove();
            showNewPhoto(newImg, photoUrl, photo);
          });
        } else {
          showNewPhoto(newImg, photoUrl, photo);
        }
        
        
      } else {
        console.warn("⚠️ No se encontraron fotos.");
        document.getElementById('photo-info').innerHTML = "No se encontraron fotos.";
      }
    } else {
      console.warn("⚠️ No se pudo obtener el total de páginas.");
      document.getElementById('photo-info').innerHTML = "No se pudo obtener el total de páginas.";
    }
  } catch (error) {
    console.error("❌ Error al obtener la foto:", error.message);
    document.getElementById('photo-info').innerHTML = `Error al obtener la foto: ${error.message}`;
  }
}

// Función auxiliar para mostrar la nueva imagen con fade-in
function showNewPhoto(imgElement, photoUrl, photo) {
  console.log("📥 Cargando nueva imagen...");
  
  const flickrPhotoUrl = `https://www.flickr.com/photos/${photo.owner}/${photo.id}`;
  
  const photoContainer = document.getElementById('photo-info');
  photoContainer.innerHTML = `
    <p><strong>Author:</strong> <a href="${flickrPhotoUrl}" target="_blank">${photo.ownername}</a></p>
  `;
  
  // Start with the image hidden
  imgElement.classList.add("hidden");
  photoContainer.appendChild(imgElement);
  
  // Force a reflow and apply fade-in
  imgElement.offsetHeight; // Force reflow
  imgElement.classList.remove("hidden");
  imgElement.classList.add("fade-in");
}


// Cargar una foto aleatoria cuando se carga la página por primera vez
window.onload = () => {
  requestAnimationFrame(() => {
    getRandomPhoto();
  });
};

// Event listener para el botón
document.getElementById('load-photo').addEventListener('click', getRandomPhoto);
