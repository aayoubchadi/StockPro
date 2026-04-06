const Home = () => {
  return (
    <div className="home-page">
      <section className="hero section-large">
        <div className="hero-content">
          <p className="eyebrow">Logiciel de gestion commerciale</p>
          <h1>La solution de gestion de stock nouvelle génération</h1>
          <p className="hero-copy">
            Gérez vos ventes, achats et stocks en temps réel avec une interface
            moderne pensée pour les TPE et PME.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn btn-primary">Essayer gratuitement</a>
            <a href="#features" className="btn btn-secondary">Découvrir</a>
          </div>
          <div className="hero-stats">
            <div>
              <strong>1 000+</strong>
              <span>TPE et PME utilisatrices</span>
            </div>
            <div>
              <strong>+50%</strong>
              <span>de gain de temps opérationnel</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="card visual-card">
            <div className="card-header">Suivi des stocks</div>
            <div className="card-body">
              <div className="chart-bar" />
              <div className="chart-bar chart-bar--medium" />
              <div className="chart-bar chart-bar--large" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section feature-grid">
        <div className="feature-card">
          <span className="feature-icon">✓</span>
          <h3>Automatisez vos commandes</h3>
          <p>
            Créez devis, bons de commande et factures sans saisie répétitive,
            puis suivez vos livraisons en un seul flux.
          </p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">✓</span>
          <h3>Inventaire en temps réel</h3>
          <p>
            Visualisez votre stock par entrepôt et recevez des alertes sur les
            niveaux bas automatiquement.
          </p>
        </div>
        <div className="feature-card">
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

      <section className="section trust-section">
        <h2>Plus de 1 000 TPE et PME nous font confiance</h2>
        <div className="trust-logos">
          <div className="logo-block">LoetMa</div>
          <div className="logo-block">Olio di Serra</div>
          <div className="logo-block">Aremi</div>
          <div className="logo-block">FFA</div>
          <div className="logo-block">Monsieur Barbier</div>
          <div className="logo-block">Cuore</div>
        </div>
      </section>
    </div>
  );
};

export default Home;
