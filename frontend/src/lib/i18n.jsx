import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'stockpro-language';

const translations = {
    en: {
        header: {
            nav: {
                audience: 'Who is it for?',
                features: 'Features',
                pricing: 'Pricing',
                more: 'More',
            },
            more: {
                about: 'Who are we?',
                contact: 'Contact us',
            },
            audience: {
                artisan: 'artisan',
                artisanUpper: 'Artisan',
                agencies: 'Agencies',
                startup: 'Start-Up',
                enterpriseServices: 'Service businesses',
                franchise: 'Franchise',
                accountingExperts: 'Accounting experts',
                independentSecretaries: 'Independent secretaries',
            },
            actions: {
                login: 'Login',
                startTrial: 'Start trial',
                home: 'Home',
                logout: 'Logout',
            },
            theme: {
                toLight: 'Switch to light mode',
                toDark: 'Switch to dark mode',
            },
            languageLabel: 'Language',
            languages: {
                en: 'English',
                fr: 'French',
                es: 'Spanish',
                ar: 'Arabic',
            },
        },
        landing: {
            hero: {
                title: 'Manage stock, sales, quotes, invoices, expenses, and purchases in one SaaS.',
                subtitle:
                    'Keep your inventory and commercial workflows aligned in real time, from quote creation to invoice follow-up and supplier buying cycles.',
                primaryCta: 'Get started',
                secondaryCta: 'Book demo',
            },
            socialProof: {
                eyebrow: 'Social proof',
                title: 'Trusted by teams managing complex stock operations.',
            },
            whyChoose: {
                title: 'Why choose StockPro?',
                subtitle: 'One clear platform for stock, sales, accounting and purchasing.',
                cardOneTitle: 'Save time on accounting tasks',
                cardOneCopyA: 'Automate invoicing, payments, purchasing flows and cash follow-up in one place.',
                cardOneCopyB: 'Connect your operational data and collaborate faster with your accountant.',
                cardOneHighlightStrong: 'Save up to 2 hours/week',
                cardOneHighlightRest: 'on administrative operations.',
                cardTwoTitle: 'Accelerate your sales pipeline',
                cardTwoCopyA: 'Manage contacts, leads and commercial actions from one online workspace.',
                cardTwoCopyB: 'Convert prospects to customers faster with better visibility on deals and follow-ups.',
                cardTwoHighlightStrong: 'Get paid faster',
                cardTwoHighlightRest: 'with streamlined quote-to-invoice flows.',
            },
            features: {
                eyebrow: 'Feature sections',
                title: 'Everything you need to run stock and sales at scale.',
            },
            stats: {
                warehouses: 'Warehouses connected',
                purchaseRules: 'Automated purchase rules',
                timeSaved: 'Average time saved / week',
                alerts: 'Live low-stock alerts',
            },
            testimonial: {
                quote:
                    '"StockPro gave us the same polished UX standards we see in top modern SaaS tools, and our warehouse team adopted it in under two weeks."',
                role: 'Operations Director, Atlas Distribution',
            },
            pricing: {
                eyebrow: 'CTA section',
                title: 'Launch StockPro with your team this week.',
                subtitle: '15-day trial, guided setup, and fast onboarding for ops and finance teams.',
                button: 'Start free trial',
            },
            featureCards: {
                smartCatalogTitle: 'Smart catalog control',
                smartCatalogCopy: 'Manage SKUs, variants and pricing rules from a single source of truth.',
                realtimeTitle: 'Real-time inventory',
                realtimeCopy: 'Every sale and purchase updates stock instantly across all locations.',
                purchaseTitle: 'Purchase automation',
                purchaseCopy: 'Generate supplier purchase orders from threshold and demand signals.',
                analyticsTitle: 'Operational analytics',
                analyticsCopy: 'Track margins, stock turns and top products with clear weekly trends.',
                workflowTitle: 'Approval workflows',
                workflowCopy: 'Control sensitive updates with role-based approvals and audit history.',
                invoiceTitle: 'Invoice-ready sales',
                invoiceCopy: 'Move from quote to invoice with fewer clicks and cleaner handoff.',
            },
        },
        auth: {
            login: {
                eyebrow: 'Login',
                title: 'Welcome to StockPro',
                subtitle: 'Sign in to manage your stock, orders, and suppliers.',
                email: 'Email',
                password: 'Password',
                submit: 'Sign in',
                submitting: 'Signing in...',
                forgot: 'Forgot password?',
                createAccount: 'Create account',
                success: 'Login successful. Redirecting...',
                invalidCredentials: 'Invalid credentials.',
            },
            createAccount: {
                eyebrow: 'Sign up',
                title: 'Create your account',
                subtitle: 'Get started in seconds.',
                fullName: 'Full name',
                email: 'Email',
                password: 'Password',
                confirmPassword: 'Confirm password',
                submit: 'Create my account',
                hasAccount: 'I already have an account',
                forgot: 'Forgot password?',
                success: 'Account created successfully. Redirecting...',
                passwordMin: 'Password must contain at least 6 characters.',
                passwordMismatch: 'Passwords do not match.',
                emailExists: 'This email already exists.',
            },
            forgotPassword: {
                eyebrow: 'Recovery',
                title: 'Forgot password',
                hint: 'Basic version: local reset by email.',
                email: 'Account email',
                newPassword: 'New password',
                confirmPassword: 'Confirm new password',
                submit: 'Reset password',
                backToLogin: 'Back to login',
                createAccount: 'Create account',
                success: 'Password updated. Redirecting...',
                passwordMin: 'Password must contain at least 6 characters.',
                passwordMismatch: 'Passwords do not match.',
                noAccount: 'No account found with this email.',
            },
            placeholders: {
                email: 'name@company.com',
                passwordDots: '••••••••',
                passwordMin: '6 characters minimum',
                fullName: 'Your full name',
                retypePassword: 'Type the password again',
            },
        },
        dashboard: {
            common: {
                account: 'Account',
                role: 'Role',
                greeting: 'Hello',
            },
            client: {
                eyebrow: 'Client dashboard',
                ordersTitle: 'My orders',
                ordersText: '12 active orders',
                deliveriesTitle: 'Deliveries',
                deliveriesText: '3 deliveries today',
                ticketsTitle: 'Support tickets',
                ticketsText: '2 open tickets',
            },
            admin: {
                eyebrow: 'Admin dashboard',
                usersTitle: 'Users',
                usersText: '154 active accounts',
                productsTitle: 'Products',
                productsText: '1,284 references in stock',
                alertsTitle: 'Critical alerts',
                alertsText: '7 products below threshold',
                revenueTitle: 'Monthly revenue',
                revenueText: '82,400 EUR this month',
            },
        },
    },
    fr: {
        header: {
            nav: {
                audience: 'Pour qui ?',
                features: 'Fonctionnalités',
                pricing: 'Trafis',
                more: 'Plus',
            },
            more: {
                about: 'Qui sommes-nous ?',
                contact: 'Contact us',
            },
            audience: {
                artisan: 'artisan',
                artisanUpper: 'Artisan',
                agencies: 'Agences',
                startup: 'Start-Up',
                enterpriseServices: 'Entreprise de services',
                franchise: 'Franchise',
                accountingExperts: 'Experts-comptables',
                independentSecretaries: 'Secrétaires indépendantes',
            },
            actions: {
                login: 'Connexion',
                startTrial: 'Essai gratuit',
                home: 'Accueil',
                logout: 'Déconnexion',
            },
            theme: {
                toLight: 'Passer en mode clair',
                toDark: 'Passer en mode sombre',
            },
            languageLabel: 'Langue',
            languages: {
                en: 'Anglais',
                fr: 'Français',
                es: 'Espagnol',
                ar: 'Arabe',
            },
        },
        landing: {
            hero: {
                title: 'Gérez stocks, ventes, devis, factures, dépenses et achats dans un seul SaaS.',
                subtitle:
                    'Alignez vos flux inventaire et commerciaux en temps réel, du devis à la facture et au suivi des achats fournisseurs.',
                primaryCta: 'Commencer',
                secondaryCta: 'Demander une démo',
            },
            socialProof: {
                eyebrow: 'Preuve sociale',
                title: 'Adopté par des équipes qui gèrent des opérations stock complexes.',
            },
            whyChoose: {
                title: 'Pourquoi choisir StockPro ?',
                subtitle: 'Une plateforme claire pour stocks, ventes, comptabilité et achats.',
                cardOneTitle: 'Pilotez devis, factures et trésorerie dans StockPro',
                cardOneCopyA: 'StockPro relie ventes, paiements, achats et mouvements de stock en temps réel.',
                cardOneCopyB: 'Chaque opération alimente automatiquement votre suivi financier et simplifie le travail avec votre comptable.',
                cardOneHighlightStrong: 'Moins de saisie manuelle',
                cardOneHighlightRest: 'et plus de contrôle sur vos marges.',
                cardTwoTitle: 'Convertissez plus vite avec un pipeline connecté au stock',
                cardTwoCopyA: 'Vos équipes suivent prospects, devis et relances depuis un seul espace StockPro.',
                cardTwoCopyB: 'Les commerciaux voient disponibilité produit, prix et historique client pour conclure au bon moment.',
                cardTwoHighlightStrong: 'Du lead à la facture',
                cardTwoHighlightRest: 'dans un flux unique et traçable.',
            },
            features: {
                eyebrow: 'Fonctionnalités',
                title: 'Tout ce qu il faut pour piloter stock et ventes à grande échelle.',
            },
            stats: {
                warehouses: 'Entrepôts connectés',
                purchaseRules: 'Règles d achat automatisées',
                timeSaved: 'Temps gagné moyen / semaine',
                alerts: 'Alertes stock bas en direct',
            },
            testimonial: {
                quote:
                    '"StockPro nous a apporté un niveau UX premium des meilleurs SaaS, et notre équipe logistique l a adopté en moins de deux semaines."',
                role: 'Directeur des opérations, Atlas Distribution',
            },
            pricing: {
                eyebrow: 'Section CTA',
                title: 'Lancez StockPro avec votre équipe cette semaine.',
                subtitle: '15 jours d essai, setup guidé et onboarding rapide pour ops et finance.',
                button: 'Démarrer l essai',
            },
            featureCards: {
                smartCatalogTitle: 'Contrôle catalogue intelligent',
                smartCatalogCopy: 'Gérez SKUs, variantes et règles de prix depuis une seule source fiable.',
                realtimeTitle: 'Inventaire temps réel',
                realtimeCopy: 'Chaque vente et achat met à jour le stock instantanément.',
                purchaseTitle: 'Achats automatisés',
                purchaseCopy: 'Générez les commandes fournisseurs depuis des seuils et signaux de demande.',
                analyticsTitle: 'Analytique opérationnelle',
                analyticsCopy: 'Suivez marges, rotations et top produits avec des tendances claires.',
                workflowTitle: 'Workflows d approbation',
                workflowCopy: 'Contrôlez les actions sensibles avec rôles et historique d audit.',
                invoiceTitle: 'Vente vers facture',
                invoiceCopy: 'Passez du devis à la facture avec moins de clics.',
            },
        },
        auth: {
            login: {
                eyebrow: 'Connexion',
                title: 'Bienvenue sur StockPro',
                subtitle: 'Connectez-vous pour piloter vos stocks, commandes et fournisseurs.',
                email: 'Email',
                password: 'Mot de passe',
                submit: 'Se connecter',
                submitting: 'Connexion...',
                forgot: 'Mot de passe oublié ?',
                createAccount: 'Créer un compte',
                success: 'Connexion réussie. Redirection...',
                invalidCredentials: 'Identifiants invalides.',
            },
            createAccount: {
                eyebrow: 'Inscription',
                title: 'Créer votre compte',
                subtitle: 'Commencez en quelques secondes.',
                fullName: 'Nom complet',
                email: 'Email',
                password: 'Mot de passe',
                confirmPassword: 'Confirmer mot de passe',
                submit: 'Créer mon compte',
                hasAccount: 'J ai déjà un compte',
                forgot: 'Mot de passe oublié ?',
                success: 'Compte créé avec succès. Redirection...',
                passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.',
                passwordMismatch: 'Les mots de passe ne correspondent pas.',
                emailExists: 'Cet email existe déjà.',
            },
            forgotPassword: {
                eyebrow: 'Récupération',
                title: 'Mot de passe oublié',
                hint: 'Version basique: réinitialisation locale via email.',
                email: 'Email du compte',
                newPassword: 'Nouveau mot de passe',
                confirmPassword: 'Confirmer nouveau mot de passe',
                submit: 'Réinitialiser',
                backToLogin: 'Retour connexion',
                createAccount: 'Créer un compte',
                success: 'Mot de passe mis à jour. Redirection...',
                passwordMin: 'Le mot de passe doit contenir au moins 6 caractères.',
                passwordMismatch: 'Les mots de passe ne correspondent pas.',
                noAccount: 'Aucun compte trouvé avec cet email.',
            },
            placeholders: {
                email: 'nom@entreprise.com',
                passwordDots: '••••••••',
                passwordMin: '6 caractères minimum',
                fullName: 'Votre nom',
                retypePassword: 'Retapez le mot de passe',
            },
        },
        dashboard: {
            common: {
                account: 'Compte',
                role: 'Rôle',
                greeting: 'Bonjour',
            },
            client: {
                eyebrow: 'Tableau client',
                ordersTitle: 'Mes commandes',
                ordersText: '12 commandes en cours',
                deliveriesTitle: 'Livraisons',
                deliveriesText: '3 livraisons aujourd hui',
                ticketsTitle: 'Tickets SAV',
                ticketsText: '2 tickets ouverts',
            },
            admin: {
                eyebrow: 'Tableau admin',
                usersTitle: 'Utilisateurs',
                usersText: '154 comptes actifs',
                productsTitle: 'Produits',
                productsText: '1 284 références en stock',
                alertsTitle: 'Alertes critiques',
                alertsText: '7 produits sous seuil',
                revenueTitle: 'Revenus mensuels',
                revenueText: '82 400 EUR ce mois',
            },
        },
    },
    es: {
        header: {
            nav: {
                audience: 'Para quién?',
                features: 'Funciones',
                pricing: 'Tarifas',
                more: 'Más',
            },
            more: {
                about: '¿Quiénes somos?',
                contact: 'Contáctanos',
            },
            audience: {
                artisan: 'artesano',
                artisanUpper: 'Artesano',
                agencies: 'Agencias',
                startup: 'Start-Up',
                enterpriseServices: 'Empresa de servicios',
                franchise: 'Franquicia',
                accountingExperts: 'Expertos contables',
                independentSecretaries: 'Secretarias independientes',
            },
            actions: {
                login: 'Iniciar sesion',
                startTrial: 'Prueba gratis',
                home: 'Inicio',
                logout: 'Cerrar sesion',
            },
            theme: {
                toLight: 'Cambiar a modo claro',
                toDark: 'Cambiar a modo oscuro',
            },
            languageLabel: 'Idioma',
            languages: {
                en: 'Ingles',
                fr: 'Frances',
                es: 'Espanol',
                ar: 'Arabe',
            },
        },
        landing: {
            hero: {
                title: 'Gestiona stock, ventas, presupuestos, facturas, gastos y compras en un solo SaaS.',
                subtitle:
                    'Mantiene inventario y operaciones comerciales alineadas en tiempo real, desde el presupuesto hasta la factura y las compras a proveedores.',
                primaryCta: 'Empezar',
                secondaryCta: 'Reservar demo',
            },
            socialProof: {
                eyebrow: 'Prueba social',
                title: 'Confiado por equipos que gestionan operaciones de stock complejas.',
            },
            whyChoose: {
                title: 'Por que elegir StockPro?',
                subtitle: 'Una plataforma clara para stock, ventas, contabilidad y compras.',
                cardOneTitle: 'Ahorra tiempo en contabilidad',
                cardOneCopyA: 'Automatiza facturacion, cobros, compras y control de caja en un solo lugar.',
                cardOneCopyB: 'Conecta tus datos operativos y colabora mejor con tu contable.',
                cardOneHighlightStrong: 'Ahorra hasta 2h/semana',
                cardOneHighlightRest: 'en tareas administrativas.',
                cardTwoTitle: 'Acelera tu embudo de ventas',
                cardTwoCopyA: 'Gestiona contactos, prospeccion y acciones comerciales desde un unico espacio online.',
                cardTwoCopyB: 'Convierte prospectos en clientes mas rapido con mejor visibilidad de seguimiento.',
                cardTwoHighlightStrong: 'Cobra mas rapido',
                cardTwoHighlightRest: 'con un flujo presupuesto-factura optimizado.',
            },
            features: {
                eyebrow: 'Funciones',
                title: 'Todo lo necesario para gestionar stock y ventas a escala.',
            },
            stats: {
                warehouses: 'Almacenes conectados',
                purchaseRules: 'Reglas de compra automatizadas',
                timeSaved: 'Tiempo promedio ahorrado / semana',
                alerts: 'Alertas de bajo stock en vivo',
            },
            testimonial: {
                quote:
                    '"StockPro nos dio un nivel UX premium como los mejores SaaS, y nuestro equipo de almacen lo adopto en menos de dos semanas."',
                role: 'Director de operaciones, Atlas Distribution',
            },
            pricing: {
                eyebrow: 'Seccion CTA',
                title: 'Lanza StockPro con tu equipo esta semana.',
                subtitle: 'Prueba de 15 dias, implementacion guiada y onboarding rapido para operaciones y finanzas.',
                button: 'Comenzar prueba',
            },
            featureCards: {
                smartCatalogTitle: 'Control inteligente del catalogo',
                smartCatalogCopy: 'Gestiona SKUs, variantes y reglas de precio desde una sola fuente.',
                realtimeTitle: 'Inventario en tiempo real',
                realtimeCopy: 'Cada venta y compra actualiza el stock al instante.',
                purchaseTitle: 'Compras automatizadas',
                purchaseCopy: 'Genera pedidos a proveedores segun umbrales y demanda.',
                analyticsTitle: 'Analitica operativa',
                analyticsCopy: 'Sigue margenes, rotacion y productos top con tendencias claras.',
                workflowTitle: 'Flujos de aprobacion',
                workflowCopy: 'Controla acciones sensibles con roles e historial de auditoria.',
                invoiceTitle: 'Ventas con facturacion',
                invoiceCopy: 'Pasa de presupuesto a factura con menos clics.',
            },
        },
        auth: {
            login: {
                eyebrow: 'Inicio de sesion',
                title: 'Bienvenido a StockPro',
                subtitle: 'Inicia sesion para gestionar stock, pedidos y proveedores.',
                email: 'Correo',
                password: 'Contrasena',
                submit: 'Entrar',
                submitting: 'Entrando...',
                forgot: 'Olvidaste tu contrasena?',
                createAccount: 'Crear cuenta',
                success: 'Inicio de sesion correcto. Redirigiendo...',
                invalidCredentials: 'Credenciales invalidas.',
            },
            createAccount: {
                eyebrow: 'Registro',
                title: 'Crea tu cuenta',
                subtitle: 'Empieza en segundos.',
                fullName: 'Nombre completo',
                email: 'Correo',
                password: 'Contrasena',
                confirmPassword: 'Confirmar contrasena',
                submit: 'Crear mi cuenta',
                hasAccount: 'Ya tengo una cuenta',
                forgot: 'Olvidaste tu contrasena?',
                success: 'Cuenta creada correctamente. Redirigiendo...',
                passwordMin: 'La contrasena debe tener al menos 6 caracteres.',
                passwordMismatch: 'Las contrasenas no coinciden.',
                emailExists: 'Este correo ya existe.',
            },
            forgotPassword: {
                eyebrow: 'Recuperacion',
                title: 'Olvide mi contrasena',
                hint: 'Version basica: restablecimiento local por correo.',
                email: 'Correo de la cuenta',
                newPassword: 'Nueva contrasena',
                confirmPassword: 'Confirmar nueva contrasena',
                submit: 'Restablecer',
                backToLogin: 'Volver a iniciar sesion',
                createAccount: 'Crear cuenta',
                success: 'Contrasena actualizada. Redirigiendo...',
                passwordMin: 'La contrasena debe tener al menos 6 caracteres.',
                passwordMismatch: 'Las contrasenas no coinciden.',
                noAccount: 'No se encontro cuenta con este correo.',
            },
            placeholders: {
                email: 'nombre@empresa.com',
                passwordDots: '••••••••',
                passwordMin: 'Minimo 6 caracteres',
                fullName: 'Tu nombre',
                retypePassword: 'Escribe de nuevo la contrasena',
            },
        },
        dashboard: {
            common: {
                account: 'Cuenta',
                role: 'Rol',
                greeting: 'Hola',
            },
            client: {
                eyebrow: 'Panel cliente',
                ordersTitle: 'Mis pedidos',
                ordersText: '12 pedidos activos',
                deliveriesTitle: 'Entregas',
                deliveriesText: '3 entregas hoy',
                ticketsTitle: 'Tickets de soporte',
                ticketsText: '2 tickets abiertos',
            },
            admin: {
                eyebrow: 'Panel admin',
                usersTitle: 'Usuarios',
                usersText: '154 cuentas activas',
                productsTitle: 'Productos',
                productsText: '1,284 referencias en stock',
                alertsTitle: 'Alertas criticas',
                alertsText: '7 productos bajo umbral',
                revenueTitle: 'Ingresos mensuales',
                revenueText: '82,400 EUR este mes',
            },
        },
    },
    ar: {
        header: {
            nav: {
                audience: 'لمن؟',
                features: 'المزايا',
                pricing: 'الاسعار',
                more: 'المزيد',
            },
            more: {
                about: 'من نحن؟',
                contact: 'اتصل بنا',
            },
            audience: {
                artisan: 'حرفي',
                artisanUpper: 'حرفي',
                agencies: 'وكالات',
                startup: 'شركة ناشئة',
                enterpriseServices: 'شركة خدمات',
                franchise: 'امتياز',
                accountingExperts: 'خبراء محاسبة',
                independentSecretaries: 'سكرتيرات مستقلات',
            },
            actions: {
                login: 'تسجيل الدخول',
                startTrial: 'تجربة مجانية',
                home: 'الرئيسية',
                logout: 'تسجيل الخروج',
            },
            theme: {
                toLight: 'التبديل الى الوضع الفاتح',
                toDark: 'التبديل الى الوضع الداكن',
            },
            languageLabel: 'اللغة',
            languages: {
                en: 'الانجليزية',
                fr: 'الفرنسية',
                es: 'الاسبانية',
                ar: 'العربية',
            },
        },
        landing: {
            hero: {
                title: 'ادارة المخزون والمبيعات وعروض السعر والفواتير والمصاريف والمشتريات في منصة SaaS واحدة.',
                subtitle:
                    'حافظ على تزامن المخزون والعمليات التجارية في الوقت الحقيقي من عرض السعر حتى الفاتورة ومشتريات الموردين.',
                primaryCta: 'ابدأ الان',
                secondaryCta: 'احجز عرضا',
            },
            socialProof: {
                eyebrow: 'دليل الثقة',
                title: 'موثوق من فرق تدير عمليات مخزون معقدة.',
            },
            whyChoose: {
                title: 'لماذا تختار StockPro؟',
                subtitle: 'منصة واحدة واضحة للمخزون والمبيعات والمحاسبة والمشتريات.',
                cardOneTitle: 'وفر وقتا في المحاسبة',
                cardOneCopyA: 'اتمتة الفوترة والمدفوعات والمشتريات ومتابعة السيولة من مكان واحد.',
                cardOneCopyB: 'اربط بيانات التشغيل وتعاون بشكل اسرع مع المحاسب.',
                cardOneHighlightStrong: 'وفر حتى ساعتين اسبوعيا',
                cardOneHighlightRest: 'في المهام الادارية.',
                cardTwoTitle: 'سرع دورة المبيعات',
                cardTwoCopyA: 'ادارة جهات الاتصال والمتابعة التجارية من مساحة عمل واحدة عبر الانترنت.',
                cardTwoCopyB: 'حول العملاء المحتملين الى عملاء فعليين بسرعة مع متابعة اوضح.',
                cardTwoHighlightStrong: 'احصل على التحصيل اسرع',
                cardTwoHighlightRest: 'من خلال مسار عرض سعر الى فاتورة مبسط.',
            },
            features: {
                eyebrow: 'المزايا',
                title: 'كل ما تحتاجه لادارة المخزون والمبيعات على نطاق واسع.',
            },
            stats: {
                warehouses: 'المستودعات المتصلة',
                purchaseRules: 'قواعد الشراء المؤتمتة',
                timeSaved: 'متوسط الوقت الموفر / اسبوع',
                alerts: 'تنبيهات انخفاض المخزون المباشرة',
            },
            testimonial: {
                quote:
                    '"منحتنا StockPro تجربة احترافية مثل افضل حلول SaaS، واعتمدها فريق المستودع لدينا خلال اقل من اسبوعين."',
                role: 'مدير العمليات، Atlas Distribution',
            },
            pricing: {
                eyebrow: 'دعوة لاتخاذ اجراء',
                title: 'اطلق StockPro مع فريقك هذا الاسبوع.',
                subtitle: 'تجربة 15 يوما مع اعداد موجه وتأهيل سريع لفرق العمليات والمالية.',
                button: 'ابدأ التجربة',
            },
            featureCards: {
                smartCatalogTitle: 'تحكم ذكي بالكتالوج',
                smartCatalogCopy: 'ادارة الاصناف والمتغيرات وقواعد التسعير من مصدر واحد.',
                realtimeTitle: 'مخزون لحظي',
                realtimeCopy: 'كل عملية بيع او شراء تحدث المخزون فورا.',
                purchaseTitle: 'مشتريات مؤتمتة',
                purchaseCopy: 'انشاء طلبات الموردين وفقا للحدود الدنيا والطلب.',
                analyticsTitle: 'تحليلات تشغيلية',
                analyticsCopy: 'تتبع الهوامش ودوران المخزون وافضل المنتجات بوضوح.',
                workflowTitle: 'مسارات اعتماد',
                workflowCopy: 'تحكم في الاجراءات الحساسة عبر الصلاحيات وسجل التدقيق.',
                invoiceTitle: 'مبيعات مع فوترة',
                invoiceCopy: 'انتقل من عرض السعر الى الفاتورة بعدد نقرات اقل.',
            },
        },
        auth: {
            login: {
                eyebrow: 'تسجيل الدخول',
                title: 'مرحبا بك في StockPro',
                subtitle: 'سجل الدخول لادارة المخزون والطلبات والموردين.',
                email: 'البريد الالكتروني',
                password: 'كلمة المرور',
                submit: 'دخول',
                submitting: 'جار تسجيل الدخول...',
                forgot: 'هل نسيت كلمة المرور؟',
                createAccount: 'انشاء حساب',
                success: 'تم تسجيل الدخول بنجاح. جار التحويل...',
                invalidCredentials: 'بيانات الدخول غير صحيحة.',
            },
            createAccount: {
                eyebrow: 'انشاء حساب',
                title: 'انشئ حسابك',
                subtitle: 'ابدأ خلال ثوان.',
                fullName: 'الاسم الكامل',
                email: 'البريد الالكتروني',
                password: 'كلمة المرور',
                confirmPassword: 'تأكيد كلمة المرور',
                submit: 'انشاء الحساب',
                hasAccount: 'لدي حساب بالفعل',
                forgot: 'هل نسيت كلمة المرور؟',
                success: 'تم انشاء الحساب بنجاح. جار التحويل...',
                passwordMin: 'يجب ان تحتوي كلمة المرور على 6 احرف على الاقل.',
                passwordMismatch: 'كلمتا المرور غير متطابقتين.',
                emailExists: 'هذا البريد موجود بالفعل.',
            },
            forgotPassword: {
                eyebrow: 'استرجاع',
                title: 'نسيت كلمة المرور',
                hint: 'نسخة بسيطة: اعادة تعيين محلية عبر البريد.',
                email: 'بريد الحساب',
                newPassword: 'كلمة المرور الجديدة',
                confirmPassword: 'تأكيد كلمة المرور الجديدة',
                submit: 'اعادة التعيين',
                backToLogin: 'العودة لتسجيل الدخول',
                createAccount: 'انشاء حساب',
                success: 'تم تحديث كلمة المرور. جار التحويل...',
                passwordMin: 'يجب ان تحتوي كلمة المرور على 6 احرف على الاقل.',
                passwordMismatch: 'كلمتا المرور غير متطابقتين.',
                noAccount: 'لا يوجد حساب بهذا البريد.',
            },
            placeholders: {
                email: 'name@company.com',
                passwordDots: '••••••••',
                passwordMin: '6 احرف على الاقل',
                fullName: 'اسمك الكامل',
                retypePassword: 'اكتب كلمة المرور مرة اخرى',
            },
        },
        dashboard: {
            common: {
                account: 'الحساب',
                role: 'الدور',
                greeting: 'مرحبا',
            },
            client: {
                eyebrow: 'لوحة العميل',
                ordersTitle: 'طلباتي',
                ordersText: '12 طلبا نشطا',
                deliveriesTitle: 'عمليات التسليم',
                deliveriesText: '3 عمليات تسليم اليوم',
                ticketsTitle: 'تذاكر الدعم',
                ticketsText: '2 تذكرتان مفتوحتان',
            },
            admin: {
                eyebrow: 'لوحة المدير',
                usersTitle: 'المستخدمون',
                usersText: '154 حسابا نشطا',
                productsTitle: 'المنتجات',
                productsText: '1,284 مرجعا في المخزون',
                alertsTitle: 'تنبيهات حرجة',
                alertsText: '7 منتجات تحت الحد الادنى',
                revenueTitle: 'ايراد شهري',
                revenueText: '82,400 يورو هذا الشهر',
            },
        },
    },
};

const LanguageContext = createContext(null);

const getByPath = (object, path) => {
    return path.split('.').reduce((value, segment) => {
        if (value && typeof value === 'object' && segment in value) {
            return value[segment];
        }

        return undefined;
    }, object);
};

const getInitialLanguage = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    const savedLanguage = localStorage.getItem(STORAGE_KEY);
    if (savedLanguage && savedLanguage in translations) {
        return savedLanguage;
    }

    return DEFAULT_LANGUAGE;
};

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(getInitialLanguage);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    }, [language]);

    const value = useMemo(() => {
        const dictionary = translations[language] || translations[DEFAULT_LANGUAGE];

        const t = (path) => {
            const fromSelectedLanguage = getByPath(dictionary, path);
            if (fromSelectedLanguage !== undefined) {
                return fromSelectedLanguage;
            }

            const fromFallback = getByPath(translations[DEFAULT_LANGUAGE], path);
            return fromFallback !== undefined ? fromFallback : path;
        };

        return {
            language,
            setLanguage,
            t,
            availableLanguages: ['en', 'fr', 'es', 'ar'],
        };
    }, [language]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }

    return context;
}
