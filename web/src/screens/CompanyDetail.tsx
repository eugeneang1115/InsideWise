import { Fragment, useEffect, useState } from 'react';
import { api, type CompanyDetail as Detail, type PublicReview } from '../api';
import { errorText, useApp } from '../context';
import { ReportForm } from '../dialogs/ReportForm';
import { formatRating, ReviewBody } from '../ui';
import { AdSlot } from '../Ad';

const BREAKDOWN = ['pay', 'management', 'culture', 'growth', 'balance'] as const;

export function CompanyDetail({ id, onClose, onWrite }: { id: string; onClose: () => void; onWrite: () => void }) {
  const { t, lang, openDialog, dataVersion } = useApp();
  const [company, setCompany] = useState<Detail>();
  const [reviews, setReviews] = useState<{ reviews: PublicReview[]; total: number; pageSize: number }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    api.company(id).then((r) => setCompany(r.company)).catch(setError);
  }, [id, dataVersion]);
  useEffect(() => {
    api.reviews(id, page).then(setReviews).catch(setError);
  }, [id, page, dataVersion]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  const pages = reviews ? Math.max(1, Math.ceil(reviews.total / reviews.pageSize)) : 1;
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'ms' ? 'ms-MY' : 'en-MY', { year: 'numeric', month: 'short' });

  return (
    <section className="detail" aria-label={t('details')}>
      <button className="icon-button detail-close" onClick={onClose} aria-label={t('close')}>×</button>
      {error ? <p className="empty" role="alert">{errorText(t, error)}</p> : !company ? <p className="empty">{t('loading')}</p> : (
        <>
          <span className="logo" style={{ background: company.color }}>{company.initials}</span>
          <p className="eyebrow">{t(company.industry)}</p>
          <h2>{company.name}</h2>
          <p className="muted">{company.offices.map((o) => `${o.city}, ${o.state}`).join(' · ')}</p>
          <div className="detail-rating">
            <span className="stars">★</span>{formatRating(company.rating)}
            <span className="small muted">{company.reviewCount} {t('reviews')}{company.isDemo ? ' · DEMO' : ''}</span>
          </div>
          <button className="button primary full" onClick={onWrite}>✎ &nbsp; {t('write')}</button>
          <h3>{t('details')}</h3>
          {company.isDemo && <p className="muted">{t('fictional')}</p>}
          {company.size && <p className="muted">{company.size} {t('employees')}</p>}
          {company.userAdded && <p className="muted small">{t('userAdded')}</p>}
          {company.reviewCount > 0 && (
            <div className="breakdown" aria-label={t('ratingsBreakdown')}>
              {BREAKDOWN.map((k) => {
                const v = company.breakdown[k];
                return (
                  <div key={k}>
                    <span>{t(k)}</span>
                    <meter min={0} max={5} value={v ?? 0} />
                    <b>{formatRating(v)}</b>
                  </div>
                );
              })}
            </div>
          )}
          <h3>{t('reviewsHeading')}</h3>
          {reviews && reviews.total === 0 && <p className="muted">{t('noReviewsCompany')}</p>}
          {reviews?.reviews.map((r, i) => (
            <Fragment key={r.id}>
            {i === 2 && <AdSlot key={`ad-${id}-${page}`} />}
            <ReviewBody review={r}>
              <p className="small muted">{t('reviewedAt')} {date(r.publishedAt)}</p>
              {r.isDemo && <p className="sample-note">{t('sampleReview')}</p>}
              <div className="review-actions">
                <button onClick={() => openDialog(t('report'), <ReportForm reviewId={r.id} />)}>{t('report')}</button>
              </div>
            </ReviewBody>
            </Fragment>
          ))}
          {reviews && reviews.reviews.length > 0 && reviews.reviews.length <= 2 && <AdSlot key={`ad-${id}-${page}`} />}
          {pages > 1 && (
            <div className="pager">
              <button className="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('previous')}</button>
              <span className="small muted">{t('page')} {page} / {pages}</span>
              <button className="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('next')}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
