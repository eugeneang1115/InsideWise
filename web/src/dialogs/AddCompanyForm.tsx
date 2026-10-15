import { useState } from 'react';
import cities from '../../../server/seed/my-cities.json';
import { api, ApiFailure } from '../api';
import { errorText, useApp } from '../context';
import { COMPANY_SIZES, INDUSTRIES } from '../i18n';
import { ReviewForm } from './ReviewForm';

const byState = cities.reduce<Record<string, string[]>>((acc, c) => {
  (acc[c.state] ??= []).push(c.city);
  return acc;
}, {});

/** Adds a company, then goes straight on to writing a review for it. */
export function AddCompanyForm({ initialName = '' }: { initialName?: string }) {
  const { t, openDialog, toast, refreshData, navigate } = useApp();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setError(undefined);
    try {
      const { company } = await api.addCompany({ name: f.name, industry: f.industry, city: f.city, size: f.size, website: f.website });
      refreshData();
      toast(t('companyAdded'));
      navigate(`#/company/${encodeURIComponent(company.id)}`);
      openDialog(t('write'), <ReviewForm companyId={company.id} />);
    } catch (err) {
      if (err instanceof ApiFailure && err.code === 'companyExists' && typeof err.data.companyId === 'string') {
        toast(t('companyExists'));
        navigate(`#/company/${encodeURIComponent(err.data.companyId)}`);
        openDialog(t('write'), <ReviewForm companyId={err.data.companyId} />);
        return;
      }
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit}>
      <p className="privacy-note">{t('addCompanyNote')}</p>
      <label>{t('companyName')}<input name="name" required minLength={2} maxLength={120} defaultValue={initialName} autoComplete="organization" /></label>
      <div className="form-row">
        <label>{t('industry')}
          <select name="industry" required defaultValue="">
            <option value="" disabled>{t('choose')}</option>
            {INDUSTRIES.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
        </label>
        <label>{t('city')}
          <select name="city" required defaultValue="">
            <option value="" disabled>{t('choose')}</option>
            {Object.entries(byState).map(([state, list]) => (
              <optgroup key={state} label={state}>{list.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
            ))}
          </select>
        </label>
      </div>
      <label>{t('sizeOptional')}
        <select name="size" defaultValue="">
          <option value="">—</option>
          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} {t('employees')}</option>)}
        </select>
      </label>
      <label>{t('websiteOptional')}<input name="website" type="url" inputMode="url" placeholder="https://" maxLength={200} /></label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{t('addCompany')}</button>
    </form>
  );
}
