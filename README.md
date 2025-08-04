# New Contemporary Photography

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=flat-square)](https://new-contemporary-photography.vercel.app/)

A simple and elegant web application that showcases a random, beautiful image from the [New Contemporary Photography](https://www.flickr.com/groups/newcontemporaryphotography/) Flickr group.

![Screenshot of the New Contemporary Photography website](https://new-contemporary-photography.vercel.app/assets/screenshot.jpg)

## ✨ Features

*   **Random Photo Discovery**: Fetches a random photo from a pool of thousands in the Flickr group with a single click.
*   **Author Attribution**: Displays the photographer's name and provides a direct link to the original photo on Flickr.
*   **Smooth Transitions**: Enjoy seamless and elegant fade-in/fade-out animations when loading new images.
*   **Dark & Light Modes**: A sleek toggle to switch between a light and dark theme for comfortable viewing in any lighting condition.
*   **Responsive Design**: A fully responsive layout that looks great on desktops, tablets, and mobile devices.
*   **Loading State**: The "Next Photo" button provides visual feedback while a new image is being fetched and loaded.

## 🛠️ Technologies Used

This project is built with vanilla web technologies, keeping it lightweight and fast.

*   **HTML5**: For the core structure and content.
*   **CSS3**: For styling, including CSS Variables for theming, Flexbox for layout, and transitions for animations.
*   **JavaScript (ES6+)**: For all the dynamic functionality, including API calls and DOM manipulation.
*   **[Flickr API](https://www.flickr.com/services/api/)**: Used to fetch photo data from the public group pool.
*   **[Axios](https://axios-http.com/)**: A promise-based HTTP client for making requests to the Flickr API.
*   **[Bootstrap Icons](https://icons.getbootstrap.com/)**: For the shuffle and theme-toggle icons.

## 🚀 Getting Started

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/new-contemporary-photography.git
    cd new-contemporary-photography
    ```

2.  **Get a Flickr API Key:**
    *   You will need an API key from Flickr to make requests. You can apply for one [here](https://www.flickr.com/services/apps/create/apply/).
    *   You will also need the ID of the Flickr group. For this project, it is `34427469792@N01`.

3.  **Create a `config.js` file:**
    In the root of the project, create a new file named `config.js` and add your Flickr API key and Group ID to it, like so:

    ```javascript
    // c:\Users\mikel\Desktop\VS Code\new-contemporary-photography\config.js
    window.ENV = {
      NEXT_PUBLIC_FLICKR_API_KEY: 'YOUR_FLICKR_API_KEY_HERE',
      NEXT_PUBLIC_FLICKR_GROUP_ID: '34427469792@N01'
    };
    ```
    > **Note:** This file is included in `.gitignore` to prevent API keys from being committed to version control.

4.  **Open `index.html`:**
    Simply open the `index.html` file in your web browser to see the application in action. No local server is required.

## 📂 File Structure

```
new-contemporary-photography/
├── assets/
│   └── screenshot.jpg
├── .gitignore
├── config.js           # (You need to create this)
├── favicon.png
├── index.html
├── README.md
├── script.js
└── styles.css
```

## 🙏 Acknowledgements

*   A huge thank you to all the talented photographers in the New Contemporary Photography group on Flickr for sharing their incredible work.
*   This project is a tribute to their art and a way to discover new perspectives in photography.

---

*This project was created by Mikel Aramendia.*