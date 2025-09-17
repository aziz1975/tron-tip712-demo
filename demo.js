require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {TronWeb} = require('tronweb');

const {
  FULL_HOST, TRON_PRO_API_KEY, PRIVATE_KEY, NETWORK = 'nile',
  NAME = 'TRON TIP-712 Demo', VERSION = '1', VERIFYING_CONTRACT
} = process.env;

if (!FULL_HOST || !PRIVATE_KEY || !VERIFYING_CONTRACT) {
  throw new Error('Set FULL_HOST, PRIVATE_KEY, and VERIFYING_CONTRACT in .env');
}

// Load ABI from TronBox build output
// const build = JSON.parse(
//   fs.readFileSync(path.join(__dirname, '..', 'build', 'contracts', 'Tip712Verifier.json'), 'utf8')
// );

const artifactPath = path.resolve(process.cwd(), 'build/contracts/Tip712Verifier.json');
const { abi } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
//const abi = build.abi;

const tronWeb = new TronWeb({
  fullHost: FULL_HOST,
  privateKey: PRIVATE_KEY,
  headers: TRON_PRO_API_KEY ? { 'TRON-PRO-API-KEY': TRON_PRO_API_KEY } : undefined
});

// TIP-712 chainId (TRON uses lower 32 bits of block.chainid)
const CHAIN_ID_HEX = {
  mainnet: '0x2b6653dc',
  nile:    '0xcd8690dc'
};

(async () => {
  const signer = tronWeb.address.fromPrivateKey(PRIVATE_KEY);

  // Domain MUST match contract constructor + address
  const domain = {
    name: NAME,
    version: VERSION,
    chainId: CHAIN_ID_HEX[NETWORK] || CHAIN_ID_HEX.nile,
    verifyingContract: VERIFYING_CONTRACT
  };

  const types = {
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' }
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
      { name: 'nonce', type: 'uint256' }
    ]
  };

  const value = {
    from: { name: 'Cow', wallet: signer },
    to:   { name: 'Bob', wallet: signer },
    contents: 'Hello TIP-712 on TRON!',
    nonce: Date.now()
  };

  // 1) Sign (TIP-712)
  let signature = await tronWeb.trx._signTypedData(domain, types, value); // 0x + r s v

  // v-normalization: 00/01 -> 1b/1c (recommended by TronWeb docs)
  let raw = signature.startsWith('0x') ? signature.slice(2) : signature;
  const vHex = raw.slice(128, 130);
  if (vHex === '00') raw = raw.slice(0, 128) + '1b';
  else if (vHex === '01') raw = raw.slice(0, 128) + '1c';
  signature = '0x' + raw;

  console.log('Signature:', signature);

  // 2) Local verify
  const okLocal = await tronWeb.trx.verifyTypedData(domain, types, value, signature, signer);
  console.log('Local verify:', okLocal);

  // 3) On-chain verify (pass nested structs as arrays: [name, wallet])
  const contract = await tronWeb.contract(abi, VERIFYING_CONTRACT);
  const okOnChain = await contract.verify(
    [[value.from.name, value.from.wallet], [value.to.name, value.to.wallet], value.contents, value.nonce],
    signer,
    signature
  ).call();

  console.log('On-chain verify:', okOnChain);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
