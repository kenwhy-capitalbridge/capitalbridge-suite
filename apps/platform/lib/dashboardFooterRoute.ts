function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Routes that render {@link DashboardFooter} and must not duplicate {@link CbLegalSiteFooter}.
 */
export function routeUsesDashboardFooterOnly(pathname: string): boolean {
  return normalizePath(pathname) === "/solutions/strategic-execution";
}

/**
 * Hide the global {@link CbLegalSiteFooter} when the route provides its own legal / confidential treatment.
 */
export function hideGlobalLegalSiteFooter(pathname: string): boolean {
  const p = normalizePath(pathname);
  return p === "/solutions/strategic-execution" || p === "/staging-access";
}
