import Link from "next/link"

export function SiteNav() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-shell)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-display-v3)",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          AI Act Compliance
        </Link>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-muted)",
            textDecoration: "none",
            padding: "8px 14px",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            transition: "color 150ms, border-color 150ms",
          }}
        >
          Conectează-te
        </Link>
      </div>
    </header>
  )
}
