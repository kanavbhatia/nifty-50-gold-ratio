# Gold & Nifty 50 Fund Allocator

A simple, frontend-only dashboard that tells you whether to hold more gold or more Nifty 50 index, based on their historical price relationship.

Live at: [nifty-50-gold-ratio.netlify.app](https://nifty-50-gold-ratio.netlify.app) _(update this link after deploying)_

---

## What it does

The dashboard fetches three pieces of live data:

1. **Gold spot price** (USD/oz) from SwissQuote — converted to ₹/gram
2. **USD → INR exchange rate** from ExchangeRate API
3. **Nifty 50 index level** from Yahoo Finance

It then computes a single ratio:

```
Ratio = Gold price per gram (₹) / Nifty 50 index level
```

And gives you an allocation recommendation based on where that ratio falls historically.

---

## The logic

| Ratio          | What it means                       | Recommendation               |
| -------------- | ----------------------------------- | ---------------------------- |
| **> 0.6**      | Gold is expensive relative to Nifty | Reduce gold, increase stocks |
| **0.28 – 0.6** | Both are fairly valued              | Hold current allocation      |
| **< 0.28**     | Gold is cheap relative to Nifty     | Increase gold, reduce stocks |

### Why this makes sense

Gold and equities tend to move inversely over long cycles — when markets are euphoric and overvalued, gold becomes relatively cheap; when markets crash or investors flee to safety, gold becomes relatively expensive. Tracking the ratio of gold (in rupees per gram) to the Nifty 50 index level gives a simple, currency-adjusted signal of which asset class is stretched.

The thresholds (0.28 and 0.6) are derived from the historical range of this ratio for Indian markets. It isn't a precise trading signal — it's a coarse rebalancing guide meant for long-term investors who want a data-driven nudge rather than guessing.

This is similar in spirit to the **Buffett Indicator** (market cap / GDP) but applied specifically to the gold vs. equity tradeoff, which is a classic strategy used by Indian HNI investors.

---

## Tech stack

- Pure HTML + Tailwind CSS (no framework, no build step)
- Vanilla JS `fetch` calls to three free/public APIs
- Netlify `_redirects` used as a proxy to bypass CORS restrictions on SwissQuote and Yahoo Finance

### APIs used

| Data            | Source                                               | Auth required |
| --------------- | ---------------------------------------------------- | ------------- |
| Gold spot price | [SwissQuote](https://forex-data-feed.swissquote.com) | None          |
| USD/INR rate    | [ExchangeRate API](https://open.er-api.com)          | None          |
| Nifty 50 price  | [Yahoo Finance](https://finance.yahoo.com)           | None          |

---

## How to deploy (Netlify)

1. Push this repo to GitHub
2. Connect the repo to Netlify
3. Set **Publish directory** to `public/` (or it will be picked up automatically from `netlify.toml`)
4. Deploy — no environment variables, no build command needed

The `_redirects` file inside `public/` handles all API proxying automatically on Netlify.

### Local development

Use the Netlify CLI to simulate the proxy redirects locally:

```bash
npm install -g netlify-cli
netlify dev
```

This starts a local server that honours the `_redirects` rules, so all three API calls work without CORS issues.
