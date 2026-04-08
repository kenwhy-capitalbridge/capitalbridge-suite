import Script from "next/script";

/**
 * Elfsight AI Chatbot — Capital Bridge AI Agent.
 * Add once per app root layout (before `</body>`) so every route includes the widget.
 */
export function ElfsightChatbot() {
  return (
    <>
      <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      <div className="elfsight-app-bc21f872-cdf0-47f5-8d6c-aa5b37daf027" data-elfsight-app-lazy />
    </>
  );
}
