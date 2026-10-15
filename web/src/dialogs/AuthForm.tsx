import { useState } from 'react';
import { api } from '../api';
import { errorText, useApp } from '../context';

export function AuthForm({ reasonKey, onDone }: { reasonKey: string; onDone: () => void }) {
  const { t, setMe, closeDialog } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      const me = await api.auth(mode, String(data.get('email')), String(data.get('password')));
      setMe(me);
      closeDialog();
      onDone();
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="review-form" onSubmit={submit}>
      {reasonKey !== 'authNote' && <p className="privacy-note">{t(reasonKey)}</p>}
      <p className="small muted">{t('authNote')}</p>
      <label>{t('email')}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label>{t('password')}
        <input name="password" type="password" required minLength={10} maxLength={200}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{t(mode === 'login' ? 'signin' : 'register')}</button>
      <button type="button" className="link-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(undefined); }}>
        {t(mode === 'login' ? 'needAccount' : 'haveAccount')}
      </button>
    </form>
  );
}
