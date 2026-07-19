import './PrivacyPolicyPage.css';

interface PrivacyPolicyPageProps {
  onClose: () => void;
}

export function PrivacyPolicyPage({ onClose }: PrivacyPolicyPageProps) {
  return (
    <div className="privacy-policy-overlay" onClick={onClose}>
      <div className="privacy-policy-content" onClick={(e) => e.stopPropagation()}>
        <button className="privacy-policy-close" onClick={onClose}>×</button>
        
        <div className="privacy-policy-scroll">
          <h1>Politique de confidentialité</h1>
          
          <section className="privacy-section">
            <h2>Collecte de données</h2>
            
          </section>

          <section className="privacy-section">
            <h2>Données collectées</h2>
            <ul>
              
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Données NON collectées</h2>
            <ul>
              <li>Aucun cookie n'est utilisé</li>
              <li>Aucune donnée personnelle identifiable</li>
              <li>Aucun suivi comportemental inter-sites</li>
              <li>Aucune adresse IP stockée</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Conformité RGPD</h2>
            
            
          </section>

          <section className="privacy-section">
            <h2>Stockage local</h2>
            <p>
              Ce site utilise le <code>localStorage</code> de votre navigateur 
              pour sauvegarder vos préférences d'affichage (filtres, thème, 
              joueur sélectionné). Ces données restent locales sur votre appareil 
              et ne sont jamais transmises.
            </p>
          </section>

          <div className="privacy-footer">
            <p><em>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</em></p>
          </div>
        </div>
      </div>
    </div>
  );
}
