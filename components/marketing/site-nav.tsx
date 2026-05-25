import Link from "next/link"

export function SiteNav() {
  return (
    <header className="cr-public-nav">
      <div className="cr-public-nav__inner">
        <Link
          href="/"
          className="cr-public-brand"
        >
          <span className="cr-public-brand__mark" aria-hidden="true">C</span>
          <span>CompliRoAI</span>
        </Link>
        <div className="cr-public-nav__links">
          <Link
            href="/docs"
            className="cr-link-button"
          >
            API
          </Link>
          <Link
            href="/login"
            className="cr-btn cr-btn--sm"
          >
            Conectează-te
          </Link>
        </div>
      </div>
    </header>
  )
}
