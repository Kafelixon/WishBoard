import { useEffect } from "react";

const SITE_NAME = "WishBoard";

/** Sets the browser tab title for the current page. */
export const usePageTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
};
