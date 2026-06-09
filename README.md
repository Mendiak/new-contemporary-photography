# New Contemporary Photography

[![Live Demo](https://img.shields.io/badge/Live-Demo-orange?style=for-the-badge)](https://new-contemporary-photography.vercel.app/)

A high-contrast photography showcase for the [New Contemporary Photography](https://www.flickr.com/groups/newcontemporaryphotography/) Flickr group. Built with a brutalist flat aesthetic.

![Screenshot](https://new-contemporary-photography.vercel.app/assets/screenshot.jpg)

## Design Philosophy

- **High-Contrast Brutalism**: Solid charcoal surfaces, sharp 4px borders, vibrant accents (Safety Orange/Electric Blue).
- **Photography First**: Images presented in a dedicated black box across all aspect ratios.
- **Micro-Animations**: Snappy transitions and progress indicators.
- **Zero Transparency**: Solid backgrounds prevent grid bleed.

## Features

- **Auto-play Mode**: Slideshow that cycles through curated photography.
- **Fullscreen Mode**: Expand to the entire screen.
- **Shareable Title**: Click the page title to copy the production URL.
- **Real-time Progress**: Loading bar tracks photo prefetching.
- **Adaptive Theming**: Switch between light and dark modes.

## Technologies

- **Vanilla JavaScript (ES6+)**: Light, dependency-free core logic.
- **Modern CSS**: HSL variables, sharp layout tokens, IBM Plex Mono typography.
- **Flickr API**: Powers discovery from thousands of curated works.
- **Bootstrap Icons**: Minimalist iconography for UI controls.

## Development

### Prerequisites

1.  **Flickr API Key**: Obtain one [here](https://www.flickr.com/services/apps/create/apply/).
2.  **Group ID**: `34427469792@N01`.

### Local Setup

1.  **Clone**:
    ```bash
    git clone https://github.com/your-username/new-contemporary-photography.git
    cd new-contemporary-photography
    ```

2.  **Environment Configuration**: 
    Create `config.js` in root:
    ```javascript
    window.ENV = {
      NEXT_PUBLIC_FLICKR_API_KEY: 'YOUR_KEY_HERE',
      NEXT_PUBLIC_FLICKR_GROUP_ID: '34427469792@N01'
    };
    ```

3.  **Run**: Open `index.html` in any modern browser.

## Dedication

> "Web desarrollada en homenaje a los grandes trabajos fotográficos de este grupo y a todo lo aprendido gracias a ellos en mis años en Flickr."

A personal tribute to the photographers who inspired my journey.

---

Redesigned and maintained by Mikel Aramendia.
