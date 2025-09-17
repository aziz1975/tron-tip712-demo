require('dotenv').config();
const {TronWeb} = require('tronweb');

const FULL_HOST = process.env.FULL_HOST || 'https://nile.trongrid.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NETWORK   = (process.env.NETWORK || 'nile').toLowerCase();

if (!PRIVATE_KEY) {
  throw new Error('Set PRIVATE_KEY in your .env');
}

const CHAIN_ID_HEX = {
  mainnet: '0x2b6653dc',
  nile:    '0xcd8690dc',
};

const tronWeb = new TronWeb({
  fullHost: FULL_HOST,
  privateKey: PRIVATE_KEY
});

(async () => {
  const signerAddr = tronWeb.address.fromPrivateKey(PRIVATE_KEY);

  const domain = {
    name: 'TRON TIP-712 Demo',
    version: '1',
    chainId: CHAIN_ID_HEX[NETWORK] || CHAIN_ID_HEX.nile,
    verifyingContract: signerAddr,
  };

  const types = {
    Person: [
      { name: 'name',   type: 'string'  },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from',    type: 'Person'  },
      { name: 'to',      type: 'Person'  },
      { name: 'contents',type: 'string'  },
      { name: 'nonce',   type: 'uint256' },
    ],
  };

  const value = {
    from: { name: 'Cow', wallet: signerAddr },
    to:   { name: 'Bob', wallet: signerAddr },
    contents: 'Hello from TRON typed data!',
    nonce: Date.now(),
  };

  let signature = await tronWeb.trx._signTypedData(domain, types, value); // returns 0x_____
  console.log('Signature:', signature);

  let sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const tail = sig.slice(128, 130);
  if (tail === '00') sig = sig.slice(0, 128) + '1b';
  else if (tail === '01') sig = sig.slice(0, 128) + '1c';
  signature = '0x' + sig;

  console.log('Signature:', signature);

  const ok = await tronWeb.trx.verifyTypedData(domain, types, value, signature, signerAddr);
  console.log('Verified:', ok);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
