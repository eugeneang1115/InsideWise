import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { Company } from '../api';
import { useApp } from '../context';
import { formatRating } from '../ui';

const MALAYSIA = L.latLngBounds([0.85, 99.6], [7.4, 119.3]);
const TILE_URL = (import.meta.env.VITE_TILE_URL as string | undefined) ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = (import.meta.env.VITE_TILE_ATTRIBUTION as string | undefined)
  ?? '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

export interface MapHandle { reset: () => void }

interface Props {
  companies: Company[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSearchArea: (bbox: string) => void;
  resetSignal: number;
  /** Bump to fit the map to the current companies (e.g. after a text search). */
  fitSignal: number;
}

export function MapView({ companies, selectedId, onSelect, onSearchArea, resetSignal, fitSignal }: Props) {
  const { t } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | undefined>(undefined);
  const cluster = useRef<L.MarkerClusterGroup | undefined>(undefined);
  const [tileError, setTileError] = useState(false);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false, attributionControl: false, minZoom: 5, maxZoom: 18, maxBounds: MALAYSIA.pad(0.3) })
      .setView([3.139, 101.668], 11);
    L.control.attribution({ prefix: false, position: 'bottomright' }).addAttribution(TILE_ATTRIBUTION).addTo(m);
    L.tileLayer(TILE_URL, { maxZoom: 19, className: 'tile' })
      .on('tileerror', () => setTileError(true))
      .on('tileload', () => setTileError(false))
      .addTo(m);
    cluster.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (c) => L.divIcon({ className: 'cluster', html: `<span>${c.getChildCount()}</span>`, iconSize: [44, 44] }),
    }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = undefined; };
  }, []);

  useEffect(() => {
    const group = cluster.current!;
    group.clearLayers();
    for (const c of companies) {
      for (const o of c.offices) {
        const active = c.id === selectedId;
        // Leaflet positions the outer element with a transform, so the styled pin sits inside a zero-size anchor.
        const html = `<div class="pin${active ? ' active' : ''}"><span class="stars">★</span> ${formatRating(c.rating)}<span class="pin-name">${escapeHtml(c.name)}</span></div>`;
        const marker = L.marker([o.lat, o.lng], {
          icon: L.divIcon({ className: 'pin-anchor', html, iconSize: [0, 0] }),
          title: `${c.name} · ${o.city}`,
          alt: c.name,
          keyboard: true,
          zIndexOffset: active ? 1000 : 0,
        }).on('click', () => selectRef.current(c.id));
        group.addLayer(marker);
      }
    }
  }, [companies, selectedId]);

  useEffect(() => {
    const c = companies.find((x) => x.id === selectedId);
    const office = c?.offices[0];
    if (office && map.current) map.current.flyTo([office.lat, office.lng], Math.max(map.current.getZoom(), 13), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (resetSignal) map.current?.fitBounds(MALAYSIA);
  }, [resetSignal]);

  useEffect(() => {
    if (!fitSignal || !map.current) return;
    const points = companies.flatMap((c) => c.offices.map((o) => L.latLng(o.lat, o.lng)));
    if (points.length) map.current.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  const searchArea = () => {
    const b = map.current!.getBounds();
    onSearchArea([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(4)).join(','));
  };
  const zoom = (d: number) => map.current?.setZoom(map.current.getZoom() + d);

  return (
    <div className="map-wrap">
      <div ref={el} className="map" role="region" aria-label={t('map')} />
      <button className="map-control search-area" onClick={searchArea}>⌕ &nbsp;{t('area')}</button>
      {tileError && <div className="map-error" role="status">{t('mapFail')}</div>}
      <div className="map-control zoom">
        <button onClick={() => zoom(1)} aria-label={t('zoomIn')}>+</button>
        <button onClick={() => zoom(-1)} aria-label={t('zoomOut')}>−</button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
