import { createContext, useContext } from 'react';
import type { Lang } from './i18n';
import type { Me } from './api';

export interface AppContext {
  lang: Lang;
  t: (key: string) => string;
  me: Me | null;
  setMe: (me: Me | null) => void;
  navigate: (hash: string) => void;
  openDialog: (title: string, body: React.ReactNode) => void;
  closeDialog: () => void;
  toast: (message: string) => void;
  /** Runs `then` once the viewer is signed in, showing the sign-in dialog first if needed. */
  withAccount: (reasonKey: string, then: () => void) => void;
  /** Bumped after any write that changes public ratings or lists. */
  dataVersion: number;
  refreshData: () => void;
}

export const Ctx = createContext<AppContext>(null!);
export const useApp = () => useContext(Ctx);

export function errorText(t: (k: string) => string, err: unknown): string {
  const code = (err as { code?: string })?.code ?? 'unavailable';
  const text = t(code);
  return text === code ? t('unavailable') : text;
}
