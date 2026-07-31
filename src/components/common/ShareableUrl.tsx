import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

export function ShareableUrl() {
  const { generateUrlWithSettings } = useSettings();
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const showCopiedFeedback = () => {
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = async () => {
    const url = generateUrlWithSettings();
    
    try {
      await navigator.clipboard.writeText(url);
      showCopiedFeedback();
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showCopiedFeedback();
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
