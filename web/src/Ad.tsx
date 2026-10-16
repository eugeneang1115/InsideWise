import { useEffect, useRef, useState } from 'react';
import { isDemo, isNative } from './api';
import { useApp } from './context';

// Google AdSense, web only. The server says whether ads are on (ADSENSE_CLIENT), so turning them on needs no rebuild.
// The Android app shows no ads: AdSense is not allowed inside apps (that would need AdMob).
type AdConfig = { client: string; slot: string | null } | null;
let config: Promise<AdConfig> | undefined;

function adConfig(): Promise<AdConfig> {
  if (isNative || isDemo) return Promise.resolve(null);
  config ??= fetch('/api/config').then((r) => (r.ok ? r.json() : { adsense: null })).then((c) => {
    const ads: AdConfig = c.adsense ?? null;
    if (ads) {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.client)}`;
      document.head.append(s);
    }
    return ads;
  }).catch(() => null);
  return config;
}

/** Starts loading the AdSense script (which also runs Auto ads, if turned on in AdSense). */
export function useAds() {
  useEffect(() => { void adConfig(); }, []);
}

/** One responsive display ad, labelled as an ad. Renders nothing while ads are off. */
export function AdSlot() {
  const { t } = useApp();
  const [ads, setAds] = useState<AdConfig>(null);
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => { void adConfig().then(setAds); }, []);
  useEffect(() => {
    if (!ads?.slot || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    try { ((window as any).adsbygoogle ||= []).push({}); } catch { /* blocked by an ad blocker */ }
  }, [ads]);
  if (!ads?.slot) return null;
  return (
    <aside className="ad" aria-label={t('advertisement')}>
      <span className="ad-label">{t('advertisement')}</span>
      <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={ads.client} data-ad-slot={ads.slot}
        data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
