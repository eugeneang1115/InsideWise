import { useEffect, useMemo, useState } from 'react';
import { api, type Company } from '../api';
import { errorText, useApp } from '../context';
import { INDUSTRIES, industriesMatching } from '../i18n';
import { SearchIcon, ShieldIcon } from '../icons';
import { MapView } from './MapView';
import { CompanyDetail } from './CompanyDetail';
import { ResultsPanel } from './ResultsPanel';
import { AddCompanyForm } from '../dialogs/AddCompanyForm';

export function Explore({ companyId, onWrite, onPrivacy }: { companyId?: string; onWrite: () => void; onPrivacy: () => void }) {
  const { t, navigate, dataVersion, withAccount, openDialog } = useApp();
  const addCompany = () => withAccount('signInToAdd', () => openDialog(t('addCompany'), <AddCompanyForm initialName={input.trim()} />));
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [minimum, setMinimum] = useState(0);
  const [sort, setSort] = useState('name');
  const [bbox, setBbox] = useState<string>();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    let live = true;
    setState('loading');
    api.companies({
      q: query || undefined, qIndustries: industriesMatching(query).join(',') || undefined,
      industry: industry || undefined, minRating: minimum || undefined, sort, bbox,
    }).then((r) => {
      if (!live) return;
      setCompanies(r.companies);
      setState('ready');
    }).catch((err) => { if (live) { setError(err); setState('error'); } });
    return () => { live = false; };
  }, [query, industry, minimum, sort, bbox, dataVersion, attempt]);

  // A new text search clears the map-area filter and moves the map to the matches.
  useEffect(() => { if (query) setBbox(undefined); }, [query]);
  useEffect(() => { if (query && state === 'ready') setFitSignal((n) => n + 1); }, [query, state]);

  const select = (id: string) => navigate(`#/company/${encodeURIComponent(id)}`);
  const reset = () => { setBbox(undefined); setResetSignal((n) => n + 1); };
  const visible = useMemo(() => companies, [companies]);

  return (
    <section className="screen">
      <section className="intro">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('tagline')}</h1>
          <p className="subtitle">{t('subtitle')}</p>
        </div>
        <button className="button primary write-top" onClick={onWrite}><span aria-hidden>✎</span><span>{t('write')}</span></button>
      </section>

      <section className="filters">
        <div className="search">
          <SearchIcon />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('search')} aria-label={t('search')} type="search" enterKeyHint="search" />
          {input && <button className="clear" onClick={() => setInput('')} aria-label={t('cancel')}>×</button>}
        </div>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label={t('all')}>
          <option value="">{t('all')}</option>
          {INDUSTRIES.map((k) => <option key={k} value={k}>{t(k)}</option>)}
        </select>
        <select value={minimum} onChange={(e) => setMinimum(Number(e.target.value))} aria-label={t('any')}>
          <option value={0}>{t('any')}</option>
          <option value={4}>{t('four')}</option>
          <option value={3}>{t('three')}</option>
        </select>
        <button className="filter-button" onClick={reset}>◎ &nbsp;{t('reset')}</button>
      </section>

      <div className="workspace">
        <ResultsPanel
          count={visible.length}
          sort={sort}
          onSort={setSort}
          footer={<div className="trust"><ShieldIcon /><div><strong>{t('privacyShort')}</strong><button onClick={onPrivacy}>{t('privacy')}</button></div></div>}
        >
          {state === 'error' ? (
            <div className="empty" role="alert"><p>{errorText(t, error)}</p><button className="button" onClick={() => setAttempt((n) => n + 1)}>{t('retry')}</button></div>
          ) : state === 'loading' && !visible.length ? (
            <p className="empty">{t('loading')}</p>
          ) : visible.length ? visible.map((c) => (
            <button key={c.id} className={`company-card${companyId === c.id ? ' selected' : ''}`} onClick={() => select(c.id)}>
              <span className="logo" style={{ background: c.color }}>{c.initials}</span>
              <div className="info">
                <h2>{c.name}<span aria-hidden>↗</span></h2>
                <p>{t(c.industry)} · {c.offices.map((o) => o.city).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
                <div className="card-rating">
                  <span className="stars">★</span><strong>{c.rating == null ? '—' : c.rating.toFixed(1)}</strong>
                  <span className="muted">({c.reviewCount} {t('reviews')})</span>
                  {c.isDemo && <span className="sample">DEMO</span>}
                  {c.userAdded && <span className="sample">{t('userAdded')}</span>}
                </div>
                {c.size && <span className="pill">{c.size} {t('employees')}</span>}
              </div>
            </button>
          )) : (
            <div className="empty">
              <p>{query || industry || minimum || bbox ? t('empty') : t('noCompaniesYet')}</p>
              <button className="button primary" onClick={addCompany}>+ &nbsp;{t('addCompany')}</button>
            </div>
          )}
          {visible.length > 0 && <button className="add-company-row" onClick={addCompany}>+ &nbsp;{t('addCompanyHint')}</button>}
        </ResultsPanel>

        <MapView companies={visible} selectedId={companyId} onSelect={select} onSearchArea={setBbox} resetSignal={resetSignal} fitSignal={fitSignal} />

        {companyId && <CompanyDetail key={companyId} id={companyId} onClose={() => navigate('#/')} onWrite={onWrite} />}
      </div>

      <footer><span className="dot" /><span>{t('demo')}</span><button onClick={onPrivacy}>{t('privacy')}</button></footer>
    </section>
  );
}
