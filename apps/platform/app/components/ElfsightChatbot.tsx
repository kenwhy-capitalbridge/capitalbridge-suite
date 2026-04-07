import Script from "next/script";

/**
 * Elfsight AI Chatbot — Capital Bridge AI Agent (same widget as login app).
 */
export function ElfsightChatbot() {
  return (
    <>
      <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      <div
        className="elfsight-app-bc21f872-cdf0-47f5-8d6c-aa5b37daf027"
        data-elfsight-app-lazy
      />
    </>
  );
}
