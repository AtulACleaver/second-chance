import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  ArrowRight, ArrowLeft, Search, ExternalLink, MapPin, Link as LinkIcon,
  RefreshCw, FileText, CircleCheck, CalendarDays, UserRound, Layers3,
  MessageCircle, ChevronDown, ChevronUp, Quote, ShieldCheck, Zap, Menu, X, BookOpen,
  Copy, Check, Info, AlertTriangle, Sparkles, Building2, HelpCircle, CheckSquare,
  Square, Download, Share2, Eye, ShieldAlert, SlidersHorizontal, CornerDownRight,
  WifiOff, Clock, Mail, Lock, Inbox
} from 'lucide-react';
import {
  searchSchools, conductResearch, checkHealth,
  getOperatorStatus, createOperatorDraft, getOperatorThreads, getOperatorThreadMessages
} from './api';
import './style.css';

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================
const ToastContext = React.createContext({ addToast: () => {} });

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item ${t.type}`}>
            {t.type === 'success' ? <Check size={16} /> : <Info size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  return React.useContext(ToastContext);
}

// ============================================================================
// COUNT-UP ANIMATION HOOK
// ============================================================================
function useCountUp(targetNumber, duration = 750) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = typeof targetNumber === 'number' ? targetNumber : parseInt(targetNumber, 10);
    if (isNaN(end) || end <= 0) {
      setCount(targetNumber);
      return;
    }
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const currentCount = Math.round(end * (1 - Math.pow(1 - progress, 3)));
      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(counter);
      } else {
        setCount(currentCount);
      }
    }, frameDuration);

    return () => clearInterval(counter);
  }, [targetNumber, duration]);

  return count;
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================
function Tooltip({ text, children }) {
  return (
    <span className="tooltip-wrap" tabIndex={0} role="tooltip">
      {children}
      <span className="tooltip-box">{text}</span>
    </span>
  );
}

// ============================================================================
// BRAND & NAVIGATION
// ============================================================================
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <BookOpen size={20} strokeWidth={2.4} />
      </span>
      <span>Second Chance</span>
    </div>
  );
}

function Nav({ onHome, onExplore, onNavigateSection, onOpenOperator, active = 'home' }) {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSection = (secId) => {
    setMenu(false);
    if (onNavigateSection) {
      onNavigateSection(secId);
    }
  };

  return (
    <>
      <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <button className="logo-button" onClick={onHome} aria-label="Go to home page">
            <Logo />
          </button>
          
          <nav className="nav-links" aria-label="Main Navigation">
            <button
              className={`nav-link-item ${active === 'home' ? 'active' : ''}`}
              onClick={onHome}
            >
              Home
              {active === 'home' && <span className="nav-active-pill" />}
            </button>
            <button
              className={`nav-link-item ${active === 'explore' ? 'active' : ''}`}
              onClick={onExplore}
            >
              Explore Universities
              {active === 'explore' && <span className="nav-active-pill" />}
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => handleSection('how')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => handleSection('inquiry')}
            >
              Inquiry Flow
            </button>
            <button
              type="button"
              className="nav-link-item"
              onClick={() => handleSection('trust')}
            >
              Why Trust Us
            </button>
          </nav>

          <div className="nav-actions">
            <button
              className="icon-btn tooltip-wrap"
              aria-label="Search universities"
              onClick={onExplore}
            >
              <Search size={18} />
              <span className="tooltip-box">Search Universities</span>
            </button>
            <button className="btn btn-primary btn-md" onClick={onExplore}>
              New Research
            </button>
            <button
              className="mobile-menu-btn"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle mobile menu"
              aria-expanded={menu}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-nav-drawer ${menu ? 'open' : ''}`}>
        <button
          className="btn btn-secondary btn-md"
          onClick={() => { setMenu(false); onHome(); }}
        >
          Home
        </button>
        <button
          className="btn btn-primary btn-md"
          onClick={() => { setMenu(false); onExplore(); }}
        >
          Explore Universities
        </button>
        <button
          className="btn btn-ghost btn-md"
          onClick={() => handleSection('how')}
        >
          How It Works
        </button>
        <button
          className="btn btn-ghost btn-md"
          onClick={() => handleSection('inquiry')}
        >
          Inquiry Flow
        </button>
        <button
          className="btn btn-ghost btn-md"
          onClick={() => handleSection('trust')}
        >
          Why Trust Us
        </button>
      </div>
    </>
  );
}

// ============================================================================
// INTERACTIVE 3D TILT PRODUCT PREVIEW (MOCKUP)
// ============================================================================
function ProductPreview({ onOpen }) {
  const shellRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    shellRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    if (!shellRef.current) return;
    shellRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div className="mockup-wrapper" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="mockup-gradient-shell" ref={shellRef}>
        <div className="preview-window-modern">
          <aside className="preview-sidebar">
            <Logo />
            <div className="side-tab active"><Search size={14} /> Research</div>
            <div className="side-tab"><CalendarDays size={14} /> History</div>
            <div className="side-tab"><ShieldCheck size={14} /> Official Sources</div>
          </aside>
          
          <div className="preview-main-body">
            <div className="preview-crumb">Illustrative Example <span>›</span> Cornell University <span>›</span> Financial Aid</div>
            <div className="preview-title-bar">
              <div>
                <h3>Cornell University</h3>
                <div className="preview-meta-line">
                  <MapPin size={12} /> Ithaca, New York <span>·</span>
                  <LinkIcon size={12} /> cornell.edu
                </div>
              </div>
              <Tooltip text="Illustrative example demonstrating how research results appear">
                <span className="badge badge-scope">
                  Illustrative Example
                </span>
              </Tooltip>
            </div>

            <div className="preview-stats-grid">
              <div className="preview-box summary">
                <h4>Sample findings</h4>
                <p>
                  Official pages confirm Cornell meets <mark className="highlighter">100% of demonstrated need</mark> for all admitted international undergraduates.
                </p>
              </div>
              <div className="preview-box preview-stat-card">
                <FileText />
                <strong>3</strong>
                <span>Source passages</span>
              </div>
              <div className="preview-box preview-stat-card">
                <CircleCheck />
                <strong>1 Reviewed</strong>
                <span>By our team</span>
              </div>
              <div className="preview-box preview-stat-card">
                <CalendarDays />
                <strong>Nov 22, 2026</strong>
                <span>Checked on</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE 1: LANDING PAGE
// ============================================================================
function Home({ onExplore, onNavigateSection, onOpenOperator }) {
  const headlineWords = [
    'Your', 'university', 'journey', 'deserves', 'more'
  ];

  return (
    <>
      <Nav
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExplore={onExplore}
        onNavigateSection={onNavigateSection}
        onOpenOperator={onOpenOperator}
        active="home"
      />
      
      <main id="main">
        {/* Hero Section */}
        <section className="hero-wrap">
          <div className="hero-bg-shape-1" aria-hidden="true" />
          <div className="hero-bg-shape-2" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-eyebrow">
              <Sparkles size={14} /> Financial-Aid Research for International Students
            </div>

            <h1 className="hero-title">
              {headlineWords.map((word, i) => (
                <span
                  key={i}
                  className="hero-word-reveal"
                  style={{ animationDelay: `${i * 90}ms`, marginRight: '0.28em' }}
                >
                  {word}
                </span>
              ))}
              <span
                className="clarity-highlight hero-word-reveal"
                style={{ animationDelay: `${headlineWords.length * 90}ms` }}
              >
                clarity.
                <span
                  className="clarity-underline"
                  style={{ animationDelay: `${(headlineWords.length + 1) * 90 + 150}ms` }}
                />
              </span>
            </h1>

            <p className="hero-sub">
              Explore official university policies, understand important fine-print conditions,
              and discover the exact questions to ask before you submit your application.
            </p>

            <div className="hero-cta-group">
              <button className="btn btn-primary btn-lg" onClick={onExplore}>
                Explore Universities <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => onNavigateSection('how')}
              >
                How It Works
              </button>
            </div>

            {/* Trust Chips */}
            <div className="trust-chips-row">
              <div className="trust-chip">
                <FileText size={16} /> Official sources only
              </div>
              <div className="trust-chip">
                <ShieldCheck size={16} /> Direct source citations
              </div>
              <div className="trust-chip">
                <Mail size={16} /> Agentboxd inquiry drafting
              </div>
            </div>

            {/* Interactive 3D Mockup */}
            <ProductPreview onOpen={onExplore} />
          </div>
        </section>

        {/* Section 1: 3-Step Timeline ("How It Works") */}
        <section className="timeline-section" id="how">
          <div className="section-header-center">
            <div className="section-eyebrow">HOW IT WORKS</div>
            <h2 className="section-heading-lg">Clarity at every step of your research.</h2>
          </div>

          <div className="timeline-grid">
            <article className="timeline-card">
              <div className="timeline-badge">01</div>
              <h3>Search a university</h3>
              <p>
                Find your institution in the official US university directory and verify its domain boundaries before exploring.
              </p>
            </article>

            <article className="timeline-card">
              <div className="timeline-badge">02</div>
              <h3>Review source-linked evidence</h3>
              <p>
                Read exact quotations extracted directly from official financial-aid pages, complete with review status and scope.
              </p>
            </article>

            <article className="timeline-card">
              <div className="timeline-badge">03</div>
              <h3>Ask the right questions</h3>
              <p>
                Get curated, contextual questions formatted specifically for your applicant type to ask the financial-aid office.
              </p>
            </article>
          </div>
        </section>

        {/* Section 2: The Inquiry Process (Powered by Agentboxd) */}
        <section className="inquiry-section" id="inquiry">
          <div className="inquiry-inner">
            <div className="section-header-center">
              <div className="section-eyebrow">THE INQUIRY PROCESS</div>
              <h2 className="section-heading-lg">From policy research to the right email.</h2>
              <p className="inquiry-lead-text">
                Finding complex fine-print conditions is only the first step. When you need confirmation from an admissions office, here is how the inquiry process works in simple terms.
              </p>
            </div>

            <div className="inquiry-grid">
              <article className="inquiry-card">
                <div className="inquiry-step-header">
                  <div className="inquiry-badge">01</div>
                  <div className="inquiry-icon-wrap">
                    <CheckSquare size={18} />
                  </div>
                </div>
                <h3>1. Select your questions</h3>
                <p>
                  As you read a university's policy evidence, choose the exact questions or deadlines you want to verify with their financial aid team.
                </p>
              </article>

              <article className="inquiry-card featured">
                <div className="inquiry-step-header">
                  <div className="inquiry-badge featured">02</div>
                  <div className="inquiry-icon-wrap featured">
                    <Mail size={18} />
                  </div>
                </div>
                <div className="inquiry-tool-pill">
                  <Sparkles size={12} /> Powered by Agentboxd
                </div>
                <h3>2. Get a ready-to-edit draft</h3>
                <p>
                  Instead of struggling with what to write, Agentboxd automatically drafts a polite, professional email quoting the verified official .edu pages.
                </p>
              </article>

              <article className="inquiry-card">
                <div className="inquiry-step-header">
                  <div className="inquiry-badge">03</div>
                  <div className="inquiry-icon-wrap">
                    <ShieldCheck size={18} />
                  </div>
                </div>
                <h3>3. Review safely & reach out</h3>
                <p>
                  Clear safety guardrails remind you never to attach bank statements, tax IDs, or passwords. Copy the draft to your inbox with one click.
                </p>
              </article>
            </div>

            {/* Illustrative sample preview card */}
            <div className="inquiry-preview-card">
              <div className="inquiry-preview-header">
                <div className="inquiry-preview-title">
                  <MessageCircle size={16} />
                  <span>How an inquiry draft looks</span>
                </div>
                <span className="inquiry-tag">Official Citations Included</span>
              </div>
              
              <div className="inquiry-preview-content">
                <div className="inquiry-meta-row">
                  <span className="inquiry-meta-label">To:</span>
                  <span className="inquiry-meta-value">finaid@cornell.edu (Cornell Office of Financial Aid)</span>
                </div>
                <div className="inquiry-meta-row">
                  <span className="inquiry-meta-label">Subject:</span>
                  <span className="inquiry-meta-value">Inquiry regarding International Aid Application Deadlines · Cornell University</span>
                </div>
                <div className="inquiry-body-snippet">
                  <p>Dear Financial Aid Office,</p>
                  <p>
                    I am applying as an international prospective student. According to your official portal (<em>finaid.cornell.edu</em>), grant aid requires submitting the CSS Profile at the time of admission. Could you please clarify:
                  </p>
                  <ul>
                    <li>If the CSS Profile fee waiver can be requested prior to the application deadline?</li>
                    <li>Whether international students admitted without aid can qualify in later years?</li>
                  </ul>
                  <p className="inquiry-signoff">Thank you for your guidance,</p>
                </div>
              </div>

              <div className="inquiry-preview-footer">
                <div className="inquiry-footer-safety">
                  <Lock size={13} />
                  <span>Built-in privacy check: never transmits passwords, bank account numbers, or tax forms</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onExplore}
                >
                  Try an Inquiry in Research <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Why Trust Second Chance */}
        <section className="trust-section" id="trust">
          <div className="trust-inner">
            <div className="section-header-center">
              <div className="section-eyebrow">WHY TRUST SECOND CHANCE</div>
              <h2 className="section-heading-lg">Evidence you can independently verify.</h2>
            </div>

            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-icon-box">
                  <Building2 size={22} />
                </div>
                <h4>Official sources only</h4>
                <p>
                  We gather information strictly from official .edu university portals and financial-aid offices. No forum rumors or third-party speculation.
                </p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <ShieldCheck size={22} />
                </div>
                <h4>Source-linked quotations</h4>
                <p>
                  Policy summaries link directly to exact quotations and original university URLs, so you can inspect every rule in its official context.
                </p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Eye size={22} />
                </div>
                <h4>Transparent review labels</h4>
                <p>
                  Passages reviewed by our team are clearly distinguished from direct portal excerpts, so you always know which conditions require manual follow-up.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Counter Band */}
        <section className="metrics-band">
          <div className="metric-tile">
            <strong>100%</strong>
            <span>Official .edu sources</span>
          </div>
          <div className="metric-tile">
            <strong>Direct</strong>
            <span>Official policy citations</span>
          </div>
          <div className="metric-tile">
            <strong>3-Step</strong>
            <span>Guided research workflow</span>
          </div>
          <div className="metric-tile">
            <strong>0</strong>
            <span>Ads, tracking or guesswork</span>
          </div>
        </section>

        {/* Final CTA Band */}
        <section className="cta-band">
          <h2>Make the fine print easier to navigate.</h2>
          <p>
            Explore official policy conditions and prepare the exact questions to ask your admissions office.
          </p>
          <button className="btn btn-secondary btn-lg" onClick={onExplore}>
            Explore Universities Now <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer onExplore={onExplore} onNavigateSection={onNavigateSection} />
    </>
  );
}

// ============================================================================
// PAGE 2: UNIVERSITY SEARCH PAGE
// ============================================================================
const POPULAR_SEARCHES = [
  'Cornell University',
  'Columbia University',
  'Princeton University',
  'Harvard University',
  'MIT',
  'Stanford University'
];

function SearchPage({ onBack, onSelect, onNavigateSection, onOpenOperator }) {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Searching university directory...');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const [searchError, setSearchError] = useState(null);

  // Debounced live autocomplete via backend API
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchSchools(query.trim());
        const candidates = data.candidates || [];
        setSuggestions(candidates.slice(0, 6));
        setShowDropdown(candidates.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 220);
    setHighlightedIndex(-1);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const executeSearch = useCallback(async (targetQuery) => {
    const q = (targetQuery || query).trim();
    if (!q) return;
    setShowDropdown(false);
    setLoading(true);
    setSearched(false);
    setSearchError(null);
    setLoadingMessage('Searching university directory...');

    try {
      const data = await searchSchools(q);
      const candidates = data.candidates || [];
      setResults(candidates);
      if (candidates.length === 0) {
        setLoadingMessage('No matching institutions found');
      }
    } catch (err) {
      setSearchError(err.message);
      setResults([]);
      addToast('Search failed: please try again', 'info');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, addToast]);

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') executeSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const selected = suggestions[highlightedIndex];
        setQuery(selected.name);
        executeSearch(selected.name);
      } else {
        executeSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <>
      <Nav
        onHome={onBack}
        onExplore={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateSection={onNavigateSection}
        onOpenOperator={onOpenOperator}
        active="explore"
      />
      
      <main className="search-page-wrap" id="main">
        <button className="back-btn" onClick={onBack} aria-label="Go back to homepage">
          <ArrowLeft size={16} /> Back to home
        </button>

        <div className="search-header-center">
          <div className="section-eyebrow">UNIVERSITY DISCOVERY</div>
          <h1>Find your university.</h1>
          <p>
            Search for an accredited US undergraduate institution to explore its financial-aid policies for international students.
          </p>
        </div>

        {/* Large Focal Search Bar */}
        <div style={{ position: 'relative' }}>
          <div className="search-focal-box" role="search">
            <Search className="search-input-icon" size={22} />
            <input
              type="text"
              className="search-input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search university name, e.g. Cornell, Harvard, Stanford..."
              autoFocus
              aria-label="Search university name"
              aria-autocomplete="list"
            />
            {query && (
              <button
                className="search-clear-btn"
                onClick={() => { setQuery(''); setSearched(false); }}
                aria-label="Clear search query"
              >
                <X size={18} />
              </button>
            )}
            <button
              className="btn btn-primary btn-md"
              onClick={() => executeSearch()}
              disabled={!query.trim() || loading}
            >
              {loading ? <span className="btn-spinner" /> : 'Search'}
            </button>
          </div>

          {/* Autocomplete suggestions dropdown */}
          {showDropdown && (
            <ul className="autocomplete-dropdown" role="listbox">
              {suggestions.map((item, idx) => {
                const matchIndex = item.name.toLowerCase().indexOf(query.toLowerCase());
                const before = matchIndex >= 0 ? item.name.slice(0, matchIndex) : item.name;
                const match = matchIndex >= 0 ? item.name.slice(matchIndex, matchIndex + query.length) : '';
                const after = matchIndex >= 0 ? item.name.slice(matchIndex + query.length) : '';
                const domainLabel = item.domain_status === 'curated' ? '★ Curated' : 'Directory';

                return (
                  <li
                    key={item.id}
                    className={`autocomplete-item ${idx === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => {
                      setQuery(item.name);
                      executeSearch(item.name);
                    }}
                    role="option"
                    aria-selected={idx === highlightedIndex}
                  >
                    <span>
                      {before}
                      <span className="autocomplete-matched">{match}</span>
                      {after}
                      <small style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>· {item.location || ''}</small>
                      <small style={{ color: 'var(--mint-600)', marginLeft: 6, fontSize: 10, fontWeight: 700 }}>{domainLabel}</small>
                    </span>
                    <CornerDownRight size={14} style={{ color: 'var(--mint-500)' }} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Popular Searches Chips */}
        <div className="popular-searches-row">
          <span className="popular-label">Popular searches:</span>
          {POPULAR_SEARCHES.map((schoolName) => (
            <button
              key={schoolName}
              className="popular-chip"
              onClick={() => {
                setQuery(schoolName);
                executeSearch(schoolName);
              }}
            >
              {schoolName}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-indicator-box">
            <div className="loading-spinner-ring" />
            <p>{loadingMessage}</p>
          </div>
        )}

        {/* Results List */}
        {!loading && searched && !searchError && results.length > 0 && (
          <div className="search-results-list">
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              MATCHED INSTITUTIONS ({results.length})
            </div>

            {results.map((school) => (
              <button
                key={school.id}
                className="university-result-card"
                onClick={() => onSelect(school)}
                aria-label={`Select ${school.name}`}
              >
                <div className="uni-avatar-badge">{school.name.charAt(0)}</div>
                <div className="uni-meta-info">
                  <strong>{school.name}</strong>
                  <span>{school.location || ''} · {school.domain || ''}</span>
                </div>
                <span className="verified-domain-pill">
                  <ShieldCheck size={14} /> {school.domain_status === 'curated' ? 'Curated source' : 'Directory domain'}
                </span>
                <ArrowRight size={18} style={{ color: 'var(--forest-600)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && searched && !searchError && results.length === 0 && (
          <div className="empty-state-card">
            <HelpCircle />
            <h3>No matching universities found</h3>
            <p>Try searching for "Cornell University", "MIT", or "Columbia".</p>
          </div>
        )}

        {/* Search Error State */}
        {!loading && searched && searchError && (
          <div className="empty-state-card">
            <WifiOff />
            <h3>Search unavailable</h3>
            <p>{searchError}. Check that the backend server is running and try again.</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="empty-state-card" style={{ marginTop: 48 }}>
            <Building2 />
            <h3>Ready to explore</h3>
            <p>Enter a US university name above or click one of the popular search tags.</p>
          </div>
        )}
      </main>

      <Footer onExplore={() => {}} onNavigateSection={onNavigateSection} />
    </>
  );
}

// ============================================================================
// PAGE 3: UNIVERSITY RESULTS PAGE (LIVE API-DRIVEN DASHBOARD)
// ============================================================================

const STATUS_CONFIG = {
  fresh:       { label: 'Fresh',       className: 'badge-fresh',       dot: true,  icon: null },
  cached:      { label: 'Cached',      className: 'badge-scope',       dot: false, icon: Clock },
  stale:       { label: 'Stale',       className: 'badge-unreviewed',  dot: false, icon: AlertTriangle },
  unavailable: { label: 'Unavailable', className: 'badge-unreviewed',  dot: false, icon: WifiOff },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unavailable;
  const IconComp = cfg.icon;
  return (
    <Tooltip text={`Data status: ${cfg.label.toLowerCase()}`}>
      <span className={`badge ${cfg.className}`}>
        {cfg.dot && <span className="badge-fresh-dot" />}
        {IconComp && <IconComp size={13} />}
        {' '}{cfg.label}
      </span>
    </Tooltip>
  );
}

function ReviewBadge({ reviewStatus }) {
  if (reviewStatus === 'team_reviewed') {
    return (
      <Tooltip text="Reviewed and cross-checked by our team against official sources">
        <span className="badge badge-reviewed">
          <CircleCheck size={14} /> Reviewed by our team
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip text="Direct portal excerpt; verify with the financial aid office">
      <span className="badge badge-unreviewed">
        <AlertTriangle size={14} /> Unreviewed excerpt
      </span>
    </Tooltip>
  );
}

function EvidenceCard({ item, index, total, onCopy }) {
  return (
    <article className="evidence-quote-card">
      <div className="evidence-card-top-row">
        <span className="evidence-pass-label">Passage {index + 1}{total > 1 ? ` of ${total}` : ''}</span>
        <ReviewBadge reviewStatus={item.review_status} />
      </div>

      <div className="evidence-quote-body">
        <Quote className="decorative-quote-mark" size={32} />
        <p className="quote-serif">
          "{item.quote}"
        </p>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        Scope: <strong>{item.scope || 'Undergraduate'}</strong> · Cycle: <strong>{item.cycle || '2026-2027'}</strong> · Type: <strong>{item.source_type || 'Portal'}</strong>
      </div>

      <div className="evidence-actions-bar">
        <button className="evidence-action-btn" onClick={() => onCopy(item.quote, 'Quote copied to clipboard')}>
          <Copy size={13} /> Copy quote
        </button>
        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noreferrer" className="evidence-action-btn">
            <ExternalLink size={13} /> Open source page
          </a>
        )}
        <button
          className="evidence-action-btn"
          onClick={() => onCopy(
            `"${item.quote}" (Source: ${item.source_url || 'University portal'}, retrieved ${item.retrieved_at ? item.retrieved_at.split('T')[0] : 'recent'})`,
            'Citation copied to clipboard'
          )}
        >
          <Share2 size={13} /> Copy citation
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// UNIVERSITY INQUIRY EMAIL RESOLVER
// ============================================================================
const UNIVERSITY_AID_EMAILS = {
  'princeton.edu': 'pfaa@princeton.edu',
  'cornell.edu': 'finaid@cornell.edu',
  'tufts.edu': 'studentservices@tufts.edu',
  'missouri.edu': 'mizzouaid@missouri.edu',
  'columbia.edu': 'ugrad-finaid@columbia.edu',
  'harvard.edu': 'finaid@fas.harvard.edu',
  'yale.edu': 'sfs@yale.edu',
  'stanford.edu': 'financialaid@stanford.edu',
  'mit.edu': 'sfs@mit.edu',
  'upenn.edu': 'sfsmail@pobox.upenn.edu',
  'dartmouth.edu': 'financial.aid@dartmouth.edu',
  'brown.edu': 'financial_aid@brown.edu',
  'duke.edu': 'finaid@duke.edu',
  'uchicago.edu': 'finaid@uchicago.edu',
  'northwestern.edu': 'undergradfinaid@northwestern.edu',
  'jhu.edu': 'finaid@jhu.edu',
  'vanderbilt.edu': 'finaid@vanderbilt.edu',
  'rice.edu': 'finaid@rice.edu',
  'wustl.edu': 'financial@wustl.edu',
  'nd.edu': 'finaid@nd.edu',
  'emory.edu': 'finaid@emory.edu',
  'georgetown.edu': 'fin-aid@georgetown.edu',
  'cmu.edu': 'thehub@andrew.cmu.edu',
  'virginia.edu': 'sfs@virginia.edu',
  'nyu.edu': 'financial.aid@nyu.edu',
  'usc.edu': 'finaid@usc.edu',
  'umich.edu': 'financial.aid@umich.edu',
  'unc.edu': 'aidinfo@unc.edu',
  'wfu.edu': 'financialaid@wfu.edu',
  'bu.edu': 'finaid@bu.edu',
  'bc.edu': 'finaid@bc.edu',
  'rochester.edu': 'finaid@rochester.edu',
  'brandeis.edu': 'finaid@brandeis.edu',
  'case.edu': 'financialaid@case.edu',
  'tulane.edu': 'finaid@tulane.edu',
  'northeastern.edu': 'sfs@northeastern.edu',
  'loyola.edu': 'financialaid@loyola.edu',
  'luc.edu': 'lufinaid@luc.edu',
};

function resolveUniversityInquiryEmail(schoolName, domain, fallbackEmail) {
  if (fallbackEmail && typeof fallbackEmail === 'string' && fallbackEmail.includes('@')) {
    return fallbackEmail;
  }
  const cleanDomain = (domain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();

  if (cleanDomain && UNIVERSITY_AID_EMAILS[cleanDomain]) {
    return UNIVERSITY_AID_EMAILS[cleanDomain];
  }

  const parts = cleanDomain.split('.');
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (UNIVERSITY_AID_EMAILS[rootDomain]) {
      return UNIVERSITY_AID_EMAILS[rootDomain];
    }
  }

  if (cleanDomain && cleanDomain.endsWith('.edu')) {
    return `financialaid@${cleanDomain}`;
  }

  return 'financialaid@university.edu';
}

function convertActionToInquiryQuestion(text, schoolName) {
  if (!text) return '';
  const trimmed = text.trim();

  // Known curated patterns
  if (/Check Princeton's aid application and its deadline/i.test(trimmed)) {
    return 'Could you please confirm the required financial aid application forms and priority submission deadlines for international undergraduate applicants?';
  }
  if (/submit the CSS Profile when applying for admission/i.test(trimmed)) {
    return 'Could you please clarify whether international applicants must submit the CSS Profile at the time of admission to be eligible for grant aid, and whether aid can be requested in future years if not requested initially?';
  }
  if (/Decide whether you may need Cornell grant.*check the CSS rule/i.test(trimmed) || /If you may need Cornell grant.*check the CSS requirement/i.test(trimmed)) {
    return 'Could you clarify your policy on whether international students admitted without financial aid are eligible to apply for institutional grant assistance in subsequent academic years?';
  }
  if (/Confirm whether you are a first-year or transfer/i.test(trimmed)) {
    return 'Could you clarify whether international first-year and transfer applicants follow the same financial aid eligibility guidelines and deadlines?';
  }
  if (/priority date for your application round/i.test(trimmed) || /priority date for your own entry year/i.test(trimmed)) {
    return 'Could you confirm the priority deadline for submitting international financial aid materials for my application cycle?';
  }
  if (/Action needed: if your application is not yet submitted/i.test(trimmed)) {
    return 'Could you advise on how an international applicant can verify or update their intent to apply for institutional financial aid if their admissions application has already been submitted?';
  }
  if (/check whether you indicated aid on your admission application/i.test(trimmed)) {
    return 'Could you help me verify whether my admissions file indicates that I am applying for need-based financial aid?';
  }
  if (/Confirm your actual application and check the aid forms/i.test(trimmed)) {
    return 'Could you verify which specific forms and documentation are required to complete an international financial aid file?';
  }
  if (/check the requirement to request it when applying for admission/i.test(trimmed)) {
    return 'Could you confirm whether international applicants must apply for aid during the initial application cycle to remain eligible for institutional funding throughout their undergraduate degree?';
  }
  if (/check the free ISFAA option.*waiver after admission/i.test(trimmed)) {
    return 'Could you clarify the process for submitting the free ISFAA form during application and how CSS Profile fee waivers are provided for admitted international students?';
  }
  if (/Review the exact quoted policy passages/i.test(trimmed)) {
    return 'Could you please confirm the current undergraduate need-based financial aid opportunities and eligibility requirements for international applicants?';
  }
  if (/Contact international undergraduate admissions to verify requirements/i.test(trimmed)) {
    return 'Could you clarify the specific application deadlines and required documentation for prospective international undergraduate applicants for the upcoming cycle?';
  }

  // General heuristic transformation if action starts with imperative verbs
  let clean = trimmed;
  if (/^Check\s+/i.test(clean)) {
    clean = clean.replace(/^Check\s+/i, 'Could you please clarify ');
  } else if (/^Confirm\s+/i.test(clean)) {
    clean = clean.replace(/^Confirm\s+/i, 'Could you please confirm ');
  } else if (/^Find\s+/i.test(clean)) {
    clean = clean.replace(/^Find\s+/i, 'Could you provide information regarding ');
  } else if (/^Contact\s+/i.test(clean)) {
    clean = clean.replace(/^Contact\s+[^to]+to\s+/i, 'Could you please ');
  } else if (/^Review\s+/i.test(clean)) {
    clean = clean.replace(/^Review\s+/i, 'Could you please clarify ');
  }

  clean = clean.replace(/\.+$/, '');
  if (!clean.endsWith('?')) {
    clean += '?';
  }
  return clean;
}

// ============================================================================
// STUDENT INQUIRY EMAIL COMPOSER MODAL
// ============================================================================
function EmailComposerModal({
  isOpen,
  onClose,
  schoolName,
  schoolDomain,
  inquiryEmail,
  questions = [],
  sources = [],
}) {
  const { addToast } = useToast();
  const [selectedIndices, setSelectedIndices] = useState(() => new Set(questions.map((_, i) => i)));
  const [subject, setSubject] = useState(`Inquiry: Undergraduate Financial Aid Policy for International Students (${schoolName})`);
  const [recipientEmail, setRecipientEmail] = useState(() => resolveUniversityInquiryEmail(schoolName, schoolDomain, inquiryEmail));
  const [includeSources, setIncludeSources] = useState(true);
  const [customBody, setCustomBody] = useState('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  const toggleQuestion = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectedQuestions = useMemo(() => {
    return questions.filter((_, idx) => selectedIndices.has(idx));
  }, [questions, selectedIndices]);

  const generatedBody = useMemo(() => {
    let body = `Dear ${schoolName} Financial Aid Office,\n\n`;
    body += `I am an international prospective undergraduate applicant researching financial-aid policies at ${schoolName}. `;
    body += `Based on official portal information, I would appreciate clarification on the following:\n\n`;

    if (selectedQuestions.length === 0) {
      body += `[Please select one or more questions above]\n\n`;
    } else {
      selectedQuestions.forEach((q, i) => {
        const questionText = convertActionToInquiryQuestion(q.question, schoolName);
        body += `${i + 1}. ${questionText}\n\n`;
      });
    }

    if (includeSources && sources.length > 0) {
      const uniqueUrls = [];
      sources.forEach((s) => {
        const url = s.source_url || '';
        if (url && !uniqueUrls.includes(url)) {
          uniqueUrls.push(url);
        }
      });
      if (uniqueUrls.length > 0) {
        body += `Official portal pages referenced:\n`;
        uniqueUrls.slice(0, 3).forEach((url) => {
          body += `- ${url}\n`;
        });
        body += `\n`;
      }
    }

    body += `Thank you for your time and guidance.\n\nSincerely,\n[Your Name]\nProspective International Applicant`;
    return body;
  }, [schoolName, selectedQuestions, includeSources, sources]);

  useEffect(() => {
    if (!isCustomEdited) {
      setCustomBody(generatedBody);
    }
  }, [generatedBody, isCustomEdited]);

  useEffect(() => {
    if (questions && questions.length > 0) {
      setSelectedIndices(new Set(questions.map((_, i) => i)));
    }
    setSubject(`Inquiry: Undergraduate Financial Aid Policy for International Students (${schoolName})`);
    setRecipientEmail(resolveUniversityInquiryEmail(schoolName, schoolDomain, inquiryEmail));
    setIsCustomEdited(false);
  }, [schoolName, schoolDomain, inquiryEmail, questions]);

  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const fullDraft = `To: ${recipientEmail}\nSubject: ${subject}\n\n${customBody}`;
    navigator.clipboard.writeText(fullDraft);
    addToast('Inquiry email copied to clipboard');
  };

  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customBody)}`;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog composer-modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="composer-modal-header">
          <div className="composer-modal-title-group">
            <div className="composer-modal-icon">
              <Mail size={18} />
            </div>
            <div>
              <div className="composer-title-row">
                <h3>Prepare Inquiry Email</h3>
                <span className="composer-tool-tag">Powered by Agentboxd</span>
              </div>
              <p className="composer-modal-subtitle">
                Draft a clear, polite inquiry to {schoolName} referencing official policy evidence.
              </p>
            </div>
          </div>
          <button className="composer-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="composer-modal-body">
          <div className="composer-notice-banner">
            <ShieldCheck size={18} className="composer-notice-icon" />
            <div>
              <strong>Privacy & Safety Guardrails:</strong> This draft is prepared from official source-linked findings to help you ask clear questions. Never disclose passwords, tax returns, bank statements, or national identity documents in initial inquiries.
            </div>
          </div>

          <div className="composer-form-group">
            <div className="composer-field-header">
              <label className="composer-label">To: University Financial Aid Desk</label>
              <span className="composer-recipient-badge">
                <CircleCheck size={12} /> Verified university desk
              </span>
            </div>
            <div className="composer-input-with-icon">
              <Mail size={16} className="composer-input-icon" />
              <input
                type="email"
                className="composer-input composer-input-has-icon"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="finaid@university.edu"
              />
            </div>
            <span className="composer-field-help">
              Pre-filled for {schoolName}. Automatically sets the recipient in your mail app.
            </span>
          </div>

          <div className="composer-form-group">
            <label className="composer-label">Email Subject</label>
            <input
              type="text"
              className="composer-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="composer-form-group">
            <div className="composer-questions-header">
              <label className="composer-label">
                Include Questions ({selectedIndices.size} of {questions.length})
              </label>
              <button
                type="button"
                className="composer-toggle-all-btn"
                onClick={() => {
                  setIsCustomEdited(false);
                  if (selectedIndices.size === questions.length) setSelectedIndices(new Set());
                  else setSelectedIndices(new Set(questions.map((_, i) => i)));
                }}
              >
                {selectedIndices.size === questions.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="composer-questions-list">
              {questions.map((q, idx) => (
                <label key={idx} className={`composer-question-item ${selectedIndices.has(idx) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(idx)}
                    onChange={() => {
                      setIsCustomEdited(false);
                      toggleQuestion(idx);
                    }}
                  />
                  <span>{convertActionToInquiryQuestion(q.question, schoolName)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="composer-sources-toggle">
            <label className="composer-checkbox-label">
              <input
                type="checkbox"
                checked={includeSources}
                onChange={e => {
                  setIsCustomEdited(false);
                  setIncludeSources(e.target.checked);
                }}
              />
              <span>Attach verified official university source links ({sources.length} available)</span>
            </label>
          </div>

          <div className="composer-form-group">
            <div className="composer-preview-header">
              <label className="composer-label">Generated Inquiry Draft</label>
              <div className="composer-preview-header-actions">
                {isCustomEdited && (
                  <button
                    type="button"
                    className="composer-reset-btn"
                    onClick={() => {
                      setIsCustomEdited(false);
                      setCustomBody(generatedBody);
                    }}
                  >
                    Reset to template
                  </button>
                )}
                <span className="composer-preview-hint">Editable directly in box</span>
              </div>
            </div>
            <div className="composer-email-card">
              <div className="composer-email-meta">
                <span className="composer-meta-to">To: <strong>{recipientEmail}</strong></span>
              </div>
              <textarea
                className="composer-textarea"
                rows={10}
                value={customBody}
                onChange={e => {
                  setIsCustomEdited(true);
                  setCustomBody(e.target.value);
                }}
              />
            </div>
          </div>
        </div>

        <div className="composer-modal-footer">
          <button className="btn btn-secondary btn-md" onClick={onClose}>
            Close
          </button>
          <div className="composer-footer-actions">
            <a
              href={mailtoUrl}
              className="btn btn-secondary btn-md"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => addToast('Opening in your mail app...')}
            >
              <ExternalLink size={15} /> Open in Mail App
            </a>
            <button className="btn btn-primary btn-md" onClick={handleCopy}>
              <Copy size={15} /> Copy Email to Clipboard
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// OPERATOR PORTAL MODAL (PROTECTED AGENTBOXD DEMO)
// ============================================================================
function OperatorPortalModal({ isOpen, onClose, initialDraft }) {
  const { addToast } = useToast();
  const [operatorToken, setOperatorToken] = useState(() => sessionStorage.getItem('second_chance_operator_token') || '');
  const [activeTab, setActiveTab] = useState(initialDraft ? 'draft' : 'threads');
  const [authStatus, setAuthStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Draft state
  const [subject, setSubject] = useState('');
  const [draftText, setDraftText] = useState('');
  const [sources, setSources] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [createdDraftResult, setCreatedDraftResult] = useState(null);

  // Threads state
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      setSubject(initialDraft.subject || '');
      setDraftText(initialDraft.text || '');
      setSources(initialDraft.sources || []);
      setSchoolName(initialDraft.schoolName || '');
      setActiveTab('draft');
    }
  }, [initialDraft]);

  const checkAuth = useCallback(async (tokenToTest) => {
    const t = tokenToTest !== undefined ? tokenToTest : operatorToken;
    setAuthStatus('checking');
    try {
      const res = await getOperatorStatus(t);
      if (res.enabled) {
        setAuthStatus('authorized');
        setStatusMessage(`Connected: Demo Inbox ${res.inbox_id}`);
        if (t) sessionStorage.setItem('second_chance_operator_token', t);
      } else {
        setAuthStatus('disabled');
        setStatusMessage('Operator API is disabled on this server deployment.');
      }
    } catch (err) {
      setAuthStatus('unauthorized');
      setStatusMessage(err.message || 'Authorization failed');
    }
  }, [operatorToken]);

  useEffect(() => {
    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, checkAuth]);

  const fetchThreads = useCallback(async () => {
    if (authStatus !== 'authorized' || !operatorToken) return;
    setLoadingThreads(true);
    try {
      const data = await getOperatorThreads(operatorToken);
      setThreads(data.threads || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch demo threads', 'error');
    } finally {
      setLoadingThreads(false);
    }
  }, [authStatus, operatorToken, addToast]);

  useEffect(() => {
    if (activeTab === 'threads' && authStatus === 'authorized') {
      fetchThreads();
    }
  }, [activeTab, authStatus, fetchThreads]);

  const handleSelectThread = async (t) => {
    setSelectedThread(t);
    setLoadingMessages(true);
    try {
      const data = await getOperatorThreadMessages(t.id, operatorToken);
      setThreadMessages(data.messages || []);
    } catch (err) {
      addToast(err.message || 'Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!draftText.trim()) {
      addToast('Draft text cannot be empty', 'error');
      return;
    }
    setCreatingDraft(true);
    setCreatedDraftResult(null);
    try {
      const payload = {
        subject: subject || 'Undergraduate Financial Aid Inquiry',
        text: draftText,
        sources: sources,
        school_name: schoolName,
      };
      const result = await createOperatorDraft(payload, operatorToken);
      setCreatedDraftResult(result);
      addToast('Unaddressed draft created in Agentboxd!');
    } catch (err) {
      addToast(err.message || 'Failed to create draft', 'error');
    } finally {
      setCreatingDraft(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-window" style={{ maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={20} color="var(--brand-primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Operator Demo Portal</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
                Private Agentboxd human-in-the-loop email verification demo
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Authentication: </span>
                <span className={`status-pill ${authStatus === 'authorized' ? 'status-ok' : 'status-warn'}`}>
                  {authStatus === 'authorized' ? 'Authenticated' : authStatus === 'disabled' ? 'Operator API Disabled' : 'Authentication Required'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{statusMessage}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="password"
                  placeholder="Operator Token"
                  value={operatorToken}
                  onChange={e => setOperatorToken(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)'
                  }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => checkAuth(operatorToken)}
                  disabled={authStatus === 'checking'}
                >
                  {authStatus === 'checking' ? 'Testing...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>

          {authStatus !== 'authorized' ? (
            <div className="empty-state-card" style={{ padding: '32px 16px' }}>
              <Lock size={32} />
              <h3>Operator Access Protected</h3>
              <p style={{ maxWidth: 500, margin: '0 auto 12px' }}>
                In accordance with security and privacy boundaries, operator endpoints are disabled by default on public deployments and require a server-side authentication token.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Set <code>ENABLE_OPERATOR_API=true</code> and enter your <code>OPERATOR_TOKEN</code> to access the team demonstration portal.
              </p>
            </div>
          ) : (
            <>
              <div className="operator-tab-bar">
                <button
                  className={`operator-tab-btn ${activeTab === 'draft' ? 'active' : ''}`}
                  onClick={() => setActiveTab('draft')}
                >
                  <Mail size={15} /> Create Unaddressed Draft
                </button>
                <button
                  className={`operator-tab-btn ${activeTab === 'threads' ? 'active' : ''}`}
                  onClick={() => setActiveTab('threads')}
                >
                  <Inbox size={15} /> Demo Threads & Replies
                </button>
              </div>

              {activeTab === 'draft' && (
                <div>
                  <div className="inquiry-notice-banner" style={{ marginBottom: 16 }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Human-in-the-Loop Protocol:</strong> Drafts created here are strictly unaddressed (no recipient is assigned, and no email is sent or scheduled automatically). An operator must open the Agentboxd dashboard, review the drafted content, supply the team test recipient address, and manually send.
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        fontSize: 13,
                        background: 'var(--bg-input)'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Draft Content</label>
                    <textarea
                      rows={8}
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        background: 'var(--bg-input)'
                      }}
                    />
                  </div>

                  {createdDraftResult && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid #10b981',
                      borderRadius: 8,
                      padding: '12px 16px',
                      marginBottom: 16
                    }}>
                      <h4 style={{ margin: '0 0 6px', color: '#10b981', fontSize: 14 }}>Draft Created Successfully in Agentboxd</h4>
                      <p style={{ margin: '0 0 8px', fontSize: 12 }}>
                        Draft ID: <code>{createdDraftResult.draft_id}</code> | Inbox: <code>{createdDraftResult.inbox_id}</code>
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                        Next Step: Log into your <a href="https://app.agentboxd.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Agentboxd Dashboard</a>, review the draft, set recipient to your team test email, and send.
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      className="btn btn-primary btn-md"
                      onClick={handleCreateDraft}
                      disabled={creatingDraft}
                    >
                      {creatingDraft ? 'Submitting to Agentboxd...' : 'Create Draft in Agentboxd'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'threads' && (
                <div>
                  <div className="test-conversation-notice">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Demo Test Environment:</strong> All messages below are internal team test conversations. Neither outgoing inquiries nor incoming replies represent official university communications. Incoming text is rendered safely as untrusted plain text.
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Demo Inbox Conversations ({threads.length})</span>
                    <button className="btn btn-secondary btn-sm" onClick={fetchThreads} disabled={loadingThreads}>
                      <RefreshCw size={13} className={loadingThreads ? 'spin' : ''} /> Refresh
                    </button>
                  </div>

                  {loadingThreads ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                      Loading test threads...
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="empty-state-card" style={{ padding: '24px 16px' }}>
                      <Inbox size={24} />
                      <p style={{ margin: '8px 0 0' }}>No threads recorded yet in the demo inbox.</p>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Send a draft to your team test address and reply to generate a thread.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedThread ? '1fr 1fr' : '1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                        {threads.map(t => (
                          <div
                            key={t.id}
                            className={`thread-list-item ${selectedThread?.id === t.id ? 'active' : ''}`}
                            onClick={() => handleSelectThread(t)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                              <strong style={{ fontSize: 13 }}>{t.subject || '(No Subject)'}</strong>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                              <span>Status: {t.status || 'open'}</span>
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Team Test</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedThread && (
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--bg-card)', maxHeight: 360, overflowY: 'auto' }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: 13, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                            {selectedThread.subject}
                          </h4>
                          {loadingMessages ? (
                            <div style={{ textAlign: 'center', padding: 16 }}>Loading messages...</div>
                          ) : threadMessages.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No messages found in this thread.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {threadMessages.map(m => (
                                <div key={m.id} className="conversation-msg-bubble">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    <span>From: <strong>{m.sender || 'team-test@example.com'}</strong></span>
                                    <span>{m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : ''}</span>
                                  </div>
                                  <div style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                                    {m.text_body || m.snippet || '(Empty message)'}
                                  </div>
                                  <div style={{ marginTop: 4, fontSize: 10, color: '#f59e0b', fontStyle: 'italic' }}>
                                    [Team Test Message - Not an official university response]
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Dashboard({ onBack, onNewSearch, selectedSchool, onNavigateSection, onOpenOperator }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState('Overview');
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // live research state
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState(null);

  // question tracking state
  const [askedQuestions, setAskedQuestions] = useState(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  // email composer & edit context modal states
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [contextData, setContextData] = useState({
    applicantType: 'First-year',
    needsAid: 'Yes',
    requestedAid: 'Yes',
    entryYear: '2027'
  });

  const school = selectedSchool || {
    name: 'Cornell University',
    location: 'Ithaca, New York',
    domain: 'cornell.edu',
    id: 'curated:cornell'
  };

  const buildProfile = useCallback(() => ({
    applicant_type: contextData.applicantType === 'First-year' ? 'first_year' : contextData.applicantType === 'Transfer' ? 'transfer' : 'unknown',
    needs_aid: contextData.needsAid.toLowerCase(),
    requested_aid: contextData.requestedAid.toLowerCase(),
    entry_year: contextData.entryYear === '2027' ? '2027' : 'other',
  }), [contextData]);

  const doResearch = useCallback(async (refresh = false) => {
    if (!school?.id) return;
    setResearchLoading(true);
    setResearchError(null);
    try {
      const data = await conductResearch({
        schoolId: school.id,
        profile: buildProfile(),
        refresh,
      });
      setResearchData(data);
    } catch (err) {
      setResearchError(err.message);
      addToast('Research request failed: ' + err.message, 'info');
    } finally {
      setResearchLoading(false);
    }
  }, [school?.id, buildProfile, addToast]);

  useEffect(() => {
    doResearch(false);
  }, [school?.id]);

  const card = researchData?.cards?.[0] || null;
  const evidence = card?.evidence || [];
  const actions = card?.actions || [];
  const researchStatus = researchData?.status || 'unavailable';
  const researchMessage = researchData?.message || '';
  const schoolDomain = researchData?.school?.domain || school.domain || '';
  const schoolName = researchData?.school?.name || school.name || '';

  const simplifiedMessage = useMemo(() => {
    const msg = researchMessage || '';
    if (!msg || msg.toLowerCase().includes('retrieved') || msg.toLowerCase().includes('verified host') || msg.toLowerCase().includes('curated') || msg.toLowerCase().includes('official university source')) {
      return 'Official university source';
    }
    if (msg.toLowerCase().includes('cached')) {
      return 'Official university source (cached)';
    }
    if (msg.toLowerCase().includes('unavailable') || msg.toLowerCase().includes('cannot research') || msg.toLowerCase().includes('no official')) {
      return msg;
    }
    return 'Official university source';
  }, [researchMessage]);

  const reviewedEvidenceCount = evidence.filter(e => e.review_status === 'team_reviewed').length;
  const unreviewedEvidenceCount = evidence.length - reviewedEvidenceCount;

  const passageCount = useCountUp(evidence.length);
  const reviewedCount = useCountUp(reviewedEvidenceCount);

  const dynamicQuestions = useMemo(() => {
    if (actions.length > 0) {
      return actions.map((action, idx) => ({
        id: `action-${idx}`,
        category: idx < 2 ? 'Applying' : idx < 4 ? 'Deadlines' : 'Aid types and eligibility',
        question: action,
        why: 'Derived directly from official policy conditions for your applicant profile.',
        priority: idx < 2 ? 'High' : 'Medium',
        followUp: `Inquire with the financial-aid team at ${schoolDomain}`,
      }));
    }
    return [
      {
        id: 'q1',
        category: 'Applying',
        question: `Does ${schoolName} require international aid applications at the time of admission?`,
        why: 'Many institutions require the CSS Profile simultaneously with application submission.',
        priority: 'High',
        followUp: `Confirm whether aid application deadlines differ from admission deadlines at ${schoolDomain}.`
      },
      {
        id: 'q2',
        category: 'Deadlines',
        question: `What is the exact financial aid documentation deadline for ${schoolName}?`,
        why: 'International financial documentation typically has strict priority deadlines.',
        priority: 'High',
        followUp: `Verify whether late CSS Profile submissions are accepted.`
      },
      {
        id: 'q3',
        category: 'Aid types and eligibility',
        question: `Does the financial aid package cover all four undergraduate years?`,
        why: 'Ensure institutional grants adjust for annual tuition or cost of living changes.',
        priority: 'Medium',
        followUp: `Ask whether international students are eligible for on-campus student employment.`
      }
    ];
  }, [actions, schoolName, schoolDomain]);

  const lastUpdated = useMemo(() => {
    if (evidence.length > 0 && evidence[0].retrieved_at) {
      try {
        const d = new Date(evidence[0].retrieved_at);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return 'Recently checked'; }
    }
    return 'Recently checked';
  }, [evidence]);

  const toggleAsked = (id) => {
    setAskedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyText = async (text, toastMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(toastMsg || 'Copied to clipboard');
    } catch {
      addToast('Unable to copy', 'info');
    }
  };

  const handleExportChecklist = () => {
    const lines = [
      `SECOND CHANCE: FINANCIAL AID INQUIRY CHECKLIST`,
      `Institution: ${schoolName} (${schoolDomain})`,
      `Generated: ${new Date().toLocaleString()}`,
      `============================================================\n`,
      ...dynamicQuestions.map((q, idx) => {
        const isDone = askedQuestions.has(q.id) ? '[X]' : '[ ]';
        return `${isDone} ${idx + 1}. [${q.category.toUpperCase()}] ${q.question}\n    Context: ${q.why}\n`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolName.replace(/\s+/g, '_')}_Financial_Aid_Checklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Checklist exported successfully');
  };

  // Export only the student's unanswered questions and source links, not their profile.
  // Agentboxd is an operator-assisted demo; this button does not contact its API.
  const handleExportAgentboxdHandoff = () => {
    const questions = dynamicQuestions.filter(q => !askedQuestions.has(q.id)).map(q => q.question);
    if (!questions.length) {
      addToast('Uncheck at least one question to prepare a draft', 'info');
      return;
    }
    const sources = [...new Set(evidence.map(item => item.source_url).filter(url => {
      try { return new URL(url).protocol === 'https:'; } catch { return false; }
    }))];
    const handoff = { version: 1, school: schoolName, questions, sources };
    const blob = new Blob([JSON.stringify(handoff, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'second-chance-agentboxd-handoff.json';
    a.click();
    URL.revokeObjectURL(url);
    addToast('Question handoff exported. No email was sent.');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await doResearch(true);
    setRefreshing(false);
    addToast(`Refreshed official ${schoolName} sources`);
  };

  const scrollToQuestions = () => {
    setTab('Next Questions');
    const el = document.getElementById('questions-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Loading skeleton
  if (researchLoading && !researchData) {
    return (
      <>
        <Nav onHome={onBack} onExplore={onNewSearch} onNavigateSection={onNavigateSection} onOpenOperator={onOpenOperator} active="explore" />
        <main className="dashboard-container" id="main">
          <button className="back-btn" onClick={onBack} aria-label="Go back to search results">
            <ArrowLeft size={16} /> Back to search results
          </button>
          <div className="loading-indicator-box" style={{ marginTop: 80 }}>
            <div className="loading-spinner-ring" />
            <p>Researching {school.name} financial-aid policies...</p>
            <small style={{ color: 'var(--text-tertiary)' }}>Fetching evidence from official university portals</small>
          </div>
        </main>
      </>
    );
  }

  // Error state
  if (researchError && !researchData) {
    return (
      <>
        <Nav onHome={onBack} onExplore={onNewSearch} onNavigateSection={onNavigateSection} onOpenOperator={onOpenOperator} active="explore" />
        <main className="dashboard-container" id="main">
          <button className="back-btn" onClick={onBack} aria-label="Go back to search results">
            <ArrowLeft size={16} /> Back to search results
          </button>
          <div className="empty-state-card" style={{ marginTop: 80 }}>
            <WifiOff />
            <h3>Research unavailable</h3>
            <p>{researchError}</p>
            <button className="btn btn-primary btn-md" onClick={() => doResearch(false)} style={{ marginTop: 16 }}>
              Try again
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav onHome={onBack} onExplore={onNewSearch} onNavigateSection={onNavigateSection} onOpenOperator={onOpenOperator} active="explore" />

      <main className="dashboard-container" id="main">
        <button className="back-btn" onClick={onBack} aria-label="Go back to search results">
          <ArrowLeft size={16} /> Back to search results
        </button>

        {/* University Header with Status Badge */}
        <header className="uni-header-banner">
          <div className="uni-photo-shell">
            {!imageLoaded && !imageError && <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            {!imageError ? (
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=360&q=80"
                alt={`${schoolName} campus building`}
                className="uni-photo-img"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
            ) : (
              <div className="uni-photo-fallback">
                {schoolName.charAt(0)}
              </div>
            )}
          </div>

          <div className="uni-info-col">
            <h1>{schoolName}</h1>
            <div className="uni-tags-row">
              <span><MapPin size={15} /> {school.location || 'United States'}</span>
              <span>
                <LinkIcon size={14} />
                <a href={`https://${schoolDomain}`} target="_blank" rel="noreferrer">
                  {schoolDomain} <ExternalLink size={12} />
                </a>
              </span>
              <Tooltip text="Official institution directory domain">
                <span className="badge badge-scope">
                  <ShieldCheck size={13} /> Official Domain
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="research-meta-widget">
            <StatusBadge status={researchStatus} />

            <div className="research-meta-text">
              <strong>{simplifiedMessage}</strong>
              <small>{lastUpdated}</small>
            </div>

            <button
              className="refresh-action-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh financial aid data"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="dashboard-tabs-bar" role="tablist">
          {['Overview', 'Evidence', 'Next Questions'].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`dash-tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Evidence' && ` (${evidence.length})`}
              {tab === t && <span className="tab-active-indicator" />}
            </button>
          ))}
        </div>

        {/* Dashboard Layout: Main Column + Sticky Context Sidebar */}
        <div className="dashboard-layout-grid">
          <div className="results-main-column">
            
            {/* ================= OVERVIEW TAB ================= */}
            {tab === 'Overview' && (
              <div className="tab-content-panel">
                {/* What We Found Hero Card */}
                <article className="what-we-found-hero">
                  <h2>What we found</h2>
                  <p className="what-we-found-body">
                    {card?.tagline ? (
                      <>
                        {card.tagline}{' '}
                        {evidence.length > 0 && (
                          <>
                            Drawn from <mark className="highlighter">{evidence.length} official source passage{evidence.length !== 1 ? 's' : ''}</mark> directly from university publications.
                          </>
                        )}
                      </>
                    ) : (
                      <>Official policy details are currently being cataloged for this institution.</>
                    )}
                  </p>
                </article>

                {/* Stat Tiles */}
                <div className="stat-tiles-row">
                  <div className="stat-tile-card">
                    <div className="stat-tile-icon-box">
                      <FileText size={22} />
                    </div>
                    <div className="stat-tile-content">
                      <span className="stat-tile-number">{passageCount}</span>
                      <span className="stat-tile-label">Source passages</span>
                    </div>
                  </div>

                  <Tooltip text={`${reviewedEvidenceCount} passage${reviewedEvidenceCount !== 1 ? 's' : ''} reviewed by our team, ${unreviewedEvidenceCount} direct portal excerpt${unreviewedEvidenceCount !== 1 ? 's' : ''}`}>
                    <div className="stat-tile-card">
                      <div className="stat-tile-icon-box">
                        <CircleCheck size={22} />
                      </div>
                      <div className="stat-tile-content">
                        <span className="stat-tile-number">{reviewedCount} Reviewed</span>
                        <span className="stat-tile-label">by our team</span>
                      </div>
                    </div>
                  </Tooltip>

                  <div className="stat-tile-card">
                    <div className="stat-tile-icon-box">
                      <CalendarDays size={22} />
                    </div>
                    <div className="stat-tile-content">
                      <span className="stat-tile-number">{lastUpdated}</span>
                      <span className="stat-tile-label">Checked on</span>
                    </div>
                  </div>
                </div>

                {/* Key Evidence Card */}
                {evidence.length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Key official evidence</h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => setTab('Evidence')}>
                        View all evidence <ArrowRight size={14} />
                      </button>
                    </div>
                    <EvidenceCard item={evidence[0]} index={0} total={evidence.length} onCopy={handleCopyText} />
                  </>
                )}

                {evidence.length === 0 && !researchLoading && (
                  <div className="empty-state-card" style={{ marginTop: 24 }}>
                    <HelpCircle />
                    <h3>No evidence available</h3>
                    <p>We could not find direct policy passages for this institution. Try searching another school.</p>
                  </div>
                )}
              </div>
            )}

            {/* ================= EVIDENCE TAB ================= */}
            {tab === 'Evidence' && (
              <div className="tab-content-panel">
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Official source evidence</h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                    Explore the original quotations and conditions behind {schoolName}'s financial aid policy.
                  </p>
                </div>

                {evidence.length > 0 ? (
                  evidence.map((item, idx) => (
                    <EvidenceCard key={idx} item={item} index={idx} total={evidence.length} onCopy={handleCopyText} />
                  ))
                ) : (
                  <div className="empty-state-card">
                    <HelpCircle />
                    <h3>No evidence passages</h3>
                    <p>No policy passages are currently recorded for this school.</p>
                  </div>
                )}
              </div>
            )}

            {/* ================= NEXT QUESTIONS SECTION & TAB ================= */}
            {(tab === 'Next Questions' || tab === 'Overview') && dynamicQuestions.length > 0 && (
              <section className="questions-section-wrap" id="questions-section">
                <div className="questions-header-bar">
                  <div className="questions-heading-col">
                    <h2>Next Questions to Ask</h2>
                    <p>
                      Curated questions to verify directly with {schoolName}'s financial-aid office. The Agentboxd export is an operator-assisted demo, not an automatic email.
                    </p>
                  </div>

                  {/* Progress Header */}
                  <div className="questions-progress-box">
                    <span className="progress-text-label">
                      {askedQuestions.size} of {dynamicQuestions.length} asked
                    </span>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${(askedQuestions.size / dynamicQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="questions-global-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => setEmailComposerOpen(true)}>
                      <Mail size={14} /> Prepare Inquiry Email
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const allTxt = dynamicQuestions.map((q, i) => `${i + 1}. ${q.question}\n   Context: ${q.why}`).join('\n\n');
                        handleCopyText(allTxt, 'All questions copied to clipboard');
                      }}
                    >
                      <Copy size={14} /> Copy all
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportChecklist}>
                      <Download size={14} /> Export checklist
                    </button>
                  </div>
                </div>

                {/* Categorized Grid */}
                {['Applying', 'Deadlines', 'Aid types and eligibility'].map((categoryName) => {
                  const categoryQuestions = dynamicQuestions.filter(q => q.category === categoryName);
                  if (categoryQuestions.length === 0) return null;

                  return (
                    <div key={categoryName} className="questions-category-group">
                      <div className="category-title-row">
                        <span className="category-icon">
                          {categoryName === 'Applying' && <Layers3 size={18} />}
                          {categoryName === 'Deadlines' && <CalendarDays size={18} />}
                          {categoryName === 'Aid types and eligibility' && <ShieldCheck size={18} />}
                        </span>
                        <h3>{categoryName}</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          ({categoryQuestions.length})
                        </span>
                      </div>

                      <div className="questions-cards-grid">
                        {categoryQuestions.map((q) => {
                          const isAsked = askedQuestions.has(q.id);
                          const isExpanded = expandedQuestions.has(q.id);

                          return (
                            <article
                              key={q.id}
                              className={`question-card ${isAsked ? 'asked' : ''}`}
                            >
                              <div>
                                <div className="question-card-top">
                                  <span className={`priority-badge ${q.priority === 'High' ? 'priority-high' : 'priority-medium'}`}>
                                    {q.priority} Priority
                                  </span>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleCopyText(q.question, 'Question copied to clipboard')}
                                    title="Copy question text"
                                  >
                                    <Copy size={13} />
                                  </button>
                                </div>

                                <h4 className="question-card-title">{q.question}</h4>
                                <p className="question-why-hint">
                                  <strong>Why it matters:</strong> {q.why}
                                </p>

                                {isExpanded && (
                                  <div className="question-expanded-area">
                                    <p><strong>Suggested follow-up:</strong> {q.followUp}</p>
                                    <small>Office contact: {schoolDomain}</small>
                                  </div>
                                )}
                              </div>

                              <div className="question-card-footer">
                                <label className="asked-checkbox-label">
                                  <div
                                    className={`custom-checkbox-box ${isAsked ? 'checked' : ''}`}
                                    onClick={() => toggleAsked(q.id)}
                                  >
                                    {isAsked && <Check size={13} strokeWidth={3} />}
                                  </div>
                                  <span>{isAsked ? 'Marked as asked' : 'Mark as asked'}</span>
                                </label>

                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => toggleExpand(q.id)}
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <>Less <ChevronUp size={14} /></>
                                  ) : (
                                    <>Expand <ChevronDown size={14} /></>
                                  )}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </div>

          {/* ================= RESEARCH CONTEXT SIDEBAR ================= */}
          <aside className="context-sidebar-sticky">
            <div className="context-card-modern">
              <div className="context-card-header">
                <h3><SlidersHorizontal size={16} /> Research Context</h3>
                <button className="context-edit-btn" onClick={() => setEditModalOpen(true)}>
                  Edit
                </button>
              </div>

              <div className="context-chips-list">
                <div className="context-chip-row">
                  <span className="context-chip-key"><UserRound /> Applicant type</span>
                  <span className="context-chip-value">{contextData.applicantType}</span>
                </div>
                <div className="context-chip-row">
                  <span className="context-chip-key"><Layers3 /> Needs financial aid</span>
                  <span className="context-chip-value">{contextData.needsAid}</span>
                </div>
                <div className="context-chip-row">
                  <span className="context-chip-key"><CircleCheck /> Requested aid</span>
                  <span className="context-chip-value">{contextData.requestedAid}</span>
                </div>
                <div className="context-chip-row">
                  <span className="context-chip-key"><CalendarDays /> Entry year</span>
                  <span className="context-chip-value">{contextData.entryYear}</span>
                </div>
              </div>
            </div>

            {/* Jump to Questions Action Box */}
            <div className="jump-questions-box">
              <h4>Ready to take action?</h4>
              <p>Review the customized question checklist for {schoolName}'s admission office.</p>
              <button className="btn btn-primary btn-md" style={{ width: '100%' }} onClick={scrollToQuestions}>
                Jump to Next Questions
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Edit Context Modal Dialog */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-dialog-header">
              <h3>Edit Research Context</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-field">
              <label htmlFor="ctx-applicant">Applicant Type</label>
              <select
                id="ctx-applicant"
                value={contextData.applicantType}
                onChange={(e) => setContextData({ ...contextData, applicantType: e.target.value })}
              >
                <option value="First-year">First-year</option>
                <option value="Transfer">Transfer</option>
                <option value="International Exchange">International Exchange</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="ctx-needs-aid">Do you need financial aid?</label>
              <select
                id="ctx-needs-aid"
                value={contextData.needsAid}
                onChange={(e) => setContextData({ ...contextData, needsAid: e.target.value })}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Unsure">Unsure</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="ctx-req-aid">Requested financial aid?</label>
              <select
                id="ctx-req-aid"
                value={contextData.requestedAid}
                onChange={(e) => setContextData({ ...contextData, requestedAid: e.target.value })}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Unsure">Unsure</option>
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="ctx-entry">Planned Entry Year</label>
              <select
                id="ctx-entry"
                value={contextData.entryYear}
                onChange={(e) => setContextData({ ...contextData, entryYear: e.target.value })}
              >
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
              </select>
            </div>

            <div className="modal-dialog-actions">
              <button className="btn btn-secondary btn-md" onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-md"
                onClick={() => {
                  setEditModalOpen(false);
                  addToast('Research context updated: re-running research...');
                  doResearch(true);
                }}
              >
                Save & Update Policy
              </button>
            </div>
          </div>
        </div>
      )}

      <EmailComposerModal
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        schoolName={schoolName}
        schoolDomain={schoolDomain}
        inquiryEmail={researchData?.school?.inquiry_email || school?.inquiry_email}
        questions={dynamicQuestions}
        sources={evidence}
      />

      <Footer onExplore={onNewSearch} onNavigateSection={onNavigateSection} />
    </>
  );
}

// ============================================================================
// SHARED FOOTER
// ============================================================================
function Footer({ onExplore, onNavigateSection }) {
  const handleSection = (secId) => {
    if (onNavigateSection) {
      onNavigateSection(secId);
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner-content">
        <div className="footer-top-row">
          <Logo />
          <nav className="footer-nav-links" aria-label="Footer navigation">
            <button type="button" onClick={() => handleSection('how')}>
              How It Works
            </button>
            <button type="button" onClick={() => handleSection('inquiry')}>
              Inquiry Flow
            </button>
            <button type="button" onClick={() => handleSection('trust')}>
              Why Trust Us
            </button>
            <button type="button" onClick={onExplore} style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Explore Universities
            </button>
          </nav>
        </div>

        <div className="disclaimer-banner">
          <strong>Notice:</strong> Second Chance gathers source-linked information directly from official university portals.
          Policies, admission conditions, and application deadlines may change across admission cycles. Always confirm current requirements directly with your institution's financial-aid office.
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// ROOT APPLICATION CONTAINER & ROUTING
// ============================================================================
function App() {
  const [page, setPage] = useState('home');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [operatorDraftData, setOperatorDraftData] = useState(null);

  const handleOpenOperator = (draft) => {
    if (draft && !draft.nativeEvent) {
      setOperatorDraftData(draft);
    }
    setOperatorModalOpen(true);
  };

  const navigateToSearch = () => {
    setPage('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToHome = () => {
    setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToDashboard = (school) => {
    setSelectedSchool(school);
    setPage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateSection = (sectionId) => {
    if (page !== 'home') {
      setPage('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 70);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <a href="#main" className="skip-link">Skip to main content</a>
        
        {page === 'home' && (
          <div key="home" className="page-transition">
            <Home
              onExplore={navigateToSearch}
              onNavigateSection={handleNavigateSection}
              onOpenOperator={handleOpenOperator}
            />
          </div>
        )}
        
        {page === 'search' && (
          <div key="search" className="page-transition">
            <SearchPage
              onBack={navigateToHome}
              onSelect={navigateToDashboard}
              onNavigateSection={handleNavigateSection}
              onOpenOperator={handleOpenOperator}
            />
          </div>
        )}
        
        {page === 'dashboard' && (
          <div key="dashboard" className="page-transition">
            <Dashboard
              onBack={navigateToSearch}
              onNewSearch={navigateToSearch}
              selectedSchool={selectedSchool}
              onNavigateSection={handleNavigateSection}
              onOpenOperator={handleOpenOperator}
            />
          </div>
        )}

        <OperatorPortalModal
          isOpen={operatorModalOpen}
          onClose={() => setOperatorModalOpen(false)}
          initialDraft={operatorDraftData}
        />
      </div>
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
