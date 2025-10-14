"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [userId, setUserId] = useState("");
  const [query, setQuery] = useState("");
  const [cron, setCron] = useState("");
  const [result, setResult] = useState<{ id: string; nextRunAt: string | null; queryForLLM?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('userId');
    if (id) {
      setUserId(id);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, query, scheduleCron: cron || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult({ id: json.id, nextRunAt: json.nextRunAt ?? null, queryForLLM: json.queryForLLM });
      setQuery("");
    } catch (err: any) {
      setResult(null);
      alert(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Personal Anything Notifier</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link 
              href="/signup"
              style={{ 
                background: "#0b5fff", 
                color: "white", 
                padding: "6px 12px", 
                borderRadius: 6, 
                textDecoration: "none", 
                fontSize: 12,
                fontWeight: 500
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
        <p style={{ color: "#6b7280", margin: 0, fontSize: 16, fontStyle: "italic" }}>
          Why rely on other apps' notifications when you can create yours
        </p>
      </div>

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="userId" style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>User ID</label>
            <input
              id="userId"
              placeholder="Enter your UUID from email"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              Don't have an ID? <Link href="/signup" style={{ color: "#0b5fff", textDecoration: "none" }}>Get one here</Link>
            </div>
          </div>

          <div>
            <label htmlFor="query" style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Query</label>
            <textarea
              id="query"
              placeholder="e.g., Send gold prices everyday, Share stock price of LG electronics sharp at 10:00 AM"
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={3}
              required
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, resize: "vertical" }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>We’ll infer schedule and a sanitized query automatically.</div>
          </div>

          <details>
            <summary style={{ cursor: "pointer", color: "#0b5fff", fontSize: 13 }}>Optional: Provide a cron schedule</summary>
            <div style={{ marginTop: 8 }}>
              <label htmlFor="cron" style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Cron</label>
              <input
                id="cron"
                placeholder="0 9 * * *  (5-field cron in UTC)"
                value={cron}
                onChange={e => setCron(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>If omitted, we ask the AI to infer a reasonable schedule.</div>
            </div>
          </details>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              disabled={loading}
              type="submit"
              style={{ background: "#0b5fff", color: "white", padding: "10px 14px", border: "1px solid #0b5fff", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Creating..." : "Create notification"}
            </button>
          </div>
          
          {userId && (
            <div style={{ marginTop: 8 }}>
              <Link 
                href={`/manage?userId=${userId}`}
                style={{ 
                  color: "#0b5fff", 
                  textDecoration: "none", 
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                Manage existing notifications →
              </Link>
            </div>
          )}
        </form>
      </section>

      {result && (
        <section style={{ marginTop: 16, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            <strong>Notification created</strong>
          </div>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div><span style={{ color: "#6b7280" }}>ID:</span> {result.id}</div>
            <div><span style={{ color: "#6b7280" }}>Next run:</span> {result.nextRunAt ?? "none"}</div>
            {result.queryForLLM && (
              <div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>Sanitized query</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{result.queryForLLM}</div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}


