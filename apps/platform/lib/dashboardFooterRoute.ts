/**
 * Routes that render {@link DashboardFooter} and must not duplicate {@link CbLegalSiteFooter}.
 */
export function routeUsesDashboardFooterOnly(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/solutions/strategic-execution";
}
