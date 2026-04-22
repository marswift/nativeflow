"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("");
  const [body, setBody] = useState("");

  const styles = {
    wrap: {
      background: "#f7f4ef",
      minHeight: "100vh",
      padding: "48px 24px 80px",
    },
    inner: {
      maxWidth: 560,
      margin: "0 auto",
      background: "#ffffff",
      borderRadius: 16,
      padding: "40px 32px",
      boxShadow: "0 2px 16px rgba(0,0,0,.06)",
      border: "1px solid #ede9e2",
    },
    title: {
      fontSize: 28,
      fontWeight: 900,
      marginBottom: 12,
      color: "#1a1a2e",
    },
    intro: {
      fontSize: 14,
      color: "#4a4a6a",
      lineHeight: 1.7,
      marginBottom: 32,
    },
    back: {
      display: "inline-block",
      fontSize: 14,
      fontWeight: 700,
      color: "#ff6b35",
      marginBottom: 24,
      textDecoration: "none",
    },
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 700,
      color: "#1a1a2e",
      marginBottom: 6,
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      fontSize: 15,
      border: "1.5px solid #ede9e2",
      borderRadius: 10,
      marginBottom: 20,
      boxSizing: "border-box" as const,
    },
    select: {
      width: "100%",
      padding: "12px 14px",
      fontSize: 15,
      border: "1.5px solid #ede9e2",
      borderRadius: 10,
      marginBottom: 20,
      boxSizing: "border-box" as const,
      background: "#fff",
    },
    textarea: {
      width: "100%",
      minHeight: 160,
      padding: "12px 14px",
      fontSize: 15,
      border: "1.5px solid #ede9e2",
      borderRadius: 10,
      marginBottom: 24,
      boxSizing: "border-box" as const,
      resize: "vertical" as const,
    },
    submit: {
      display: "block",
      width: "100%",
      padding: "14px 24px",
      fontSize: 16,
      fontWeight: 800,
      color: "#fff",
      background: "linear-gradient(135deg, #ff6b35, #f7c948)",
      border: "none",
      borderRadius: 12,
      cursor: "pointer",
      boxShadow: "0 4px 18px rgba(255,107,53,.32)",
    },
    note: {
      fontSize: 12,
      color: "#888",
      marginTop: 20,
      lineHeight: 1.6,
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI only – no backend
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        <h1 style={styles.title}>お問い合わせ</h1>
        <p style={styles.intro}>
          サービスに関するご質問・ご要望は、以下のフォームよりお送りください。
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="contact-name" style={styles.label}>お名前</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="山田 太郎"
          />

          <label htmlFor="contact-email" style={styles.label}>メールアドレス</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="example@email.com"
          />

          <label htmlFor="contact-kind" style={styles.label}>お問い合わせ種別</label>
          <select
            id="contact-kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            style={styles.select}
          >
            <option value="">選択してください</option>
            <option value="usage">利用方法について</option>
            <option value="billing">料金・支払いについて</option>
            <option value="bug">不具合の報告</option>
            <option value="other">その他</option>
          </select>

          <label htmlFor="contact-body" style={styles.label}>内容</label>
          <textarea
            id="contact-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={styles.textarea}
            placeholder="お問い合わせ内容をご記入ください"
          />

          <button type="submit" style={styles.submit}>
            送信する
          </button>
        </form>

        <p style={styles.note}>
          いただいたお問い合わせには、内容により2〜3営業日程度でご返信いたします。お急ぎの場合はお時間がかかる場合がございます。
        </p>
      </div>
    </div>
  );
}
