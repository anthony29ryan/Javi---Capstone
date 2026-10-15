import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { scaleStyles, TEXT_SIZES } from '../theme/textScale';

const STORAGE_KEY = 'textSize';
const DEFAULT_ID = 'm';

const scaleOf = (id) => TEXT_SIZES.find((size) => size.id === id)?.scale ?? 1;

// Scale 1 outside the provider, so lesson blocks still render anywhere.
const TextSizeContext = createContext({ sizeId: DEFAULT_ID, scale: 1, setSizeId: () => {} });

/**
 * The reading text size from Settings, for lessons and quizzes. Kept on this
 * phone rather than the account: it suits the screen, and works offline.
 */
export function TextSizeProvider({ children }) {
  const [sizeId, setSize] = useState(DEFAULT_ID);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && TEXT_SIZES.some((size) => size.id === stored)) setSize(stored);
      })
      // An unreadable setting just means the default size.
      .catch(() => {});
  }, []);

  const setSizeId = useCallback((id) => {
    setSize(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({ sizeId, scale: scaleOf(sizeId), setSizeId }), [sizeId, setSizeId]);
  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
  return useContext(TextSizeContext);
}

/** `styles` with the text sizes in `keys` (all, if omitted) at the chosen size. */
export function useScaledStyles(styles, keys) {
  const { scale } = useTextSize();
  // keys is a literal at each call site, so it is left out of the dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => scaleStyles(styles, scale, keys), [styles, scale]);
}
