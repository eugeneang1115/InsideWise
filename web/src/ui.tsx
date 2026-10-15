import { useEffect, useRef } from 'react';
import type { PublicReview, ReviewStatus } from './api';
import { useApp } from './context';

export function Dialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  const { t } = useApp();
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="dialog-title">
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
      <div>{open && children}</div>
    </dialog>
  );
}

export function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return <span className="stars" aria-label={`${value} / 5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export const formatRating = (r: number | null) => (r == null ? '—' : r.toFixed(1));

export function StatusBadge({ status, appealOpen }: { status: ReviewStatus; appealOpen?: boolean }) {
  const { t } = useApp();
  const key = appealOpen ? 'appealed' : { pending: 'pending', published: 'published', changes_requested: 'changes', rejected: 'rejected', hidden: 'hidden' }[status];
  return <span className={`status status-${appealOpen ? 'appealed' : status}`}>{t(key)}</span>;
}

export function ReviewBody({ review, children }: { review: Pick<PublicReview, 'overall' | 'title' | 'employment' | 'pros' | 'cons'>; children?: React.ReactNode }) {
  const { t } = useApp();
  return (
    <article className="review">
      <div className="review-meta"><Stars value={review.overall} /><span>{t('anonymous')}</span></div>
      <h3>{review.title}</h3>
      <p className="small muted">{t(review.employment)}</p>
      <strong className="small">{t('pros')}</strong>
      <p className="review-text">{review.pros}</p>
      <strong className="small">{t('cons')}</strong>
      <p className="review-text">{review.cons}</p>
      {children}
    </article>
  );
}

export function useDocumentLang(lang: string) {
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang; }, [lang]);
}
