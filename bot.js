/**
 * Bybit Balance & Deposit Address Check Bot (single-file)
 *
 * Usage:
 *   node bot.js                 # check balance + address
 *   node bot.js balance         # wallet balance only
 *   node bot.js address         # deposit address only
 *   node bot.js address USDT TRX
 *   node bot.js check BTC BTC   # balance + address for coin/chain
 */

const https = require('https');
const crypto = require('crypto');

// ====== CONFIG — put your keys here ======
const API_KEY = '8N5lNW6IdoQaq0tqga';
const API_SECRET = 'oZeuSTkYJO8lAHTuJrKKASRYTPLR2wO35ZBW';
const TESTNET = false;
const ACCOUNT_TYPE = 'UNIFIED'; // UNIFIED | CONTRACT
const DEFAULT_COIN = 'USDT';
const DEFAULT_CHAIN = 'ETH';
// =========================================
const RECV_WINDOW = '5000';
const BASE_URL = TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com';

function fail(message) {
  console.error(`\n[ERROR] ${message}\n`);
  process.exit(1);
}

function ensureCredentials() {
  if (!API_KEY || !API_SECRET || API_KEY === 'YOUR_API_KEY' || API_SECRET === 'YOUR_API_SECRET') {
    fail('Set API_KEY and API_SECRET at the top of bot.js before running.');
  }
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

function signRequest(queryString, timestamp) {
  const payload = `${timestamp}${API_KEY}${RECV_WINDOW}${queryString}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${body}`));
          }
        });
      }
    );
    req.on('error', (error) => reject(error));
  });
}

async function privateGet(path, params) {
  const queryString = buildQuery(params);
  const timestamp = String(Date.now());
  const signature = signRequest(queryString, timestamp);
  const url = `${BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

  return httpGet(url, {
    'X-BAPI-API-KEY': API_KEY,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': RECV_WINDOW,
    'X-BAPI-SIGN': signature,
  });
}

function printHeader(title) {
  const line = '='.repeat(56);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

function printKv(label, value) {
  const pad = String(label).padEnd(22, ' ');
  console.log(`  ${pad}: ${value ?? '-'}`);
}

async function checkBalance(coinFilter) {
  printHeader(`Wallet Balance (${ACCOUNT_TYPE}${TESTNET ? ' · TESTNET' : ''})`);

  const response = await privateGet('/v5/account/wallet-balance', {
    accountType: ACCOUNT_TYPE,
    ...(coinFilter ? { coin: coinFilter } : {}),
  });

  if (response.retCode !== 0) {
    fail(`Balance request failed: [${response.retCode}] ${response.retMsg}`);
  }

  const account = response.result?.list?.[0];
  if (!account) {
    console.log('  No balance data returned.');
    return;
  }

  printKv('Total Equity (USD)', account.totalEquity);
  printKv('Wallet Balance (USD)', account.totalWalletBalance);
  printKv('Available Balance', account.totalAvailableBalance);
  printKv('Unrealised PnL', account.totalPerpUPL);
  printKv('Initial Margin', account.totalInitialMargin);
  printKv('Maintenance Margin', account.totalMaintenanceMargin);

  const coins = (account.coin || []).filter((c) => {
    const bal = Number(c.walletBalance || 0);
    const equity = Number(c.equity || 0);
    return bal !== 0 || equity !== 0;
  });

  console.log('\n  Coins with non-zero balance:');
  if (!coins.length) {
    console.log('    (none)');
    return;
  }

  console.log(
    '  ' +
      ['Coin', 'Wallet', 'Available', 'USD Value', 'Locked']
        .map((h, i) => h.padEnd(i === 0 ? 10 : 16))
        .join('')
  );
  console.log('  ' + '-'.repeat(74));

  for (const c of coins) {
    const row = [
      String(c.coin || '').padEnd(10),
      String(c.walletBalance || '0').padEnd(16),
      String(c.availableToWithdraw || c.availableToTransfer || '0').padEnd(16),
      String(c.usdValue || '0').padEnd(16),
      String(c.locked || '0').padEnd(16),
    ].join('');
    console.log('  ' + row);
  }
}

async function checkAddress(coin, chain) {
  printHeader(`Deposit Address (${coin}${chain ? ` / ${chain}` : ''}${TESTNET ? ' · TESTNET' : ''})`);

  const response = await privateGet('/v5/asset/deposit/query-address', {
    coin,
    chainType: chain || undefined,
  });

  if (response.retCode !== 0) {
    fail(`Address request failed: [${response.retCode}] ${response.retMsg}`);
  }

  const result = response.result;
  if (!result || !result.chains?.length) {
    console.log('  No deposit address found for this coin/chain.');
    console.log('  Tip: confirm the coin ticker and chainType (e.g. USDT + ETH / TRX / BSC).');
    return;
  }

  printKv('Coin', result.coin);

  for (const item of result.chains) {
    console.log('');
    printKv('Chain', item.chainType || item.chain);
    printKv('Address', item.addressDeposit);
    printKv('Tag / Memo', item.tagDeposit || '(none)');
    printKv('Deposit status', item.chainDeposit === '1' ? 'Enabled' : 'Disabled');
    printKv('Withdraw status', item.chainWithdraw === '1' ? 'Enabled' : 'Disabled');
    if (item.confirmation) printKv('Confirmations', item.confirmation);
    if (item.minDepositAmount) printKv('Min deposit', item.minDepositAmount);
  }
}

function printUsage() {
  console.log(`
Bybit Balance & Address Bot

Commands:
  node bot.js                         Check balance + default deposit address
  node bot.js balance [COIN]          Check wallet balance (optional coin filter)
  node bot.js address [COIN] [CHAIN]  Check deposit address
  node bot.js check [COIN] [CHAIN]    Check both

Defaults (from bot.js config):
  accountType = ${ACCOUNT_TYPE}
  coin        = ${DEFAULT_COIN}
  chain       = ${DEFAULT_CHAIN}
  testnet     = ${TESTNET}
`);
}

async function main() {
  const [, , cmdRaw, arg1, arg2] = process.argv;
  const cmd = (cmdRaw || 'check').toLowerCase();

  if (['-h', '--help', 'help'].includes(cmd)) {
    printUsage();
    return;
  }

  ensureCredentials();
  const coin = (arg1 || DEFAULT_COIN).toUpperCase();
  const chain = (arg2 || DEFAULT_CHAIN).toUpperCase();

  console.log(`\nBybit bot ready · account=${ACCOUNT_TYPE} · network=${TESTNET ? 'testnet' : 'mainnet'}`);

  try {
    if (cmd === 'balance') {
      await checkBalance(arg1 ? coin : undefined);
    } else if (cmd === 'address') {
      await checkAddress(coin, arg2 ? chain : DEFAULT_CHAIN);
    } else if (cmd === 'check' || cmd === 'all') {
      await checkBalance(arg1 ? coin : undefined);
      await checkAddress(coin, arg2 ? chain : DEFAULT_CHAIN);
    } else {
      fail(`Unknown command "${cmd}". Use: balance | address | check`);
    }
    console.log('');
  } catch (err) {
    const msg = err?.message || err?.retMsg || String(err);
    fail(msg);
  }
}

main();
