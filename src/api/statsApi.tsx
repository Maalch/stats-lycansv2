// src/api/statsApi.ts
export async function fetchCombinedStats(statsToInclude: string[]) {
  const statsParam = statsToInclude.join(',');
  const apiRoot = import.meta.env.VITE_LYCANS_API_BASE || '';
  const response = await fetch(`${apiRoot}?action=combinedStats&stats=${statsParam}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}