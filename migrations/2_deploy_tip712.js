require('dotenv').config();
const Tip712Verifier = artifacts.require('Tip712Verifier');

module.exports = function (deployer) {
  const name = process.env.NAME || 'TRON TIP-712 Demo';
  const version = process.env.VERSION || '1';
  deployer.deploy(Tip712Verifier, name, version);
};
