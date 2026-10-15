import { useState } from 'react';
import { api } from '../api';
import { errorText, useApp } from '../context';

export function ReportForm({ reviewId }: { reviewId: string }) {
  const { t, closeDialog, toast } = useApp();
  const [error, setError] = useState<string>();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api.report(reviewId, String(new FormData(e.currentTarget).get('reason')));
      closeDialog();
      toast(t('reportSent'));
    } catch (err) {
      setError(errorText(t, err));
    }
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <label>{t('reason')}<textarea name="reason" required minLength={10} maxLength={1000} rows={4} /></label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="button primary">{t('confirm')}</button>
    </form>
  );
}

export function AppealForm({ reviewId, onDone }: { reviewId: string; onDone: () => void }) {
  const { t, closeDialog, toast } = useApp();
  const [error, setError] = useState<string>();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api.appeal(reviewId, String(new FormData(e.currentTarget).get('message')));
      closeDialog();
      toast(t('appealSent'));
      onDone();
    } catch (err) {
      setError(errorText(t, err));
    }
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <label>{t('appealMessage')}<textarea name="message" required minLength={10} maxLength={1000} rows={4} /></label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="button primary">{t('appeal')}</button>
    </form>
  );
}

export function Confirm({ message, onConfirm }: { message: string; onConfirm: () => Promise<void> }) {
  const { t, closeDialog } = useApp();
  const [error, setError] = useState<string>();
  return (
    <div className="review-form">
      <p>{message}</p>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="button-row">
        <button className="button" onClick={closeDialog}>{t('cancel')}</button>
        <button className="button danger" onClick={() => onConfirm().then(closeDialog, (err) => setError(errorText(t, err)))}>{t('confirm')}</button>
      </div>
    </div>
  );
}
