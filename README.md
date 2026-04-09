# TGE Pressure Calculator

A sharp, no-nonsense tool for crypto analysts to evaluate token launch risk before investing. Enter the token structure, get a verdict.

---

## What it does

Calculates weighted selling pressure for a token at TGE (Token Generation Event) based on supply distribution, FDV, and unlock schedule. Outputs a risk verdict — HIGH, MEDIUM, or LOW — with supporting metrics.

---

## Features

- **Pressure Verdict** — weighted selling pressure rating with kinetic impact animation
- **Risk Dimensions** — Dump Risk, Dilution Risk, and Liquidity Score
- **Key Metrics** — Immediate Sell Pressure, Circulating Supply, Initial Market Cap, MC/FDV Ratio
- **Advanced Breakdown** — categorize unlocked tokens by type for more accurate ratings
- **Distribution Chart** — canvas-rendered bar chart of token categories
- **Price Context** — optional token price input to show concrete sell quantities
- **Compare Mode** — save and compare up to 3 projects side-by-side
- **Save & Share** — persist calculations, copy shareable URLs, post to X
- **Export** — print / save via browser dialog

---

## Token category weights

| Category    | Sell Rate | Reasoning                        |
|-------------|-----------|----------------------------------|
| Airdrop     | 100%      | Free tokens — nearly all sell    |
| Public Sale | 100%      | Early buyers take profit         |
| Team        | 30%       | Some selling expected            |
| Other       | 20%       | Ecosystem, advisors — varies     |
| Liquidity   | 0%        | Locked in pools, not sell pressure |

---

## Getting started

1. Open `index.html` in any modern browser (or serve locally)
2. Enter Total Token Supply, Expected FDV, and % Unlocked at TGE
3. Optionally add token price for quantity context
4. Optionally expand "Breakdown by category" for a more accurate rating
5. Hit **Run Analysis**

---

## Understanding the verdict

- **LOW** — <20% effective pressure. Healthy vesting, most supply locked.
- **MEDIUM** — 20–40% pressure. Monitor price action at open.
- **HIGH** — >40% pressure or >60% unlocked. Significant dump risk.

---

## Tech

- Pure HTML/CSS/JS — no framework, no dependencies
- Client-side only — your data never leaves the browser
- Canvas API for chart rendering
- Web Animations API for kinetic verdict reveal
- LocalStorage for autosave and comparisons
- ~50KB total

---

## Browser support

Chrome/Edge 90+, Safari 14+, Firefox 88+, iOS Safari. No IE.

---

## Project structure

```
tge-calculator/
├── index.html       — markup
├── styles.css       — dark editorial theme (OKLCH, Barlow Condensed + Mada)
├── script.js        — calculator logic and animations
└── README.md
```

---

## License

Free to use for personal and educational purposes.
