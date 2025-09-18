# TRON TIP-712 Demo (TronBox + TronWeb)

A minimal, end-to-end example that demonstrates **TIP-712** (TRON’s EIP-712 variant) by:

- deploying a small **on-chain verifier** contract with **TronBox**,
- **signing** a typed message off-chain with **TronWeb**, and
- verifying the signature **locally** and **on-chain**.


---

## What’s inside

- **`contracts/Tip712Verifier.sol`** – a tiny on-chain signature checker. It builds a fixed TIP-712 **domain separator** at deploy time (name, version, this contract’s address, TRON’s 32-bit `chainId`) and exposes `verify(...)` which recomputes the TIP-712 digest for a `Mail` message and uses `ecrecover` to confirm the signer.
- **`demo.js`** – Node.js script that constructs **domain / types / value**, signs the typed data via `tronWeb.trx._signTypedData`, normalizes the `v` byte (`00/01 → 1b/1c`), verifies **locally**, and then calls the contract’s `verify` to confirm **on-chain**.
- **`migrations/2_deploy_tip712.js`** – TronBox migration that deploys the verifier with `NAME` and `VERSION` from your environment.
- **`tronbox.js`** – networks & compiler settings (Nile by default).
- **`.env.sample`** – template for your local `.env`.

---

## TIP-712 on TRON (quick mental model)

- **Domain** = the **stamp**: `{ name, version, chainId(32-bit), verifyingContract }`  
  Binds a signature to one app/contract/chain → prevents **replay** elsewhere.
- **Types** = the **form template**: schema for your structs.
- **Value** = the **filled form**: the actual data you approve.

TRON specifics:

- Domain uses **low 32 bits** of `block.chainid`.
  - Mainnet: `0x2b6653dc`
  - Nile: `0xcd8690dc`
- Addresses are handled as 20-byte values under the hood.
- Some tools return signature `v` as `0/1`; many verifiers expect `27/28` → normalize for compatibility.

---

## Project structure

```
TRON-TIP712-DEMO
├─ build/contracts/                # created by tronbox compile/migrate
├─ contracts/
│  ├─ Migrations.sol
│  └─ Tip712Verifier.sol
├─ migrations/
│  └─ 2_deploy_tip712.js
├─ demo.js
├─ tronbox.js
├─ .env           # your real secrets (not committed)
├─ .env.sample    # template
└─ package.json
```

---

## Prerequisites

- **Node.js 20+**
- **TronBox CLI**: `npm i -g tronbox`
- A TRON account **private key** with some **Nile** test TRX
- RPC endpoint (default in this repo): `https://nile.trongrid.io`

---

## 1) Install

```bash
npm install
# (If you don't have TronBox globally)
npm i -g tronbox
```

---

## 2) Configure environment

Copy `.env.sample` → `.env`, then edit:

```ini
FULL_HOST=https://nile.trongrid.io
PRIVATE_KEY=YOUR_PRIVATE_KEY_64HEX
NETWORK=nile

# TIP-712 domain values
NAME=TRON TIP-712 Demo
VERSION=1

# Set this after deployment (see step 3):
VERIFYING_CONTRACT=TP....................
```

> **Note:** `VERIFYING_CONTRACT` is the _deployed_ contract address (base58 T-address) you’ll paste after running migrations.

---

## 3) Compile & deploy (Nile)

```bash
tronbox compile
tronbox migrate --reset --network nile
```

Grab the printed **contract address** (T-address) from migration output and put it in `.env` as `VERIFYING_CONTRACT=`.

> If you see `Could not find artifacts for ./Migrations`, ensure `contracts/Migrations.sol` exists (and optionally add a `migrations/1_initial_migration.js`) then re-run `tronbox compile`.

---

## 4) Run the demo

```bash
node demo.js
```

**Expected output (example):**

```
Signature: 0x<r...s...v>
Local verify: true
On-chain verify: true
```

- `Local verify: true` → TronWeb recovered your signer address from the signature.
- `On-chain verify: true` → the contract computed the same TIP-712 digest and `ecrecover` matched the expected signer.

---

## How it works (end-to-end)

1. **Contract deploy** creates a domain separator from `(NAME, VERSION, uint32(chainId), address(this))` and stores it immutably.
2. **demo.js** builds the same **domain**, defines **types** and **value**, and calls `_signTypedData` to sign.
3. demo.js **normalizes** the signature `v` byte to `1b/1c` (27/28) for broad compatibility.
4. demo.js checks **locally** with `verifyTypedData(...)` (no RPC required).
5. demo.js calls the contract’s **`verify(...)`** with:
   - `Mail` as tuples: `[[from.name, from.wallet], [to.name, to.wallet], contents, nonce]`
   - `expectedSigner` (your T-address)
   - `signature`
6. The contract reconstructs the same TIP-712 **digest** and runs `ecrecover(...)` to confirm the signer.

---

## Troubleshooting

- **Artifacts not found (`Tip712Verifier.json`)**  
  Make sure you run `node demo.js` from the **project root** where `build/contracts/Tip712Verifier.json` exists (created by TronBox). The script uses `process.cwd()` to load the artifact.

- **`Could not find artifacts for ./Migrations`**  
  Add `contracts/Migrations.sol` (and optionally `migrations/1_initial_migration.js`), then `tronbox compile`.

- **`Local verify: false`**  
  Domain or message mismatch. Ensure `name`, `version`, `verifyingContract`, and **32-bit** `chainId` match between JS and Solidity; also check `nonce` and string content.

- **`On-chain verify: false`**  
  Same as above _plus_ make sure the `Mail` struct is passed as tuples in the **declared order**.

- **Rate limits / RPC errors**  
  Nile endpoint is public; mainnet often needs a TronGrid API key (`TRON_PRO_API_KEY`).

---

## Notes & extensions

- To port this to mainnet, set `FULL_HOST=https://api.trongrid.io` and use `chainId=0x2b6653dc` in your domain.
- You can wire `verify(...)` into state-changing functions (e.g., “if valid signature, then mint/transfer/execute”).
- TIP-712 also defines an atomic `trcToken` type (not used in this demo).

---

## License

MIT
