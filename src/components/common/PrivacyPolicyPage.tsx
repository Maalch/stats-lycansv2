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
            <p>
              Ce site utilise <strong>Cloudflare Web Analytics</strong> pour collecter 
              des statistiques d'utilisation anonymes (pages vues, pays d'origine, 
              navigateurs utilisés).
            </p>
          </section>

          <section className="privacy-section">
            <h2>Données collectées</h2>
            <ul>
              <li>Pages visitées</li>
              <li>Sources de trafic (référents)</li>
              <li>Pays de provenance (via géolocalisation IP côté serveur)</li>
              <li>Type de navigateur et système d'exploitation</li>
              <li>Type d'appareil (ordinateur, mobile, tablette)</li>
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
            <p>
              Cloudflare Web Analytics est conforme au RGPD et ne nécessite pas 
              de bannière de consentement. Les adresses IP sont traitées côté 
              serveur uniquement pour déterminer le pays, puis immédiatement 
              supprimées.
            </p>
            <p>
              En savoir plus : <a 
                href="https://www.cloudflare.com/web-analytics/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="external-link"
              >
                Cloudflare Web Analytics
              </a>
            </p>
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

          <section className="privacy-section">
            <h2>Contact</h2>
            <p>
              Pour toute question concernant cette politique de confidentialité, 
              vous pouvez nous contacter via <a 
                href="mailto:admin@lycanstracker.fr"
                className="external-link"
              >
                admin@lycanstracker.fr
              </a>.
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
