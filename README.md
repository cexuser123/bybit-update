# Bybit Balance & Address Check Bot

Single-file Node.js bot that checks your **Bybit wallet balance** and **deposit address** using the V5 private API.

## Features

- Wallet balance for `UNIFIED` (or `CONTRACT`) account
- Master-account deposit address lookup by coin + chain
- CLI commands: `balance`, `address`, `check`
- API keys configured directly in `bot.js`

## Requirements

- Node.js 18+
- Bybit API key + secret with **Read** permissions for Account / Asset

> Do **not** enable withdraw permissions for this bot. Read-only keys are enough.

## Setup

```bash
cd D:\Cex\bybit
npm install
```

Open `bot.js` and set your credentials at the top:

```js
const API_KEY = 'YOUR_API_KEY';
const API_SECRET = 'YOUR_API_SECRET';
const TESTNET = false;
const ACCOUNT_TYPE = 'UNIFIED'; // UNIFIED | CONTRACT
const DEFAULT_COIN = 'USDT';
const DEFAULT_CHAIN = 'ETH';
```

## Usage

```bash
# Balance + deposit address
npm start
# or
node bot.js

# Balance only
node bot.js balance
node bot.js balance USDT

# Deposit address only
node bot.js address
node bot.js address USDT TRX
node bot.js address BTC BTC

# Both with custom coin/chain
node bot.js check USDT BSC
```

### Common chain values

| Coin | Example `CHAIN` values |
|------|-------------------------|
| USDT | `ETH`, `TRX`, `BSC`, `ARB`, `MATIC` |
| BTC  | `BTC` |
| ETH  | `ETH` |

Exact chain names depend on Bybit’s deposit network list for that coin.

## Project layout

```
bybit/
├── bot.js           # single bot entry (config + logic)
├── package.json
├── .gitignore
└── README.md
```

## Example output

```
Bybit bot ready · account=UNIFIED · network=mainnet

========================================================
  Wallet Balance (UNIFIED)
========================================================
  Total Equity (USD)    : 1234.56
  ...
  Coins with non-zero balance:
  Coin      Wallet          Available       USD Value       Locked

========================================================
  Deposit Address (USDT / ETH)
========================================================
  Coin                  : USDT
  Chain                 : ETH
  Address               : 0x...
  Tag / Memo            : (none)
```

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| Missing credentials | Set `API_KEY` / `API_SECRET` in `bot.js` |
| `retCode` / auth error | Recreate API key; confirm IP whitelist if enabled |
| Empty address result | Wrong `CHAIN` for that coin — try `ETH`, `TRX`, `BSC` |
| Empty balances | Account may be empty, or set `ACCOUNT_TYPE = 'UNIFIED'` |
| Testnet | Set `TESTNET = true` and use testnet keys |

## Security

- Use a read-only API key
- Do not share `bot.js` if it contains real keys
- Rotate keys if they are ever exposed

## License

MIT
