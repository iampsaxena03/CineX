import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrapper container" style={{ textAlign: "center", paddingTop: "20vh" }}>
      <h1 style={{ fontSize: "5rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1rem" }}>404</h1>
      <p style={{ fontSize: "1.2rem", opacity: 0.7, marginBottom: "2rem" }}>This page does not exist.</p>
      <Link href="/" className="btn">Back Home</Link>
    </div>
  );
}
