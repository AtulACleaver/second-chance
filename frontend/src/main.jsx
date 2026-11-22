import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, ArrowLeft, Search, ExternalLink, MapPin, Link as LinkIcon,
  RefreshCw, FileText, CircleCheck, CalendarDays, UserRound, Layers3,
  MessageCircle, ChevronDown, ChevronUp, Quote, ShieldCheck, Zap, Menu, X, BookOpen,
  Copy, Check, Info, AlertTriangle, Sparkles, Building2, HelpCircle, CheckSquare,
  Square, Download, Share2, Eye, ShieldAlert, SlidersHorizontal, CornerDownRight
} from 'lucide-react';
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

function Nav({ onHome, onExplore, active = 'home' }) {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            <a href="#how" className="nav-link-item">How It Works</a>
            <a href="#trust" className="nav-link-item">Why Trust Us</a>
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
        <a href="#how" className="btn btn-ghost btn-md" onClick={() => setMenu(false)}>
          How It Works
        </a>
        <a href="#trust" className="btn btn-ghost btn-md" onClick={() => setMenu(false)}>
          Why Trust Us
        </a>
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
            <div className="side-tab"><ShieldCheck size={14} /> Verified Sources</div>
          </aside>
          
          <div className="preview-main-body">
            <div className="preview-crumb">Research <span>›</span> Cornell University <span>›</span> Financial Aid</div>
            <div className="preview-title-bar">
              <div>
                <h3>Cornell University</h3>
                <div className="preview-meta-line">
                  <MapPin size={12} /> Ithaca, New York <span>·</span>
                  <LinkIcon size={12} /> cornell.edu
                </div>
              </div>
              <Tooltip text="Newly retrieved from official university pages">
                <span className="badge badge-fresh">
                  <span className="badge-fresh-dot" /> Fresh
                </span>
              </Tooltip>
            </div>

            <div className="preview-stats-grid">
              <div className="preview-box summary">
                <h4>What we found</h4>
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
                <span>2 Automated</span>
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
function Home({ onExplore }) {
  const headlineWords = [
    'Your', 'university', 'journey', 'deserves', 'more'
  ];

  return (
    <>
      <Nav onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onExplore={onExplore} active="home" />
      
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
              <a className="btn btn-secondary btn-lg" href="#how">
                How It Works
              </a>
            </div>

            {/* Interactive Trust Chips */}
            <div className="trust-chips-row">
              <div className="trust-chip">
                <FileText size={16} /> Official sources only
              </div>
              <div className="trust-chip">
                <ShieldCheck size={16} /> Source-linked evidence
              </div>
              <div className="trust-chip">
                <Zap size={16} /> Actionable next questions
              </div>
            </div>

            {/* Interactive 3D Mockup */}
            <ProductPreview onOpen={onExplore} />
          </div>
        </section>

        {/* Section 1: 3-Step Animated Timeline ("How It Works") */}
        <section className="timeline-section" id="how">
          <div className="section-eyebrow">HOW IT WORKS</div>
          <h2 className="section-heading-lg">Clarity at every step of your research.</h2>

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
                Read exact quotations extracted directly from verified financial-aid pages, complete with review status and scope.
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

        {/* Section 2: Why Trust Second Chance */}
        <section className="trust-section" id="trust">
          <div className="trust-inner">
            <div className="section-eyebrow">WHY TRUST SECOND CHANCE</div>
            <h2 className="section-heading-lg">Evidence you can independently verify.</h2>

            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-icon-box">
                  <Building2 size={22} />
                </div>
                <h4>Official sources only</h4>
                <p>
                  We fetch information strictly from verified `.edu` university portals and official financial-aid offices. No forum rumors or third-party guesses.
                </p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <ShieldCheck size={22} />
                </div>
                <h4>Every claim linked to evidence</h4>
                <p>
                  Every summary statement links to the exact source passage and original URL, so you can inspect the full policy in its original context.
                </p>
              </div>

              <div className="trust-item">
                <div className="trust-icon-box">
                  <Eye size={22} />
                </div>
                <h4>Reviewed vs Unreviewed labels</h4>
                <p>
                  We are transparent about data verification. Human-checked quotes are marked green; automated scraper extractions are clearly flagged for caution.
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
            <strong>50+</strong>
            <span>Verified university policies</span>
          </div>
          <div className="metric-tile">
            <strong>3-Step</strong>
            <span>Guided research workflow</span>
          </div>
          <div className="metric-tile">
            <strong>0</strong>
            <span>Ads, cookies or guesswork</span>
          </div>
        </section>

        {/* Final CTA Band */}
        <section className="cta-band">
          <h2>Make the fine print easier to navigate.</h2>
          <p>
            Join thousands of international applicants getting source-backed confidence on university financial aid.
          </p>
          <button className="btn btn-secondary btn-lg" onClick={onExplore}>
            Explore Universities Now <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer onExplore={onExplore} />
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

const CURATED_DIRECTORY = [
  { id: 'curated:cornell', name: 'Cornell University', location: 'Ithaca, NY', domain: 'cornell.edu' },
  { id: 'curated:columbia', name: 'Columbia University', location: 'New York, NY', domain: 'columbia.edu' },
  { id: 'curated:princeton', name: 'Princeton University', location: 'Princeton, NJ', domain: 'princeton.edu' },
  { id: 'curated:harvard', name: 'Harvard University', location: 'Cambridge, MA', domain: 'harvard.edu' },
  { id: 'curated:mit', name: 'Massachusetts Institute of Technology', location: 'Cambridge, MA', domain: 'mit.edu' },
  { id: 'curated:stanford', name: 'Stanford University', location: 'Stanford, CA', domain: 'stanford.edu' }
];

function SearchPage({ onBack, onSelect }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Reading official financial-aid pages...');
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  // Live Autocomplete Suggestions
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const filtered = CURATED_DIRECTORY.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
    setShowDropdown(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [query]);

  const executeSearch = (targetQuery) => {
    const q = (targetQuery || query).trim();
    if (!q) return;
    setShowDropdown(false);
    setLoading(true);
    setSearched(false);
    setLoadingMessage('Looking through verified university directory...');

    setTimeout(() => {
      setLoadingMessage('Reading official financial-aid pages...');
    }, 280);

    // Filter directory or query backend
    setTimeout(() => {
      const filtered = CURATED_DIRECTORY.filter(item =>
        item.name.toLowerCase().includes(q.toLowerCase())
      );
      // Fallback: if no direct match, show Cornell as relevant sample
      setResults(filtered.length > 0 ? filtered : [CURATED_DIRECTORY[0]]);
      setLoading(false);
      setSearched(true);
    }, 550);
  };

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
      <Nav onHome={onBack} onExplore={() => window.scrollTo({ top: 0, behavior: 'smooth' })} active="explore" />
      
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

        {/* Large Focal Search Bar with Glowing Emerald Focus Ring */}
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
                const before = item.name.slice(0, matchIndex);
                const match = item.name.slice(matchIndex, matchIndex + query.length);
                const after = item.name.slice(matchIndex + query.length);

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
                      <small style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>· {item.location}</small>
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

        {/* Shimmer Loading State */}
        {loading && (
          <div className="loading-indicator-box">
            <div className="loading-spinner-ring" />
            <p>{loadingMessage}</p>
          </div>
        )}

        {/* Results List */}
        {!loading && searched && results.length > 0 && (
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
                  <span>{school.location} · {school.domain}</span>
                </div>
                <span className="verified-domain-pill">
                  <ShieldCheck size={14} /> Domain verified
                </span>
                <ArrowRight size={18} style={{ color: 'var(--forest-600)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        )}

        {/* Friendly Empty State */}
        {!loading && searched && results.length === 0 && (
          <div className="empty-state-card">
            <HelpCircle />
            <h3>No matching universities found</h3>
            <p>Try searching for "Cornell University", "MIT", or "Columbia".</p>
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

      <Footer onExplore={() => {}} />
    </>
  );
}

// ============================================================================
// PAGE 3: UNIVERSITY RESULTS PAGE (CORNELL UNIVERSITY EXAMPLE)
// ============================================================================
const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    category: 'Applying',
    question: 'Do international students need to apply for financial aid separately?',
    why: 'Some schools mandate the CSS Profile and ISFAA concurrently with the application deadline.',
    priority: 'High',
    followUp: 'Ask if international aid applications submitted after admission decisions can ever be considered.'
  },
  {
    id: 'q2',
    category: 'Deadlines',
    question: 'Are there specific deadlines for international aid applicants?',
    why: 'Aid deadlines often precede regular admission notification dates by several months.',
    priority: 'High',
    followUp: 'Request the exact deadline and time zone for CSS Profile submission.'
  },
  {
    id: 'q3',
    category: 'Aid types and eligibility',
    question: 'What types of aid (grants, loans, work-study) are available to international students?',
    why: 'Federal loans are unavailable to non-citizens, so university grants make up the core of packages.',
    priority: 'High',
    followUp: 'Verify if on-campus work-study hours are permitted under your F-1 student visa regulations.'
  },
  {
    id: 'q4',
    category: 'Applying',
    question: 'Does requesting financial aid affect how my admission application is evaluated?',
    why: 'Cornell is need-aware for international students, meaning demonstrated need is factored into admissions.',
    priority: 'High',
    followUp: 'Inquire whether admitting criteria differ between Early Decision and Regular Decision rounds.'
  },
  {
    id: 'q5',
    category: 'Aid types and eligibility',
    question: 'If aid is awarded, does it cover the full cost of attendance across all 4 years?',
    why: 'Living costs, health insurance, and annual tuition increases must be accounted for.',
    priority: 'Medium',
    followUp: 'Confirm whether the award adjusts automatically if tuition rates increase.'
  },
  {
    id: 'q6',
    category: 'Deadlines',
    question: 'What documentation is required to appeal a financial aid package?',
    why: 'Sudden changes in currency exchange rates or parental finances can warrant an appeal.',
    priority: 'Medium',
    followUp: 'Ask for the official appeal form and supporting document checklist.'
  }
];

function Dashboard({ onBack, onNewSearch, selectedSchool }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState('Overview');
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now (Nov 22, 2026, 7:14 PM IST)');
  
  // Question tracking state
  const [askedQuestions, setAskedQuestions] = useState(new Set());
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  // Edit context modal state
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
    domain: 'cornell.edu'
  };

  const passageCount = useCountUp(3);
  const reviewedCount = useCountUp(1);

  // Toggle asked state
  const toggleAsked = (id) => {
    setAskedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle expand card details
  const toggleExpand = (id) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy helper
  const handleCopyText = async (text, toastMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(toastMsg || 'Copied to clipboard');
    } catch {
      addToast('Unable to copy', 'info');
    }
  };

  // Export checklist helper
  const handleExportChecklist = () => {
    const lines = [
      `SECOND CHANCE — FINANCIAL AID INQUIRY CHECKLIST`,
      `Institution: ${school.name} (${school.domain})`,
      `Generated: ${new Date().toLocaleString()}`,
      `============================================================\n`,
      ...SAMPLE_QUESTIONS.map((q, idx) => {
        const isDone = askedQuestions.has(q.id) ? '[X]' : '[ ]';
        return `${isDone} ${idx + 1}. [${q.category.toUpperCase()}] ${q.question}\n    Why: ${q.why}\n`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${school.name.replace(/\s+/g, '_')}_Financial_Aid_Checklist.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Checklist exported successfully');
  };

  // Refresh action
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated('Updated just now (Source verification complete)');
      addToast('Updated just now — refreshed official Cornell sources');
    }, 850);
  };

  // Jump to Next Questions action
  const scrollToQuestions = () => {
    setTab('Next Questions');
    const el = document.getElementById('questions-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Nav onHome={onBack} onExplore={onNewSearch} active="explore" />

      <main className="dashboard-container" id="main">
        <button className="back-btn" onClick={onBack} aria-label="Go back to search results">
          <ArrowLeft size={16} /> Back to search results
        </button>

        {/* University Header with Fixed Proper Image & Status Badges */}
        <header className="uni-header-banner">
          <div className="uni-photo-shell">
            {!imageLoaded && !imageError && <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            {!imageError ? (
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=360&q=80"
                alt={`${school.name} campus building`}
                className="uni-photo-img"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
            ) : (
              <div className="uni-photo-fallback">
                {school.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="uni-info-col">
            <h1>{school.name}</h1>
            <div className="uni-tags-row">
              <span><MapPin size={15} /> {school.location}</span>
              <span>
                <LinkIcon size={14} />
                <a href={`https://${school.domain}`} target="_blank" rel="noreferrer">
                  {school.domain} <ExternalLink size={12} />
                </a>
              </span>
              <Tooltip text="Verified official institution directory">
                <span className="badge badge-scope">
                  <ShieldCheck size={13} /> Official Domain
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="research-meta-widget">
            <Tooltip text="Live verification from official Cornell pages">
              <span className="badge badge-fresh">
                <span className="badge-fresh-dot" /> Fresh
              </span>
            </Tooltip>

            <div className="research-meta-text">
              <strong>Official policy verified</strong>
              <small>{lastUpdated}</small>
            </div>

            <button
              className="refresh-action-btn"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh financial aid data"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Verifying…' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation with Animated Sliding Underline */}
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
              {t === 'Evidence' && ' (3)'}
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
                {/* Highlighted "What We Found" Hero Card */}
                <article className="what-we-found-hero">
                  <h2>What we found</h2>
                  <p className="what-we-found-body">
                    Cornell meets <mark className="highlighter">100% of demonstrated financial need</mark> for{' '}
                    <mark className="highlighter">all admitted undergraduate students, including international students</mark>,
                    through a combination of need-based grants, student employment (work-study), and reasonable student loans.
                  </p>
                </article>

                {/* 3 Animated Stat Tiles */}
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

                  <Tooltip text="1 passage verified by human review, 2 retrieved via official automated fetch">
                    <div className="stat-tile-card">
                      <div className="stat-tile-icon-box">
                        <CircleCheck size={22} />
                      </div>
                      <div className="stat-tile-content">
                        <span className="stat-tile-number">{reviewedCount} Reviewed</span>
                        <span className="stat-tile-label">(2 automated checks)</span>
                      </div>
                    </div>
                  </Tooltip>

                  <div className="stat-tile-card">
                    <div className="stat-tile-icon-box">
                      <CalendarDays size={22} />
                    </div>
                    <div className="stat-tile-content">
                      <span className="stat-tile-number">Nov 22, 2026</span>
                      <span className="stat-tile-label">Checked on</span>
                    </div>
                  </div>
                </div>

                {/* Confidence / Evidence Quality Indicator */}
                <div className="quality-indicator-card">
                  <div className="quality-text-group">
                    <span className="quality-title">
                      <ShieldCheck size={16} /> Confidence & Evidence Quality
                    </span>
                    <span className="quality-desc">
                      1 of 3 passages human-verified · 2 verified via official directory parser
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="quality-meter-bar">
                      <div className="quality-meter-fill" style={{ width: '68%' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--forest-700)' }}>High</span>
                  </div>
                </div>

                {/* Key Evidence Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Key official evidence</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('Evidence')}>
                    View all evidence <ArrowRight size={14} />
                  </button>
                </div>

                <article className="evidence-quote-card">
                  <div className="evidence-card-top-row">
                    <span className="evidence-pass-label">Passage 1 of 3</span>
                    <Tooltip text="Reviewed and cross-checked against Cornell Undergraduate Aid guidelines">
                      <span className="badge badge-reviewed">
                        <CircleCheck size={14} /> Human-reviewed
                      </span>
                    </Tooltip>
                  </div>

                  <div className="evidence-quote-body">
                    <Quote className="decorative-quote-mark" size={32} />
                    <p className="quote-serif">
                      “Cornell meets the <mark className="highlighter">full demonstrated financial need</mark> of all admitted undergraduate students, <mark className="highlighter">including international students</mark>, through a combination of grants, student employment, and loans.”
                    </p>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
                    Scope: <strong>Undergraduate</strong> · Cycle: <strong>2026–2027</strong> · Source: <strong>Cornell Financial Aid Office</strong>
                  </div>

                  <div className="evidence-actions-bar">
                    <button
                      className="evidence-action-btn"
                      onClick={() => handleCopyText('Cornell meets the full demonstrated financial need of all admitted undergraduate students, including international students, through a combination of grants, student employment, and loans.', 'Quote copied to clipboard')}
                    >
                      <Copy size={13} /> Copy quote
                    </button>
                    <a
                      href="https://finaid.cornell.edu/apply-aid/prospective-international-applicants"
                      target="_blank"
                      rel="noreferrer"
                      className="evidence-action-btn"
                    >
                      <ExternalLink size={13} /> Open source page
                    </a>
                    <button
                      className="evidence-action-btn"
                      onClick={() => handleCopyText('Cornell University Financial Aid Office (2026). Prospective International Applicants Policy. https://finaid.cornell.edu/apply-aid/prospective-international-applicants', 'Citation copied to clipboard')}
                    >
                      <Share2 size={13} /> Copy citation
                    </button>
                  </div>
                </article>
              </div>
            )}

            {/* ================= EVIDENCE TAB ================= */}
            {tab === 'Evidence' && (
              <div className="tab-content-panel">
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Official source evidence</h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                    Explore the original passages and scope constraints behind Cornell's financial aid policy.
                  </p>
                </div>

                {/* Card 1 */}
                <article className="evidence-quote-card">
                  <div className="evidence-card-top-row">
                    <span className="evidence-pass-label">Passage 1</span>
                    <span className="badge badge-reviewed">
                      <CircleCheck size={14} /> Human-reviewed
                    </span>
                  </div>
                  <div className="evidence-quote-body">
                    <Quote className="decorative-quote-mark" size={32} />
                    <p className="quote-serif">
                      “Cornell meets the full demonstrated financial need of all admitted undergraduate students, including international students, through a combination of grants, student employment, and loans.”
                    </p>
                  </div>
                  <div className="evidence-actions-bar">
                    <button
                      className="evidence-action-btn"
                      onClick={() => handleCopyText('Cornell meets the full demonstrated financial need of all admitted undergraduate students, including international students, through a combination of grants, student employment, and loans.')}
                    >
                      <Copy size={13} /> Copy quote
                    </button>
                    <a href="https://finaid.cornell.edu/apply-aid/prospective-international-applicants" target="_blank" rel="noreferrer" className="evidence-action-btn">
                      <ExternalLink size={13} /> Open source
                    </a>
                  </div>
                </article>

                {/* Card 2 */}
                <article className="evidence-quote-card">
                  <div className="evidence-card-top-row">
                    <span className="evidence-pass-label">Passage 2</span>
                    <Tooltip text="Automated parser extraction; verify exact condition with the aid office">
                      <span className="badge badge-unreviewed">
                        <AlertTriangle size={14} /> Unreviewed
                      </span>
                    </Tooltip>
                  </div>
                  <div className="evidence-quote-body">
                    <Quote className="decorative-quote-mark" size={32} />
                    <p className="quote-serif">
                      “International first-year and transfer applicants seeking grant aid at any point during their undergraduate enrollment <mark className="highlighter">must apply for financial aid at the time of admission</mark>.”
                    </p>
                  </div>
                  <div className="evidence-actions-bar">
                    <button
                      className="evidence-action-btn"
                      onClick={() => handleCopyText('International first-year and transfer applicants seeking grant aid at any point during their undergraduate enrollment must apply for financial aid at the time of admission.')}
                    >
                      <Copy size={13} /> Copy quote
                    </button>
                    <a href="https://finaid.cornell.edu/apply-aid/prospective-international-applicants" target="_blank" rel="noreferrer" className="evidence-action-btn">
                      <ExternalLink size={13} /> Open source
                    </a>
                  </div>
                </article>
              </div>
            )}

            {/* ================= NEXT QUESTIONS (DEDICATED FULL-WIDTH SECTION & TAB) ================= */}
            {(tab === 'Next Questions' || tab === 'Overview') && (
              <section className="questions-section-wrap" id="questions-section">
                <div className="questions-header-bar">
                  <div className="questions-heading-col">
                    <h2>Next Questions to Ask</h2>
                    <p>
                      Curated, prioritized questions to clarify directly with Cornell’s financial-aid office.
                    </p>
                  </div>

                  {/* Progress Header ("X of Y questions asked") */}
                  <div className="questions-progress-box">
                    <span className="progress-text-label">
                      {askedQuestions.size} of {SAMPLE_QUESTIONS.length} asked
                    </span>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${(askedQuestions.size / SAMPLE_QUESTIONS.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="questions-global-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const allTxt = SAMPLE_QUESTIONS.map((q, i) => `${i + 1}. ${q.question}\n   Reason: ${q.why}`).join('\n\n');
                        handleCopyText(allTxt, 'All questions copied to clipboard');
                      }}
                    >
                      <Copy size={14} /> Copy all
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleExportChecklist}>
                      <Download size={14} /> Export checklist
                    </button>
                  </div>
                </div>

                {/* Categorized 2-3 Column Grid */}
                {['Applying', 'Deadlines', 'Aid types and eligibility'].map((categoryName) => {
                  const categoryQuestions = SAMPLE_QUESTIONS.filter(q => q.category === categoryName);
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
                                    <small>Verify with: finaid@cornell.edu</small>
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
              <p>Review the customized question checklist for Cornell’s admission team.</p>
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
                  addToast('Research context updated successfully');
                  handleRefresh();
                }}
              >
                Save & Update Policy
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer onExplore={onNewSearch} />
    </>
  );
}

// ============================================================================
// SHARED FOOTER
// ============================================================================
function Footer({ onExplore }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner-content">
        <div className="footer-top-row">
          <Logo />
          <nav className="footer-nav-links" aria-label="Footer navigation">
            <a href="#how">How It Works</a>
            <a href="#trust">Why Trust Us</a>
            <button onClick={onExplore} style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Explore Universities
            </button>
          </nav>
        </div>

        <div className="disclaimer-banner">
          <strong>Notice:</strong> Second Chance gathers source-linked information directly from official university web portals.
          Policies, admission conditions, and application deadlines may change across admission cycles. Always confirm current requirements directly with your institution’s financial-aid office.
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

  return (
    <ToastProvider>
      <div className="app-shell">
        <a href="#main" className="skip-link">Skip to main content</a>
        
        {page === 'home' && (
          <div key="home" className="page-transition">
            <Home onExplore={navigateToSearch} />
          </div>
        )}
        
        {page === 'search' && (
          <div key="search" className="page-transition">
            <SearchPage
              onBack={navigateToHome}
              onSelect={navigateToDashboard}
            />
          </div>
        )}
        
        {page === 'dashboard' && (
          <div key="dashboard" className="page-transition">
            <Dashboard
              onBack={navigateToSearch}
              onNewSearch={navigateToSearch}
              selectedSchool={selectedSchool}
            />
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
