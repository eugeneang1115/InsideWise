import { useCallback, useEffect, useState } from 'react';
import { api, isNative, type OwnReview } from '../api';
import { errorText, useApp } from '../context';
import { AppealForm, Confirm } from '../dialogs/ReportForm';
import { ReviewForm } from '../dialogs/ReviewForm';
import { ReviewBody, StatusBadge } from '../ui';

const APPEALABLE = new Set(['rejected', 'changes_requested', 'hidden']);

export function MyReviews({ onWrite }: { onWrite: () => void }) {
  const { t, me, setMe, openDialog, withAccount, toast, refreshData, navigate } = useApp();
  const [reviews, setReviews] = useState<OwnReview[]>();
  const [error, setError] = useState<unknown>();

  const load = useCallback(() => {
    if (!me) return;
    api.myReviews().then((r) => setReviews(r.reviews)).catch(setError);
  }, [me]);
  useEffect(load, [load]);

  if (!me) {
    return (
      <section className="screen account">
        <h1>{t('mine')}</h1>
        <p>{t('signInToSee')}</p>
        <button className="button primary" onClick={() => withAccount('signInToSee', () => {})}>{t('signin')}</button>
      </section>
    );
  }

  const remove = (r: OwnReview) => openDialog(t('delete'), <Confirm message={t('deleteConfirm')} onConfirm={async () => {
    await api.deleteReview(r.id);
    toast(t('deleted'));
    refreshData();
    load();
  }} />);

  const exportData = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      if (isNative) {
        // Android WebViews ignore download links; show the data so it can be copied instead.
        openDialog(t('exportData'), <pre className="export">{JSON.stringify(data, null, 2)}</pre>);
        return;
      }
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'kerjainside-data.json' });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast(errorText(t, err));
    }
  };

  const deleteAccount = () => openDialog(t('deleteAccount'), <Confirm message={t('deleteAccountConfirm')} onConfirm={async () => {
    await api.deleteAccount();
    setMe(null);
    refreshData();
    navigate('#/');
  }} />);

  return (
    <section className="screen account">
      <h1>{t('mine')}</h1>
      <p>{t('accountNote')}</p>
      {error ? <p className="error-text" role="alert">{errorText(t, error)}</p> : !reviews ? <p className="empty">{t('loading')}</p>
        : reviews.length === 0 ? <p className="empty">{t('noMine')}</p>
        : reviews.map((r) => (
          <div key={r.id}>
            <p className="eyebrow">{r.companyName}</p>
            <ReviewBody review={r}>
              <StatusBadge status={r.status} appealOpen={r.appealOpen} />
              {r.moderatorNote && <p className="moderator-note"><strong>{t('moderatorNote')}:</strong> {r.moderatorNote}</p>}
              <div className="review-actions">
                <button onClick={() => openDialog(t('edit'), <ReviewForm existing={r} onSaved={load} />)}>{t('edit')}</button>
                {APPEALABLE.has(r.status) && !r.appealOpen && (
                  <button onClick={() => openDialog(t('appeal'), <AppealForm reviewId={r.id} onDone={load} />)}>{t('appeal')}</button>
                )}
                <button onClick={() => remove(r)}>{t('delete')}</button>
              </div>
            </ReviewBody>
          </div>
        ))}
      <button className="button primary" onClick={onWrite}>{t('write')}</button>

      <h2 className="section-title">{t('account')}</h2>
      <p className="muted small">{me.email}</p>
      <div className="button-row">
        <button className="button" onClick={exportData}>{t('exportData')}</button>
        <button className="button" onClick={async () => { await api.logout(); setMe(null); navigate('#/'); }}>{t('signout')}</button>
        <button className="button danger" onClick={deleteAccount}>{t('deleteAccount')}</button>
      </div>
    </section>
  );
}
