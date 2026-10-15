import { useRef, useState } from 'react';
import { useApp } from '../context';

const SNAPS = [0.2, 0.44, 0.88]; // share of the workspace height on phones

/** Desktop: the left results column. Phone: a bottom sheet that drags or taps between three heights. */
export function ResultsPanel({ count, sort, onSort, footer, children }: {
  count: number; sort: string; onSort: (s: string) => void; footer: React.ReactNode; children: React.ReactNode;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLElement>(null);
  const [snap, setSnap] = useState(1);
  const drag = useRef<{ y: number; h: number; parent: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!matchMedia('(max-width: 700px)').matches || (e.target as HTMLElement).closest('select')) return;
    const el = ref.current!;
    drag.current = { y: e.clientY, h: el.getBoundingClientRect().height, parent: el.parentElement!.getBoundingClientRect().height, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (Math.abs(dy) > 6) d.moved = true;
    if (!d.moved) return;
    const share = Math.min(0.92, Math.max(0.12, (d.h + dy) / d.parent));
    ref.current!.style.height = `${share * 100}%`;
    ref.current!.style.transition = 'none';
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const el = ref.current!;
    if (d.moved) {
      const share = el.getBoundingClientRect().height / d.parent;
      setSnap(SNAPS.reduce((best, s, i) => (Math.abs(s - share) < Math.abs(SNAPS[best] - share) ? i : best), 0));
    } else {
      setSnap((s) => (s === 2 ? 1 : 2));
    }
    el.style.height = '';
    el.style.transition = '';
  };

  return (
    <aside ref={ref} className={`results snap-${snap}`} aria-label={t('list')}>
      <div className="results-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <span className="sheet-handle" aria-hidden />
        <button className="sheet-toggle" aria-expanded={snap === 2} onClick={(e) => { if (e.detail === 0) setSnap((s) => (s === 2 ? 1 : 2)); /* keyboard; pointer taps are handled above */ }}>
          <strong>{count} {t('companies')}</strong> <span className="mobile-only" aria-hidden>{snap === 2 ? '⌄' : '⌃'}</span>
        </button>
        <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label={t('sort')}>
          <option value="name">{t('name')}</option>
          <option value="rating">{t('rating')}</option>
          <option value="reviews">{t('newest')}</option>
        </select>
      </div>
      <div className="company-list">{children}</div>
      {footer}
    </aside>
  );
}
