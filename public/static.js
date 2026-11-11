'use strict';

const THEME_STORAGE_KEY = 'ncp-theme';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function applyTheme(theme) {
  const isDark = theme === 'dark';

  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

  const button = document.querySelector('[data-theme-toggle]');
  if (button) {
    button.textContent = isDark ? 'Light' : 'Dark';
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('aria-pressed', String(isDark));
  }
}

applyTheme(getStoredTheme() || (systemThemeQuery.matches ? 'dark' : 'light'));

systemThemeQuery.addEventListener('change', () => {
  if (!getStoredTheme()) {
    applyTheme(systemThemeQuery.matches ? 'dark' : 'light');
  }
});

const themeButton = document.querySelector('[data-theme-toggle]');
if (themeButton) {
  themeButton.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      // Storage may be unavailable.
    }
  });
}
