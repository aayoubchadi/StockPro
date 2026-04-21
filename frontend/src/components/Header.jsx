import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../lib/authStore';
import { logoutRequest } from '../services/authApi';
import blackLogo from '../assets/images/black-v.png';
import whiteLogo from '../assets/images/white-v.png';
import englishFlag from '../assets/images/english.png';
import frenchFlag from '../assets/images/french.svg';
import arabicFlag from '../assets/images/arabic.png';
import spanishFlag from '../assets/images/spanish.png';
import { useLanguage } from '../lib/i18n';
import { audienceProfiles } from '../lib/audienceProfiles';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = localStorage.getItem('stockpro-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function Header({ showNav = true, isDashboard = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [theme, setTheme] = useState(getInitialTheme);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isAudienceMenuOpen, setIsAudienceMenuOpen] = useState(false);
  const [isAudienceMenuClosing, setIsAudienceMenuClosing] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMoreMenuClosing, setIsMoreMenuClosing] = useState(false);
  const headerRef = useRef(null);
  const languageMenuRef = useRef(null);
  const audienceMenuRef = useRef(null);
  const moreMenuRef = useRef(null);
  const audienceCloseTimerRef = useRef(null);
  const moreCloseTimerRef = useRef(null);
  const scrollAnimationFrameRef = useRef(null);
  const { language, setLanguage, t, availableLanguages } = useLanguage();
  const dropdownAnimationDurationMs = 260;

  const cancelScrollAnimation = () => {
    if (scrollAnimationFrameRef.current) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  };

  const animateScrollToHash = (hash) => {
    if (typeof window === 'undefined' || !hash?.startsWith('#')) {
      return;
    }

    const target = document.querySelector(hash);
    if (!target) {
      return;
    }

    cancelScrollAnimation();

    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
    const offset = headerHeight + 14;
    const startY = window.scrollY;
    const endY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    const delta = endY - startY;

    if (Math.abs(delta) < 2) {
      return;
    }

    const durationMs = 920;
    let startTs;
    const easeOutQuint = (progress) => 1 - ((1 - progress) ** 5);

    const step = (timestamp) => {
      if (startTs === undefined) {
        startTs = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTs) / durationMs);
      window.scrollTo(0, startY + (delta * easeOutQuint(progress)));

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
      } else {
        scrollAnimationFrameRef.current = null;
      }
    };

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
  };

  const clearAudienceCloseTimer = () => {
    if (audienceCloseTimerRef.current) {
      clearTimeout(audienceCloseTimerRef.current);
      audienceCloseTimerRef.current = null;
    }
  };

  const clearMoreCloseTimer = () => {
    if (moreCloseTimerRef.current) {
      clearTimeout(moreCloseTimerRef.current);
      moreCloseTimerRef.current = null;
    }
  };

  const audienceItems = audienceProfiles.map((profile) => ({
    key: profile.key,
    label: t(profile.menuLabelKey || profile.labelKey),
    image: profile.image,
    imageClassName: profile.imageClassName,
    path: `/who-is-it-for/${profile.slug}`,
  }));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stockpro-theme', theme);
  }, [theme]);

  useEffect(() => {
    clearAudienceCloseTimer();
    clearMoreCloseTimer();
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsAudienceMenuOpen(false);
    setIsAudienceMenuClosing(false);
    setIsMoreMenuOpen(false);
    setIsMoreMenuClosing(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        clearAudienceCloseTimer();
        clearMoreCloseTimer();
        setIsMobileMenuOpen(false);
        setIsLanguageMenuOpen(false);
        setIsAudienceMenuOpen(false);
        setIsAudienceMenuClosing(false);
        setIsMoreMenuOpen(false);
        setIsMoreMenuClosing(false);
        return;
      }

      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        clearAudienceCloseTimer();
        clearMoreCloseTimer();
        setIsMobileMenuOpen(false);
        setIsLanguageMenuOpen(false);
        setIsAudienceMenuOpen(false);
        setIsAudienceMenuClosing(false);
        setIsMoreMenuOpen(false);
        setIsMoreMenuClosing(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      cancelScrollAnimation();
      clearAudienceCloseTimer();
      clearMoreCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const timer = window.setTimeout(() => {
        animateScrollToHash(location.hash);
      }, 90);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [location.pathname, location.hash]);

  const handleLogout = async () => {
    try {
      await logoutRequest({
        accessToken: session?.accessToken,
        refreshToken: session?.refreshToken,
      });
    } finally {
      clearSession();
      navigate('/login');
    }
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const closeMenus = () => {
    clearAudienceCloseTimer();
    clearMoreCloseTimer();
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsAudienceMenuOpen(false);
    setIsAudienceMenuClosing(false);
    setIsMoreMenuOpen(false);
    setIsMoreMenuClosing(false);
  };

  const closeAudienceMenu = (withAnimation = false) => {
    clearAudienceCloseTimer();

    if (!withAnimation || !isAudienceMenuOpen) {
      setIsAudienceMenuOpen(false);
      setIsAudienceMenuClosing(false);
      return;
    }

    setIsAudienceMenuClosing(true);
    audienceCloseTimerRef.current = window.setTimeout(() => {
      setIsAudienceMenuOpen(false);
      setIsAudienceMenuClosing(false);
      audienceCloseTimerRef.current = null;
    }, dropdownAnimationDurationMs);
  };

  const closeMoreMenu = (withAnimation = false) => {
    clearMoreCloseTimer();

    if (!withAnimation || !isMoreMenuOpen) {
      setIsMoreMenuOpen(false);
      setIsMoreMenuClosing(false);
      return;
    }

    setIsMoreMenuClosing(true);
    moreCloseTimerRef.current = window.setTimeout(() => {
      setIsMoreMenuOpen(false);
      setIsMoreMenuClosing(false);
      moreCloseTimerRef.current = null;
    }, dropdownAnimationDurationMs);
  };

  const toggleAudienceMenu = () => {
    if (isAudienceMenuOpen && !isAudienceMenuClosing) {
      closeAudienceMenu(true);
      return;
    }

    clearAudienceCloseTimer();
    setIsAudienceMenuClosing(false);
    setIsAudienceMenuOpen(true);
    closeMoreMenu(false);
  };

  const toggleMoreMenu = () => {
    if (isMoreMenuOpen && !isMoreMenuClosing) {
      closeMoreMenu(true);
      return;
    }

    clearMoreCloseTimer();
    setIsMoreMenuClosing(false);
    setIsMoreMenuOpen(true);
    closeAudienceMenu(false);
  };

  const handleNavClick = (event) => {
    const href = event?.currentTarget?.getAttribute('href') || '';

    if (href.startsWith('#')) {
      event.preventDefault();
      closeMenus();

      if (location.pathname !== '/') {
        navigate(`/${href}`);
        return;
      }

      if (window.location.hash !== href) {
        window.history.replaceState(null, '', href);
      }

      animateScrollToHash(href);
      return;
    }

    closeMenus();
  };

  const handleAudienceItemClick = (path) => {
    closeMenus();
    navigate(path);
  };

  const showLandingNavigation = showNav && !isDashboard;
  const isCompactHeader = !showLandingNavigation && !isDashboard;
  const logoSrc = theme === 'dark' ? whiteLogo : blackLogo;
  const nextThemeLabel = theme === 'dark' ? t('header.theme.toLight') : t('header.theme.toDark');
  const languageFlags = {
    en: englishFlag,
    fr: frenchFlag,
    es: spanishFlag,
    ar: arabicFlag,
  };
  const activeFlag = languageFlags[language];

  const handleLogoClick = (event) => {
    closeMenus();

    if (location.pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  return (
    <header className={`site-header${showLandingNavigation && isMobileMenuOpen ? ' is-mobile-open' : ''}${isCompactHeader ? ' is-compact' : ''}`} ref={headerRef}>
      <Link to="/" className="brand" onClick={handleLogoClick}>
        <img src={logoSrc} alt="StockPro" className="site-logo" />
      </Link>

      {showLandingNavigation && (
        <div className="header-top-controls">
          <button
            className="btn btn-ghost theme-toggle mobile-theme-toggle"
            type="button"
            onClick={handleThemeToggle}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            {theme === 'dark' ? (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.8V5.2M12 18.8V21.2M2.8 12H5.2M18.8 12H21.2M5.45 5.45L7.15 7.15M16.85 16.85L18.55 18.55M5.45 18.55L7.15 16.85M16.85 7.15L18.55 5.45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M14.5 2.5A9.5 9.5 0 1 0 21.5 16 7.5 7.5 0 1 1 14.5 2.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            className={`btn btn-ghost theme-toggle mobile-menu-toggle${isMobileMenuOpen ? ' is-open' : ''}`}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            {isMobileMenuOpen ? (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M4 7.5H20M4 12H20M4 16.5H20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      <div className={`header-content${showLandingNavigation ? ' has-nav' : ''}${!showLandingNavigation && !isDashboard ? ' no-nav' : ''}`}>
        {showLandingNavigation && (
          <nav className="nav-links">
            <div className="audience-menu" ref={audienceMenuRef}>
              <button
                type="button"
                className="audience-trigger"
                aria-haspopup="menu"
                aria-expanded={isAudienceMenuOpen && !isAudienceMenuClosing}
                onClick={toggleAudienceMenu}
              >
                <span>{t('header.nav.audience')}</span>
                <svg className="language-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {(isAudienceMenuOpen || isAudienceMenuClosing) && (
                <div className={`audience-dropdown${isAudienceMenuClosing ? ' is-closing' : ' is-open'}`} role="menu" aria-label={t('header.nav.audience')}>
                  {audienceItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="audience-item"
                      role="menuitem"
                      onClick={() => handleAudienceItemClick(item.path)}
                    >
                      <img
                        src={item.image}
                        alt={item.label}
                        className={`audience-item-image${item.imageClassName ? ` ${item.imageClassName}` : ''}`}
                      />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="#features" onClick={handleNavClick}>{t('header.nav.features')}</a>
            <a href="#pricing" onClick={handleNavClick}>{t('header.nav.pricing')}</a>
            <div className="more-menu" ref={moreMenuRef}>
              <button
                type="button"
                className="more-trigger"
                aria-haspopup="menu"
                aria-expanded={isMoreMenuOpen && !isMoreMenuClosing}
                onClick={toggleMoreMenu}
              >
                <span>{t('header.nav.more')}</span>
                <svg className="language-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {(isMoreMenuOpen || isMoreMenuClosing) && (
                <div className={`more-dropdown${isMoreMenuClosing ? ' is-closing' : ' is-open'}`} role="menu" aria-label={t('header.nav.more')}>
                  <Link
                    to="/who-we-are"
                    className="more-option"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    {t('header.more.about')}
                  </Link>
                  <Link
                    to="/contact-us"
                    className="more-option"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    {t('header.more.contact')}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}

        <div className="header-actions">
          <div className="language-picker" ref={languageMenuRef}>
            <button
              type="button"
              className="language-trigger"
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
              aria-label={t('header.languageLabel')}
              onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
            >
              {activeFlag ? (
                <img className="language-flag" src={activeFlag} alt="" aria-hidden="true" />
              ) : (
                <span className="language-flag-fallback" aria-hidden="true">•</span>
              )}
              <span>{t(`header.languages.${language}`)}</span>
              <svg className="language-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {isLanguageMenuOpen && (
              <div className="language-menu" role="menu" aria-label={t('header.languageLabel')}>
                {availableLanguages.map((langCode) => {
                  const isActive = langCode === language;
                  const flagSrc = languageFlags[langCode];
                  return (
                    <button
                      key={langCode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      className={`language-option${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setLanguage(langCode);
                        setIsLanguageMenuOpen(false);
                      }}
                    >
                      {flagSrc ? (
                        <img className="language-flag" src={flagSrc} alt="" aria-hidden="true" />
                      ) : (
                        <span className="language-flag-fallback" aria-hidden="true">•</span>
                      )}
                      {t(`header.languages.${langCode}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost theme-toggle"
            type="button"
            onClick={handleThemeToggle}
            aria-label={nextThemeLabel}
            title={nextThemeLabel}
          >
            {theme === 'dark' ? (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.8V5.2M12 18.8V21.2M2.8 12H5.2M18.8 12H21.2M5.45 5.45L7.15 7.15M16.85 16.85L18.55 18.55M5.45 18.55L7.15 16.85M16.85 7.15L18.55 5.45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M14.5 2.5A9.5 9.5 0 1 0 21.5 16 7.5 7.5 0 1 1 14.5 2.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          {isDashboard ? (
            <>
              <Link to="/" className="btn btn-ghost" onClick={handleNavClick}>{t('header.actions.home')}</Link>
              <button onClick={handleLogout} className="btn btn-secondary" type="button">
                {t('header.actions.logout')}
              </button>
            </>
          ) : (
            showLandingNavigation && (
              <>
                <Link to="/login" className="btn btn-ghost" onClick={handleNavClick}>{t('header.actions.login')}</Link>
                <a href="#pricing" className="btn btn-secondary" onClick={handleNavClick}>{t('header.actions.startTrial')}</a>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
