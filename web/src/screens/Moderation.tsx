import { useCallback, useEffect, useState } from 'react';
import { api, type ModReview } from '../api';
import { errorText, useApp } from '../context';
import { ReviewBody, StatusBadge } from '../ui';

type Queue = Awaited<ReturnType<typeof api.queue>>;

export function Moderation() {
  const { t, me, toast, refreshData } = useApp();
  const [queue, setQueue] = useState<Queue>();
  const [error, setError] = useState<unknown>();

  const load = useCallback(() => { api.queue().then(setQueue).catch(setError); }, []);
  useEffect(() => { if (me?.isModerator) load(); }, [me, load]);

  if (!me?.isModerator) return <section className="screen account"><p className="error-text">{t('forbidden')}</p></section>;

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast(t('updated'));
      refreshData();
    } catch (err) {
      toast(errorText(t, err));
    }
    load();
  };

  const empty = queue && !queue.pending.length && !queue.reports.length && !queue.appeals.length;

  return (
    <section className="screen account moderation">
      <h1>{t('moderation')}</h1>
      <p>{t('moderationRules')}</p>
      {error ? <p className="error-text" role="alert">{errorText(t, error)}</p> : !queue ? <p className="empty">{t('loading')}</p> : empty ? <p className="empty">{t('noQueue')}</p> : (
        <>
          {queue.pending.length > 0 && <h2 className="section-title">{t('pendingReviews')} ({queue.pending.length})</h2>}
          {queue.pending.map((r) => (
            <ModCard key={r.id} review={r} actions={(note) => (
              <>
                <button className="button primary" onClick={() => act(() => api.decide(r.id, 'publish', r.version, note))}>{t('approve')}</button>
                <button className="button" onClick={() => act(() => api.decide(r.id, 'request_changes', r.version, note))}>{t('requestChanges')}</button>
                <button className="button danger" onClick={() => act(() => api.decide(r.id, 'reject', r.version, note))}>{t('reject')}</button>
              </>
            )} />
          ))}

          {queue.reports.length > 0 && <h2 className="section-title">{t('openReports')} ({queue.reports.length})</h2>}
          {queue.reports.map((p) => (
            <ModCard key={p.id} review={p.review} context={<p className="privacy-note"><strong>{t('reason')}:</strong> {p.reason}</p>} actions={(note) => (
              <>
                <button className="button" onClick={() => act(() => api.dismissReport(p.id))}>{t('dismiss')}</button>
                <button className="button danger" onClick={() => act(() => api.decide(p.review.id, 'hide', p.review.version, note))}>{t('hide')}</button>
              </>
            )} />
          ))}

          {queue.appeals.length > 0 && <h2 className="section-title">{t('openAppeals')} ({queue.appeals.length})</h2>}
          {queue.appeals.map((a) => (
            <ModCard key={a.id} review={a.review} context={<p className="privacy-note"><strong>{t('appeal')}:</strong> {a.message}</p>} actions={(note) => (
              <>
                <button className="button primary" onClick={() => act(() => api.decideAppeal(a.id, 'accept', note))}>{t('accept')}</button>
                <button className="button" onClick={() => act(() => api.decideAppeal(a.id, 'decline', note))}>{t('decline')}</button>
              </>
            )} />
          ))}
        </>
      )}
    </section>
  );
}

function ModCard({ review, context, actions }: { review: ModReview; context?: React.ReactNode; actions: (note: string) => React.ReactNode }) {
  const { t } = useApp();
  const [note, setNote] = useState('');
  return (
    <div>
      <p className="eyebrow">{review.companyName} · {review.language.toUpperCase()}</p>
      <ReviewBody review={review}>
        <StatusBadge status={review.status} />
        <p className="small muted">{(['pay', 'management', 'culture', 'growth', 'balance'] as const).map((k) => `${t(k)} ${review[k]}`).join(' · ')}</p>
        {review.moderatorNote && <p className="moderator-note"><strong>{t('moderatorNote')}:</strong> {review.moderatorNote}</p>}
        {context}
        <label className="mod-note">{t('noteOptional')}<textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="button-row">{actions(note.trim())}</div>
      </ReviewBody>
    </div>
  );
}
