// Simple routing utilities without external dependencies

export const navigateToTestZone = () => {
  const basePath = import.meta.env.BASE_URL;
  const testZonePath = `${basePath}TestZone`;
  window.history.pushState({}, '', testZonePath);
  // Trigger a popstate event to update the route
  window.dispatchEvent(new PopStateEvent('popstate'));
  // Also reload the page to ensure route change is recognized
  window.location.reload();
};

export const navigateToHome = () => {
  const basePath = import.meta.env.BASE_URL;
  window.history.pushState({}, '', basePath);
  // Trigger a popstate event to update the route
  window.dispatchEvent(new PopStateEvent('popstate'));
  // Also reload the page to ensure route change is recognized
  window.location.reload();
};

export const getCurrentRoute = () => {
  return window.location.pathname;
};

export const isTestZoneRoute = () => {
  return window.location.pathname.includes('/TestZone');
};
