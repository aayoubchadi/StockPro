import artisanImage from '../assets/images/artisan.jpg';
import agencesImage from '../assets/images/agnce.jpg';
import startupImage from '../assets/images/startup.jpg';
import enterpriseServicesImage from '../assets/images/Entreprise de services.jpg';
import franchiseImage from '../assets/images/Franchise.jpg';
import accountingExpertsImage from '../assets/images/comptable.jpeg';
import independentSecretariesImage from '../assets/images/secretaire-independante.webp';

const resolveAudienceLanguage = (language) => {
    return language === 'fr' ? 'fr' : 'en';
};

export const audienceProfiles = [
    {
        key: 'audience1',
        slug: 'artisan',
        labelKey: 'header.audience.artisanUpper',
        menuLabelKey: 'header.audience.artisan',
        image: artisanImage,
        imageClassName: 'audience-item-image-artisan',
        content: {
            en: {
                summary: 'Built for trades that need fast quotes, clean invoices, and reliable stock.',
                heroEyebrow: 'Trade Business',
                heroTitle: 'StockPro for artisans and field teams.',
                heroSubtitle:
                    'Run quote-to-invoice workflows and stock updates in one place, even with mixed workshop and on-site operations.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Stock is adjusted manually and numbers drift every week.',
                    'Quotes and invoices live in different tools and waste time.',
                    'Supplier orders are often late because thresholds are unclear.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Live stock by location',
                        copy: 'Track parts per workshop, vehicle, and temporary job site in real time.',
                    },
                    {
                        title: 'Quote to invoice in one click',
                        copy: 'Turn approved quotes into invoices without retyping lines and prices.',
                    },
                    {
                        title: 'Automated purchase triggers',
                        copy: 'Create supplier purchase actions automatically when stock hits minimum levels.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Build quote from your product/service catalog.',
                    'Validate work and convert the quote into an invoice.',
                    'Restock with guided purchase actions based on demand.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '-40%', label: 'admin time spent on commercial documents' },
                    { value: '+28%', label: 'faster invoice turnaround after completion' },
                    { value: '-22%', label: 'urgent purchases caused by stock surprises' },
                ],
                quote:
                    'We now manage estimates, invoices, and parts in one process. Teams are faster and less stressed.',
                quoteAuthor: 'Nadia L.',
                quoteRole: 'Owner, plumbing workshop',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Concu pour les artisans qui veulent devis rapides, factures nettes et stock fiable.',
                heroEyebrow: 'Metiers Terrain',
                heroTitle: 'StockPro pour les artisans et equipes terrain.',
                heroSubtitle:
                    'Pilotez devis, factures et mouvements de stock dans un seul espace, meme avec atelier et interventions.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Le stock est ajuste a la main et les chiffres deviennent incertains.',
                    'Devis et factures sont separes dans plusieurs outils.',
                    'Les commandes fournisseurs arrivent trop tard faute de seuils clairs.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Stock en direct par lieu',
                        copy: 'Suivez vos pieces par atelier, vehicule et chantier en temps reel.',
                    },
                    {
                        title: 'Du devis a la facture en un clic',
                        copy: 'Convertissez un devis valide sans ressaisie des lignes et des prix.',
                    },
                    {
                        title: 'Achats guides automatiquement',
                        copy: 'Declenchez des actions d achat quand le stock atteint le seuil minimal.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Creer le devis depuis votre catalogue produits/services.',
                    'Valider la prestation puis transformer le devis en facture.',
                    'Relancer les achats selon les niveaux de stock et la demande.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '-40%', label: 'temps administratif sur documents commerciaux' },
                    { value: '+28%', label: 'rapidite de facturation apres intervention' },
                    { value: '-22%', label: 'achats urgents causes par des ruptures non prevues' },
                ],
                quote:
                    'On gere enfin devis, factures et pieces dans un seul flux. L equipe est plus rapide et plus sereine.',
                quoteAuthor: 'Nadia L.',
                quoteRole: 'Gerante, atelier plomberie',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience3',
        slug: 'agencies',
        labelKey: 'header.audience.agencies',
        menuLabelKey: 'header.audience.agencies',
        image: agencesImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For agencies coordinating projects, billing cycles, and recurring deliveries.',
                heroEyebrow: 'Agency Teams',
                heroTitle: 'StockPro for growing agencies.',
                heroSubtitle:
                    'Coordinate client work, recurring services, and productized offers while keeping inventory and billing aligned.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Project teams and finance teams use disconnected systems.',
                    'Recurring service invoices are delayed by manual checks.',
                    'Small inventory needs for kits or materials are ignored until too late.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Unified project billing',
                        copy: 'Track quote, execution, and invoice states from the same workspace.',
                    },
                    {
                        title: 'Recurring service cadence',
                        copy: 'Standardize recurring billing cycles for retainers and maintenance offers.',
                    },
                    {
                        title: 'Light inventory control',
                        copy: 'Monitor branded materials, equipment, and campaign kits without heavy ERP complexity.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Create scoped quote with milestones and billing dates.',
                    'Track delivery status and approvals by account owner.',
                    'Invoice instantly with complete history and attachments.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '-31%', label: 'billing preparation time' },
                    { value: '+19%', label: 'on-time recurring invoices' },
                    { value: '+24%', label: 'visibility on project profitability' },
                ],
                quote: 'The agency now has one source of truth between operations and invoicing.',
                quoteAuthor: 'Youssef B.',
                quoteRole: 'Operations lead, digital agency',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les agences qui pilotent projets, facturation et livraisons recurrentes.',
                heroEyebrow: 'Equipes Agence',
                heroTitle: 'StockPro pour les agences en croissance.',
                heroSubtitle:
                    'Coordonnez travail client, services recurrents et offres packagees avec stock et facturation alignes.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Les equipes projet et finance travaillent sur des outils differents.',
                    'Les factures recurrentes partent en retard a cause de controles manuels.',
                    'Les besoins de stock legers sont traites trop tard.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Facturation projet unifiee',
                        copy: 'Suivez devis, execution et facture depuis le meme espace.',
                    },
                    {
                        title: 'Cadence des services recurrents',
                        copy: 'Standardisez la facturation de vos contrats mensuels et maintenances.',
                    },
                    {
                        title: 'Controle de stock leger',
                        copy: 'Surveillez materiel, kits et consommables sans complexite excessive.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Creer un devis avec jalons et dates de facturation.',
                    'Suivre la livraison et les validations client.',
                    'Facturer immediatement avec historique complet.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '-31%', label: 'temps de preparation des factures' },
                    { value: '+19%', label: 'factures recurrentes envoyees a l heure' },
                    { value: '+24%', label: 'visibilite sur la rentabilite des projets' },
                ],
                quote: 'L agence travaille enfin avec une seule source de verite entre operationnel et facturation.',
                quoteAuthor: 'Youssef B.',
                quoteRole: 'Responsable operations, agence digitale',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience4',
        slug: 'startup',
        labelKey: 'header.audience.startup',
        menuLabelKey: 'header.audience.startup',
        image: startupImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For startups scaling sales fast while keeping inventory and cash under control.',
                heroEyebrow: 'Startups',
                heroTitle: 'StockPro for startup execution speed.',
                heroSubtitle:
                    'Move quickly from first sales to repeatable operations with clear inventory, purchasing, and invoice workflows.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Founders handle sales and operations with fragmented spreadsheets.',
                    'Cash collection lags because quote and invoice processes are not standardized.',
                    'Stock forecasting becomes impossible once volume grows.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Structured revenue pipeline',
                        copy: 'Turn early traction into a repeatable quote-to-cash process.',
                    },
                    {
                        title: 'Lean inventory governance',
                        copy: 'Control stock commitments without creating heavy process overhead.',
                    },
                    {
                        title: 'Fast operational visibility',
                        copy: 'Give founders and managers one dashboard for sales, purchases, and margins.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Build standardized offers and quoting templates.',
                    'Track approvals and convert accepted quotes instantly.',
                    'Review margin and reorder decisions weekly from one dashboard.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '+34%', label: 'faster quote acceptance cycles' },
                    { value: '+26%', label: 'improvement in cash collection speed' },
                    { value: '-29%', label: 'manual reporting effort for founders' },
                ],
                quote: 'It gave us structure without slowing us down. That is exactly what we needed at growth stage.',
                quoteAuthor: 'Samira K.',
                quoteRole: 'COO, B2B startup',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les startups qui accelerent les ventes tout en maitrisant stock et tresorerie.',
                heroEyebrow: 'Startups',
                heroTitle: 'StockPro pour executer vite en phase de croissance.',
                heroSubtitle:
                    'Passez des premieres ventes a une operation reproductible avec stock, achats et factures bien cadres.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Les fondateurs gerent ventes et operations avec des tableurs disperses.',
                    'Le recouvrement ralentit car devis et factures ne sont pas standardises.',
                    'La prevision de stock devient difficile quand le volume monte.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Pipeline revenus structure',
                        copy: 'Transformez la traction initiale en process stable de devis a encaissement.',
                    },
                    {
                        title: 'Gouvernance stock legere',
                        copy: 'Gardez le controle des engagements stock sans alourdir les operations.',
                    },
                    {
                        title: 'Visibilite rapide',
                        copy: 'Offrez un tableau unique ventes, achats et marges a la direction.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Creer des offres standard et modeles de devis.',
                    'Suivre les validations puis convertir les devis acceptes.',
                    'Arbitrer marge et reapprovisionnements chaque semaine.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '+34%', label: 'vitesse des cycles de signature devis' },
                    { value: '+26%', label: 'amelioration de la vitesse d encaissement' },
                    { value: '-29%', label: 'temps de reporting manuel des fondateurs' },
                ],
                quote: 'On a gagne un cadre solide sans perdre en agilite. C est ce qu il nous fallait.',
                quoteAuthor: 'Samira K.',
                quoteRole: 'COO, startup B2B',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience5',
        slug: 'enterprise-services',
        labelKey: 'header.audience.enterpriseServices',
        menuLabelKey: 'header.audience.enterpriseServices',
        image: enterpriseServicesImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For service enterprises that need process consistency across teams and branches.',
                heroEyebrow: 'Service Enterprises',
                heroTitle: 'StockPro for multi-team service operations.',
                heroSubtitle:
                    'Standardize billing, purchasing, and inventory controls across departments while preserving local flexibility.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Each branch follows a different document and approval process.',
                    'Finance lacks consolidated visibility on margins and spend.',
                    'Cross-site inventory transfers are tracked too late.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Shared operating model',
                        copy: 'Deploy unified process templates with role-based permissions per team.',
                    },
                    {
                        title: 'Consolidated performance view',
                        copy: 'Measure revenue, purchasing, and profitability by branch and business unit.',
                    },
                    {
                        title: 'Controlled internal transfers',
                        copy: 'Manage cross-site stock movement with traceability and accountability.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Use common templates for quotes, invoices, and purchase requests.',
                    'Validate high-impact operations through role approvals.',
                    'Review branch-level KPIs from a consolidated cockpit.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '-37%', label: 'process variance between branches' },
                    { value: '+23%', label: 'faster monthly closing visibility' },
                    { value: '-18%', label: 'unplanned internal stock transfers' },
                ],
                quote: 'We finally align branch practices without forcing rigid central control.',
                quoteAuthor: 'Karim D.',
                quoteRole: 'Operations director, service group',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les entreprises de services qui veulent harmoniser les pratiques multi-equipes.',
                heroEyebrow: 'Entreprise de Services',
                heroTitle: 'StockPro pour les operations multi-sites.',
                heroSubtitle:
                    'Standardisez facturation, achats et controle stock entre departements en gardant de la souplesse locale.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Chaque site applique ses propres regles de documents et validations.',
                    'La finance manque de vision consolidee sur marges et depenses.',
                    'Les transferts de stock inter-sites sont suivis trop tard.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Modele operationnel partage',
                        copy: 'Deployez des modeles communs avec permissions selon roles et equipes.',
                    },
                    {
                        title: 'Performance consolidee',
                        copy: 'Analysez revenus, achats et rentabilite par site et unite.',
                    },
                    {
                        title: 'Transferts internes maitrises',
                        copy: 'Pilotez les mouvements inter-sites avec tracabilite complete.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Utiliser des modeles communs devis, factures, achats.',
                    'Valider les operations sensibles par role.',
                    'Suivre les KPI de chaque site dans un cockpit unifie.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '-37%', label: 'ecarts de process entre sites' },
                    { value: '+23%', label: 'rapidite de vision sur la cloture mensuelle' },
                    { value: '-18%', label: 'transferts internes non planifies' },
                ],
                quote: 'Nous alignons les pratiques des agences sans perdre la souplesse terrain.',
                quoteAuthor: 'Karim D.',
                quoteRole: 'Directeur operations, groupe de services',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience6',
        slug: 'franchise',
        labelKey: 'header.audience.franchise',
        menuLabelKey: 'header.audience.franchise',
        image: franchiseImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For franchise networks that need standard operations with local accountability.',
                heroEyebrow: 'Franchise Network',
                heroTitle: 'StockPro for franchise governance.',
                heroSubtitle:
                    'Scale standards across franchisees while preserving local execution visibility and traceability.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Head office lacks real-time control over local inventory and invoicing quality.',
                    'Franchisees use inconsistent catalog and pricing versions.',
                    'Compliance checks are manual and difficult to audit.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Central template control',
                        copy: 'Distribute validated catalog, pricing, and document structures from headquarters.',
                    },
                    {
                        title: 'Local execution with safeguards',
                        copy: 'Allow franchise autonomy with role-based limits and approval checkpoints.',
                    },
                    {
                        title: 'Network-level reporting',
                        copy: 'Compare branch activity, stock health, and sales consistency from one dashboard.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Publish updated commercial templates from headquarters.',
                    'Operate locally with controlled permissions and trace logs.',
                    'Review network KPIs and compliance status each cycle.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '+32%', label: 'consistency in pricing and invoicing' },
                    { value: '-27%', label: 'time spent on manual compliance checks' },
                    { value: '+21%', label: 'visibility on branch inventory health' },
                ],
                quote: 'Franchisees stay autonomous, and HQ keeps a clear line of control.',
                quoteAuthor: 'Meriem T.',
                quoteRole: 'Franchise development manager',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les reseaux de franchise qui veulent des standards forts et un pilotage local.',
                heroEyebrow: 'Reseau Franchise',
                heroTitle: 'StockPro pour la gouvernance franchise.',
                heroSubtitle:
                    'Diffusez des standards communs a vos franchises avec une execution locale visible et tracable.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Le siege manque de controle en temps reel sur stock et facturation locale.',
                    'Les franchises utilisent des versions differentes de catalogue et prix.',
                    'Les controles de conformite sont manuels et difficiles a auditer.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Modeles centraux maitrises',
                        copy: 'Diffusez catalogues, tarifs et structures documentaires valides par le siege.',
                    },
                    {
                        title: 'Execution locale securisee',
                        copy: 'Laissez de l autonomie aux franchises avec limites et validations par role.',
                    },
                    {
                        title: 'Pilotage reseau consolide',
                        copy: 'Comparez activite, stock et qualite commerciale de chaque point de vente.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Publier les modeles commerciaux actualises depuis le siege.',
                    'Executer localement avec permissions controlees.',
                    'Analyser les KPI reseau et la conformite a chaque cycle.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '+32%', label: 'coherence tarifaire et facturation reseau' },
                    { value: '-27%', label: 'temps des controles de conformite manuels' },
                    { value: '+21%', label: 'visibilite sur la sante stock des points de vente' },
                ],
                quote: 'Les franchises restent autonomes et le siege garde une ligne de controle claire.',
                quoteAuthor: 'Meriem T.',
                quoteRole: 'Responsable developpement franchise',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience7',
        slug: 'accounting-experts',
        labelKey: 'header.audience.accountingExperts',
        menuLabelKey: 'header.audience.accountingExperts',
        image: accountingExpertsImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For accounting experts who need clean, auditable client operations data.',
                heroEyebrow: 'Accounting Experts',
                heroTitle: 'StockPro for accounting advisory teams.',
                heroSubtitle:
                    'Work with better source data from client operations and reduce reconciliation friction each month.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Client operational data arrives late or in inconsistent formats.',
                    'Supporting documents are scattered and hard to trace.',
                    'Month-end reconciliation absorbs too many advisory hours.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Traceable commercial flow',
                        copy: 'Keep full document history from quote, order, invoice, and payment events.',
                    },
                    {
                        title: 'Structured purchasing records',
                        copy: 'Capture supplier transactions with consistent categories and references.',
                    },
                    {
                        title: 'Audit-ready snapshots',
                        copy: 'Review stock valuation and transaction logs with clear period boundaries.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Collect client sales and purchasing data in one normalized stream.',
                    'Validate key controls before monthly closure.',
                    'Export reconciled reports with reliable transaction lineage.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '-35%', label: 'time spent on manual reconciliations' },
                    { value: '+29%', label: 'quality of operational source data' },
                    { value: '+18%', label: 'capacity for advisory-added value work' },
                ],
                quote: 'We spend less time fixing raw data and more time advising clients on decisions.',
                quoteAuthor: 'Rachid M.',
                quoteRole: 'Partner, accounting firm',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les experts-comptables qui veulent des donnees clients propres et auditables.',
                heroEyebrow: 'Experts Comptables',
                heroTitle: 'StockPro pour les cabinets comptables.',
                heroSubtitle:
                    'Travaillez sur des donnees operationnelles plus fiables et reduisez la friction de rapprochement mensuel.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Les donnees operationnelles clients arrivent tard ou dans des formats heterogenes.',
                    'Les justificatifs sont disperses et peu tracables.',
                    'La reconciliation de fin de mois consomme trop de temps.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Flux commercial tracable',
                        copy: 'Conservez un historique complet du devis jusqu au paiement.',
                    },
                    {
                        title: 'Achats structures',
                        copy: 'Enregistrez les transactions fournisseurs avec categories coherentes.',
                    },
                    {
                        title: 'Vue prete pour audit',
                        copy: 'Controlez valorisation de stock et journaux avec bornes de periode claires.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Centraliser ventes et achats client dans un flux normalise.',
                    'Verifier les controles cles avant cloture.',
                    'Exporter des rapports rapproches avec tracabilite fiable.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '-35%', label: 'temps de rapprochement manuel' },
                    { value: '+29%', label: 'qualite des donnees operationnelles source' },
                    { value: '+18%', label: 'capacite de missions conseil a valeur ajoutee' },
                ],
                quote: 'Nous passons moins de temps a corriger la data brute et plus de temps sur le conseil client.',
                quoteAuthor: 'Rachid M.',
                quoteRole: 'Associe, cabinet comptable',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
    {
        key: 'audience8',
        slug: 'independent-secretaries',
        labelKey: 'header.audience.independentSecretaries',
        menuLabelKey: 'header.audience.independentSecretaries',
        image: independentSecretariesImage,
        imageClassName: '',
        content: {
            en: {
                summary: 'For independent office managers supporting multiple client workflows.',
                heroEyebrow: 'Independent Secretaries',
                heroTitle: 'StockPro for independent admin professionals.',
                heroSubtitle:
                    'Handle multiple client back-offices with clear process templates, deadlines, and document traceability.',
                painsTitle: 'Common issues before StockPro',
                pains: [
                    'Each client has a different process and document naming logic.',
                    'Important deadlines are tracked manually in disconnected lists.',
                    'Status updates for clients require repetitive copy-paste work.',
                ],
                solutionsTitle: 'What changes with StockPro',
                solutions: [
                    {
                        title: 'Reusable admin templates',
                        copy: 'Standardize recurring tasks, document flows, and reminders per client type.',
                    },
                    {
                        title: 'Task and billing alignment',
                        copy: 'Connect completed admin actions directly to invoice-ready events.',
                    },
                    {
                        title: 'Clear client reporting',
                        copy: 'Share progress snapshots and outstanding actions in a consistent format.',
                    },
                ],
                workflowTitle: 'A practical day-to-day flow',
                workflow: [
                    'Instantiate a process template for each new client mission.',
                    'Track deadlines and completed actions from one dashboard.',
                    'Generate clear monthly summaries for each client account.',
                ],
                resultsTitle: 'Expected impact',
                results: [
                    { value: '-33%', label: 'time spent on repetitive admin steps' },
                    { value: '+27%', label: 'on-time completion of critical actions' },
                    { value: '+20%', label: 'client reporting clarity and trust' },
                ],
                quote: 'It lets me manage many clients without losing structure or quality.',
                quoteAuthor: 'Aicha S.',
                quoteRole: 'Independent administrative assistant',
                ctaPrimary: 'Start free trial',
                ctaSecondary: 'Create your account',
            },
            fr: {
                summary: 'Pour les secretaires independantes qui pilotent plusieurs clients en parallele.',
                heroEyebrow: 'Secretaires Independantes',
                heroTitle: 'StockPro pour les professionnelles admin independantes.',
                heroSubtitle:
                    'Gerez plusieurs back-offices clients avec modeles de process, echeances et documents parfaitement traces.',
                painsTitle: 'Problemes frequents avant StockPro',
                pains: [
                    'Chaque client impose un process et un classement different.',
                    'Les echeances sont suivies a la main dans des listes separees.',
                    'Les points d avancement demandent beaucoup de copier-coller.',
                ],
                solutionsTitle: 'Ce qui change avec StockPro',
                solutions: [
                    {
                        title: 'Modeles admin reutilisables',
                        copy: 'Standardisez les taches recurrentes et rappels par type de client.',
                    },
                    {
                        title: 'Taches reliees a la facturation',
                        copy: 'Transformez les actions terminees en evenements facturables clairement.',
                    },
                    {
                        title: 'Reporting client lisible',
                        copy: 'Partagez progression et actions restantes dans un format stable.',
                    },
                ],
                workflowTitle: 'Flux operationnel simple',
                workflow: [
                    'Creer un modele de process pour chaque mission client.',
                    'Suivre echeances et actions terminees dans un tableau unique.',
                    'Generer un resume mensuel clair pour chaque compte client.',
                ],
                resultsTitle: 'Impact attendu',
                results: [
                    { value: '-33%', label: 'temps sur taches administratives repetitives' },
                    { value: '+27%', label: 'actions critiques terminees dans les delais' },
                    { value: '+20%', label: 'clarte du reporting et confiance client' },
                ],
                quote: 'Je peux gerer plus de clients sans perdre la structure ni la qualite.',
                quoteAuthor: 'Aicha S.',
                quoteRole: 'Assistante administrative independante',
                ctaPrimary: 'Demarrer l essai',
                ctaSecondary: 'Creer un compte',
            },
        },
    },
];

export const getAudienceProfileBySlug = (slug) => {
    return audienceProfiles.find((profile) => profile.slug === slug) || null;
};

export const getAudienceProfileContent = (profile, language) => {
    if (!profile) {
        return null;
    }

    const locale = resolveAudienceLanguage(language);
    return profile.content[locale] || profile.content.en;
};

export const getAudienceLocale = resolveAudienceLanguage;
