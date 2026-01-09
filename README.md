# New Contemporary Photography 📸

[![Live Demo](https://img.shields.io/badge/Live-Demo-orange?style=for-the-badge)](https://new-contemporary-photography.vercel.app/)

A premium, high-contrast photography showcase built to celebrate the incredible art of the [New Contemporary Photography](https://www.flickr.com/groups/newcontemporaryphotography/) Flickr group. 

This application has been redesigned with a "brutalist" flat aesthetic, prioritizing visual impact and immersive photography discovery.

![Screenshot](https://new-contemporary-photography.vercel.app/assets/screenshot.jpg)

## 🎨 Design Philosophy

- **High-Contrast Brutalism**: Solid charcoal surfaces, sharp 4px borders, and vibrant accents (Safety Orange/Electric Blue).
- **Photography First**: Images are presented in a dedicated black box to maintain focus across all aspect ratios.
- **Micro-Animations**: Snappy transitions and progress indicators for a premium feel.
- **Zero Transparency**: Optimized for clarity with solid backgrounds that prevent grid bleed.

## ✨ Features

- **🚀 Auto-play Mode**: An immersive slideshow that automatically cycles through curated photography.
- **🖥️ Fullscreen Mode**: Expand your experience to the entire screen for maximum focus.
- **🔗 Shareable Title**: Click the page title to instantly copy the production URL (`https://new-contemporary-photography.vercel.app/`).
- **📊 Real-time Progress**: A visual loading bar tracks photo prefetching and display status.
- **🌓 Adaptive Theming**: Seamlessly switch between light and dark modes optimized for high-contrast viewing.

## 🛠️ Technologies Used

- **Vanilla JavaScript (ES6+)**: Light, fast, and dependency-free core logic.
- **Modern CSS**: Using HSL variables, sharp layout tokens, and refined typography (IBM Plex Mono).
- **Flickr API**: Powering the discovery engine from a pool of thousands of curated works.
- **Bootstrap Icons**: Minimalist iconography for UI controls.

## 🚀 Development

### Prerequisites

1.  **Flickr API Key**: Obtain one [here](https://www.flickr.com/services/apps/create/apply/).
2.  **Group ID**: The project uses `34427469792@N01`.

### Local Setup

1.  **Clone the project**:
    ```bash
    git clone https://github.com/your-username/new-contemporary-photography.git
    cd new-contemporary-photography
    ```

2.  **Environment Configuration**: 
    Create a `config.js` in the root (this file is gitignored):
    ```javascript
    window.ENV = {
      NEXT_PUBLIC_FLICKR_API_KEY: 'YOUR_KEY_HERE',
      NEXT_PUBLIC_FLICKR_GROUP_ID: '34427469792@N01'
    };
    ```

3.  **Run**: Open `index.html` in any modern browser.

## 🙏 Dedication

> "Web desarrollada en homenaje a los grandes trabajos fotográficos de este grupo y a todo lo aprendido gracias a ellos en mis años en Flickr."

This project is a personal tribute to the photographers who have inspired my journey. Every image discovered here is a testament to the community's collective vision.

---

*Redesigned and maintained by Mikel Aramendia.*
