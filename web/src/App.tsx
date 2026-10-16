import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { api, isDemo, isNative, type Me } from './api';
import { Ctx, type AppContext } from './context';
import { LANGS, translator, type Lang } from './i18n';
import { Dialog, useDocumentLang } from './ui';
import { MapIcon, PenIcon, ScalesIcon, UserIcon } from './icons';
import { Explore } from './screens/Explore';
import { MyReviews } from './screens/MyReviews';
import { Moderation } from './screens/Moderation';
import { AuthForm } from './dialogs/AuthForm';
import { ReviewForm } from './dialogs/ReviewForm';

type Route = { screen: 'explore'; companyId?: string } | { screen: 'mine' } | { screen: 'moderation' };

function parseRoute(hash: string): Route {
  const [, screen, id] = hash.replace(/^#/, '').split('/');
  if (screen === 'mine') return { screen: 'mine' };
  if (screen === 'moderation') return { screen: 'moderation' };
  if (screen === 'company' && id) return { screen: 'explore', companyId: decodeURIComponent(id) };
  return { screen: 'explore' };
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('iw-language');
    if (saved === 'en' || saved === 'ms' || saved === 'zh') return saved;
  } catch { /* storage unavailable */ }
  const nav = navigator.language.toLowerCase();
  return nav.startsWith('zh') ? 'zh' : nav.startsWith('ms') ? 'ms' : 'en';
}

export function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [me, setMe] = useState<Me | null>(null);
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const [dialog, setDialog] = useState<{ title: string; body: React.ReactNode } | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const t = useMemo(() => translator(lang), [lang]);
  useDocumentLang(lang);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { api.me().then((r) => setMe(r.me)).catch(() => {}); }, []);

  // Android back button: close the open dialog, then step back through screens, then leave the app.
  const dialogOpen = !!dialog;
  useEffect(() => {
    if (!isNative) return;
    const sub = NativeApp.addListener('backButton', () => {
      if (dialogOpen) setDialog(null);
      else if (location.hash && location.hash !== '#/') history.back();
      else NativeApp.exitApp();
    });
    return () => { sub.then((h) => h.remove()); };
  }, [dialogOpen]);
  useEffect(() => {
    if (!toastText) return;
    const id = setTimeout(() => setToastText(null), 5500);
    return () => clearTimeout(id);
  }, [toastText]);

  const navigate = useCallback((hash: string) => { location.hash = hash; }, []);
  const openDialog = useCallback((title: string, body: React.ReactNode) => setDialog({ title, body }), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const ctx: AppContext = {
    lang, t, me, setMe, navigate, openDialog, closeDialog, toast: setToastText, dataVersion,
    refreshData: () => setDataVersion((v) => v + 1),
    withAccount: (reasonKey, then) => {
      if (me) return then();
      openDialog(t('signin'), <AuthForm reasonKey={reasonKey} onDone={then} />);
    },
  };

  const changeLang = (value: Lang) => {
    setLang(value);
    try { localStorage.setItem('iw-language', value); } catch { /* storage unavailable */ }
  };
  const write = () => ctx.withAccount('signInToWrite', () =>
    openDialog(t('write'), <ReviewForm companyId={route.screen === 'explore' ? route.companyId : undefined} />));
  const privacy = () => openDialog(t('privacy'), <p className="privacy-text">{t('privacyBody')}</p>);
  const active = route.screen;

  return (
    <Ctx.Provider value={ctx}>
      <header>
        <a href="#/" className="brand" aria-label="Insidewise">
          <span className="mark">iw</span><span>inside<em>wise</em><small>MALAYSIA</small></span>
        </a>
        <nav>
          <a href="#/" className={active === 'explore' ? 'active' : ''}>{t('explore')}</a>
          <a href="#/mine" className={active === 'mine' ? 'active' : ''}>{t('mine')}</a>
          {me?.isModerator && <a href="#/moderation" className={active === 'moderation' ? 'active' : ''}>{t('moderation')}</a>}
          <button onClick={privacy}>{t('privacy')}</button>
        </nav>
        <div className="head-right">
          <select value={lang} onChange={(e) => changeLang(e.target.value as Lang)} aria-label="Language / Bahasa / 语言">
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {me
            ? <a className="account-button" href="#/mine">{me.email}</a>
            : <button className="account-button" onClick={() => ctx.withAccount('authNote', () => {})}>{t('signin')}</button>}
        </div>
      </header>

      {isDemo && <p className="demo-banner" role="note">{t('previewBanner')}</p>}
      <main className={isNative ? 'native' : undefined}>
        {route.screen === 'explore' && <Explore companyId={route.companyId} onWrite={write} onPrivacy={privacy} />}
        {route.screen === 'mine' && <MyReviews onWrite={write} />}
        {route.screen === 'moderation' && <Moderation />}
      </main>

      <nav className="mobile-nav" aria-label="Main">
        <a href="#/" className={active === 'explore' ? 'active' : ''}><MapIcon /><span>{t('explore')}</span></a>
        <button className="write-mobile" onClick={write}><PenIcon /><span>{t('write')}</span></button>
        {me?.isModerator && <a href="#/moderation" className={active === 'moderation' ? 'active' : ''}><ScalesIcon /><span>{t('moderation')}</span></a>}
        <a href="#/mine" className={active === 'mine' ? 'active' : ''}><UserIcon /><span>{t('mine')}</span></a>
      </nav>

      <Dialog title={dialog?.title ?? ''} open={!!dialog} onClose={closeDialog}>{dialog?.body}</Dialog>
      {toastText && <div className="toast" role="status">{toastText}</div>}
    </Ctx.Provider>
  );
}
