const Home = () => {
  return (
    <div className="home-page">
      <section className="hero section-large">
        <div className="hero-content slide-up">
          <p className="eyebrow">Logiciel de gestion commerciale B2B</p>
          <h1>La solution de gestion commerciale nouvelle generation</h1>
          <p className="hero-copy">
            Enfin un outil intelligent pour piloter votre TPE/PME en temps reel:
            fini les erreurs de saisie et les ruptures de stocks.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn btn-primary">Essayer gratuitement</a>
            <a href="#features" className="btn btn-secondary">Demander une demo</a>
          </div>
          <div className="hero-tags">
            <span>Ventes</span>
            <span>Stocks</span>
            <span>Achats</span>
            <span>Plateforme B2B</span>
          </div>
        </div>
        <div className="hero-visual slide-up delay-1">
          <div className="card visual-card">
            <div className="card-header">Tableau de bord en temps reel</div>
            <div className="card-body">
              <div className="metric-line">
                <strong>Commandes du jour</strong>
                <span>+24%</span>
              </div>
              <div className="chart-bar" />
              <div className="metric-line">
                <strong>Valeur stock</strong>
                <span>173 000 EUR</span>
              </div>
              <div className="chart-bar chart-bar--medium" />
              <div className="metric-line">
                <strong>Alertes stock bas</strong>
                <span>8 produits</span>
              </div>
              <div className="chart-bar chart-bar--large" />
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip section">
        <p>Plus de 1 000 TPE et PME nous font confiance</p>
        <div className="trust-inline">
          <span>Lo et Ma</span>
          <span>Aremi</span>
          <span>FFA</span>
          <span>Cuore</span>
          <span>Qarnot</span>
        </div>
      </section>

      <section id="features" className="section feature-grid">
        <div className="feature-card slide-up">
          <span className="feature-icon">✓</span>
          <h3>Automatisez vos commandes</h3>
          <p>
            Créez devis, bons de commande et factures sans saisie répétitive,
            puis suivez vos livraisons en un seul flux.
          </p>
        </div>
        <div className="feature-card slide-up delay-1">
          <span className="feature-icon">✓</span>
          <h3>Inventaire en temps réel</h3>
          <p>
            Visualisez votre stock par entrepôt et recevez des alertes sur les
            niveaux bas automatiquement.
          </p>
        </div>
        <div className="feature-card slide-up delay-2">
          <span className="feature-icon">✓</span>
          <h3>Achats et réapprovisionnement</h3>
          <p>
            Centralisez vos commandes fournisseurs avec suivi de réception et
            gestion des fournisseurs.
          </p>
        </div>
      </section>

      <section className="section cards-section">
        <div className="feature-panel">
          <h2>Automatisez votre gestion commerciale</h2>
          <p>
            Simplifiez le cycle de vente global : devis, commandes, expédition et
            facturation avec des workflows clairs et rapides.
          </p>
          <a href="#" className="btn btn-outline">Découvrir →</a>
        </div>
        <div className="feature-panel panel-alt">
          <h2>Centralisez et suivez vos stocks</h2>
          <p>
            Bénéficiez d'une visibilité précise sur vos emplacements, lots et
            quantités disponibles à tout moment.
          </p>
          <a href="#" className="btn btn-outline">Découvrir →</a>
        </div>
        <div className="feature-panel">
          <h2>Optimisez vos achats</h2>
          <p>
            Evitez les ruptures de stock avec des alertes automatiques et un
            réapprovisionnement piloté.
          </p>
          <a href="#" className="btn btn-outline">Découvrir →</a>
        </div>
      </section>

      <section id="integrations" className="section integrations-section">
        <div className="section-head">
          <p className="eyebrow">Applications connectees</p>
          <h2>Une gestion complete grace a nos integrations</h2>
        </div>
        <div className="integration-grid">
          <article className="integration-card">
            <h3>Solution de paiement</h3>
            <p>Acceptez le paiement des factures clients avec Stripe.</p>
            <a href="#" className="text-link">En savoir plus</a>
          </article>
          <article className="integration-card">
            <h3>Finance et comptabilite</h3>
            <p>Synchronisez vos operations commerciales avec Pennylane.</p>
            <a href="#" className="text-link">En savoir plus</a>
          </article>
          <article className="integration-card">
            <h3>Boutique e-commerce</h3>
            <p>Centralisez les ventes B2B et B2C avec Shopify.</p>
            <a href="#" className="text-link">En savoir plus</a>
          </article>
          <article className="integration-card">
            <h3>Logiciel de comptabilite</h3>
            <p>Reliez vos flux a QuickBooks en temps reel.</p>
            <a href="#" className="text-link">En savoir plus</a>
          </article>
        </div>
      </section>

      <section id="testimonials" className="section testimonial-section">
        <div className="section-head">
          <p className="eyebrow">Temoignages</p>
          <h2>Pourquoi les PME sont seduites par Stage FE ?</h2>
        </div>
        <div className="testimonial-grid">
          <article className="quote-card">
            <p>
              "Le canal de vente est simple a utiliser, de la commande a la
              facture. Nos equipes gagnent un temps enorme."
            </p>
            <strong>Paul Solier, Cofondateur</strong>
          </article>
          <article className="quote-card">
            <p>
              "Mise en place rapide avec un accompagnement concret. Le suivi des
              stocks est devenu fluide au quotidien."
            </p>
            <strong>Vivien Hugues, Directeur General</strong>
          </article>
          <article className="quote-card">
            <p>
              "Un seul outil pour B2B et B2C avec de vraies integrations. C'est
              exactement ce qu'il nous fallait."
            </p>
            <strong>Athenais de Lime, Fondatrice</strong>
          </article>
        </div>
      </section>

      <section id="why" className="section cta-section">
        <div className="cta-card">
          <h2>Pourquoi choisir Stage FE ?</h2>
          <p>
            Gagnez du temps, améliorez la collaboration de votre equipe et
            securisez vos donnees avec une plateforme unique.
          </p>
          <div className="cta-points">
            <span>Aucune carte de credit requise</span>
            <span>Sans engagement</span>
            <span>Accompagnement dedie</span>
            <span>Support reactif</span>
            <span>Securite renforcee</span>
          </div>
          <a href="/login" className="btn btn-primary">Commencer maintenant</a>
        </div>
      </section>

      <footer className="section site-footer" id="contact">
        <div>
          <h4>Fonctionnalites</h4>
          <a href="#">Gestion des stocks</a>
          <a href="#">Gestion des ventes</a>
          <a href="#">Gestion des achats</a>
        </div>
        <div>
          <h4>Integrations</h4>
          <a href="#">Stripe</a>
          <a href="#">Shopify</a>
          <a href="#">QuickBooks</a>
        </div>
        <div>
          <h4>Support</h4>
          <a href="#">Centre d'aide</a>
          <a href="#">Videos</a>
          <a href="#">FAQ</a>
        </div>
        <div>
          <h4>Stage FE</h4>
          <p>Avec Stage FE, gerez votre activite commerciale avec serenite.</p>
          <a href="/login" className="btn btn-secondary">Essayer gratuitement</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
