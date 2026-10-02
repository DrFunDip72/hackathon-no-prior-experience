import { useEffect } from 'react';

/** The site title from index.html, used on pages that don't set their own. */
const DEFAULT_TITLE = 'Doorway · Get your foot in the door';

/** Sets the tab title to "<page> · Doorway" while the page is mounted (the default title without a page). */
export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · Doorway` : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [page]);
}
