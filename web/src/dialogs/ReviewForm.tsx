import { useEffect, useRef, useState } from 'react';
import { api, type Company, type OwnReview, type ReviewInput } from '../api';
import { errorText, useApp } from '../context';
import { LANGS, METRICS } from '../i18n';

const DRAFT_KEY = 'iw-review-draft';
const PERSONAL = [/[\w.+-]+@[\w-]+(\.[\w-]+)+/i, /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/, /(\+?6?0)[- ]?1\d[- ]?\d{3,4}[- ]?\d{4}\b/];

type Draft = Record<string, string>;
const loadDraft = (): Draft => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}'); } catch { return {}; } };
const saveDraft = (d: Draft | null) => { try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ } };

/** New review (optionally for a given company) or an edit of the viewer's own review. */
export function ReviewForm({ companyId, existing, onSaved }: { companyId?: string; existing?: OwnReview; onSaved?: () => void }) {
  const { t, lang, closeDialog, toast, refreshData, navigate } = useApp();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // Unsent new reviews survive closing the dialog, on this device only.
  const [draft] = useState<Draft>(() => (existing ? {} : loadDraft()));
  const initial = (k: string) => (existing ? String((existing as unknown as Record<string, unknown>)[k] ?? '') : draft[k] ?? '');
  const initialCompany = existing?.companyId ?? companyId ?? draft.companyId ?? '';

  useEffect(() => {
    if (existing) return;
    api.companies({ sort: 'name' }).then((r) => setCompanies(r.companies)).catch(() => {});
  }, [existing]);

  const persist = () => {
    if (existing || !form.current) return;
    const d: Draft = {};
    new FormData(form.current).forEach((v, k) => { if (typeof v === 'string' && k !== 'consent') d[k] = v; });
    saveDraft(d);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (PERSONAL.some((re) => re.test(`${f.title}\n${f.pros}\n${f.cons}`))) return setError(t('personal'));
    const body = {
      employment: f.employment as 'current' | 'former', language: f.language,
      ...Object.fromEntries(METRICS.map((k) => [k, Number(f[k])])) as Record<(typeof METRICS)[number], number>,
      title: f.title, pros: f.pros, cons: f.cons, consent: true as const,
    };
    setBusy(true);
    setError(undefined);
    try {
      if (existing) await api.updateReview(existing.id, { ...body, version: existing.version });
      else {
        await api.createReview({ ...body, companyId: f.companyId } as ReviewInput);
        saveDraft(null);
      }
      closeDialog();
      toast(t('saved'));
      refreshData();
      onSaved?.();
      if (!existing) navigate('#/mine');
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={form} className="review-form" onSubmit={submit} onChange={persist}>
      <p className="privacy-note">{t('prototypeSubmit')} {t('smallTeam')}</p>
      <label>{t('reviewFor')}
        {existing ? <input value={existing.companyName} disabled /> : (
          <select name="companyId" required defaultValue={initialCompany} key={companies.length}>
            <option value="" disabled>{t('choose')}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </label>
      <div className="form-row">
        <label>{t('relationship')}
          <select name="employment" defaultValue={initial('employment') || 'current'}>
            <option value="current">{t('current')}</option>
            <option value="former">{t('former')}</option>
          </select>
        </label>
        <label>{t('language')}
          <select name="language" defaultValue={initial('language') || lang}>
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>
      </div>
      <div className="rating-inputs">
        {METRICS.map((k) => (
          <label key={k}>{t(k)}
            <select name={k} required defaultValue={initial(k)}>
              <option value="" disabled>—</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {'★'.repeat(n)}</option>)}
            </select>
          </label>
        ))}
      </div>
      <label>{t('title')}<input name="title" required minLength={5} maxLength={120} defaultValue={initial('title')} /></label>
      <label>{t('pros')}
        <textarea name="pros" required minLength={20} maxLength={2000} rows={4} defaultValue={initial('pros')} />
        <span className="form-hint">20–2,000 {t('charCount')}</span>
      </label>
      <label>{t('cons')}
        <textarea name="cons" required minLength={20} maxLength={2000} rows={4} defaultValue={initial('cons')} />
        <span className="form-hint">20–2,000 {t('charCount')}</span>
      </label>
      <label className="checkbox"><input type="checkbox" name="consent" required />{t('consent')}</label>
      {error && <p className="error-text" role="alert">{error}</p>}
      {!existing && <p className="form-hint">{t('draftKept')}</p>}
      <button className="button primary full" disabled={busy}>{t('submit')}</button>
    </form>
  );
}
