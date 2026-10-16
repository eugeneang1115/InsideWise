import { useEffect } from 'react';
import { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { isNative } from './api';

// Google AdMob banner ads, Android app only. The website shows no ads.
// Without VITE_ADMOB_BANNER_ID the app uses Google's test ad unit, which shows a "Test Ad" banner and earns nothing.
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const bannerId = import.meta.env.VITE_ADMOB_BANNER_ID || TEST_BANNER;

let ready: Promise<boolean> | undefined;

/** Starts AdMob once and asks for ad consent where the law requires it (Google shows the form). */
function start(): Promise<boolean> {
  ready ??= (async () => {
    await AdMob.initialize();
    // Lets the page leave room under its content for the banner.
    await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
      document.documentElement.style.setProperty('--banner-h', `${size.height}px`);
    });
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) consent = await AdMob.showConsentForm();
    return consent.canRequestAds;
  })().catch(() => false);
  return ready;
}

/** Shows a banner above the bottom navigation while `show` is true. */
export function useBannerAd(show: boolean) {
  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    if (show) {
      void start().then(async (ok) => {
        if (!ok || cancelled) return;
        const nav = document.querySelector<HTMLElement>('.mobile-nav');
        const margin = nav && getComputedStyle(nav).display !== 'none' ? nav.offsetHeight : 0;
        await AdMob.showBanner({
          adId: bannerId, isTesting: bannerId === TEST_BANNER,
          adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin,
        });
        if (cancelled) await AdMob.removeBanner(); // the screen changed while the ad was loading
        else document.documentElement.classList.add('has-banner');
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      if (!show) return;
      document.documentElement.classList.remove('has-banner');
      void AdMob.removeBanner().catch(() => {});
    };
  }, [show]);
}
