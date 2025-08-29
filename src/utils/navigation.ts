// Simple routing utilities using hash-based navigation

export const navigateToTestZone = () => {
  window.location.hash = '#/TestZone';
};

export const navigateToHome = () => {
  window.location.hash = '';
};

export const getCurrentRoute = () => {
  return window.location.hash;
};

export const isTestZoneRoute = () => {
  return window.location.hash === '#/TestZone';
};
