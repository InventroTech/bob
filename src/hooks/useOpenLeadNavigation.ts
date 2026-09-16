import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PYRO_NAVIGATE_TO_LEAD } from "@/lib/realtime/openLeadBus";

/** Listens for open-lead navigation requests from notification clicks. */
export function useOpenLeadNavigation(): void {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ pathname: string; search: string; replace?: boolean }>
      ).detail;
      if (!detail?.pathname) return;

      const nextSearch = detail.search || "";
      const samePath = location.pathname === detail.pathname;
      const sameSearch = location.search === nextSearch || `?${location.search.replace(/^\?/, "")}` === nextSearch;

      if (samePath && sameSearch) return;

      navigate(
        { pathname: detail.pathname, search: nextSearch },
        { replace: Boolean(detail.replace) },
      );
    };

    window.addEventListener(PYRO_NAVIGATE_TO_LEAD, listener);
    return () => window.removeEventListener(PYRO_NAVIGATE_TO_LEAD, listener);
  }, [navigate, location.pathname, location.search]);
}
