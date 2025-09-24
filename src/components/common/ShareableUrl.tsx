import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

export function ShareableUrl() {
  const { generateUrlWithSettings } = useSettings();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    const url = generateUrlWithSettings();
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="shareable-url-container">
      <button 
        onClick={handleCopyUrl}
        className="shareable-url-btn"
        type="button"
        title="Copier le lien avec les filtres actuels"
      >
        {copied ? '✅ Copié!' : '🔗 Copier le lien'}
      </button>
    </div>
  );
}
