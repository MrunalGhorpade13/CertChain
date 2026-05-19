/**
 * deploy.js — Hardhat Deployment Script for CertificateRegistry
 *
 * This script:
 *  1. Connects to the specified network (localhost or Sepolia testnet)
 *  2. Deploys the CertificateRegistry smart contract
 *  3. Waits for block confirmations (important on public testnets)
 *  4. Prints the deployed contract address
 *  5. Saves the contract address and ABI to a shared JSON file
 *     so the frontend and backend can import it directly
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost   (local dev)
 *   npx hardhat run scripts/deploy.js --network sepolia     (testnet)
 *
 * After deployment:
 *   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>  (verify on Etherscan)
 */

const { ethers, network } = require('hardhat');
const fs   = require('fs');
const path = require('path');

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('   🚀  CertificateRegistry — Deployment Script');
  console.log('══════════════════════════════════════════════════════\n');

  // ── 1. Get the deployer account ────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log(`   Network:   ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`   Deployer:  ${deployer.address}`);
  console.log(`   Balance:   ${ethers.formatEther(balance)} ETH\n`);

  // ── 2. Check deployer has enough ETH ───────────────────────────────────
  if (balance === 0n) {
    console.error('❌ Deployer has 0 ETH. Please fund the wallet before deploying.');
    console.error('   For Sepolia: https://sepoliafaucet.com\n');
    process.exit(1);
  }

  // ── 3. Deploy the contract ─────────────────────────────────────────────
  console.log('   📦 Deploying CertificateRegistry...\n');

  const CertificateRegistry = await ethers.getContractFactory('CertificateRegistry');
  const registry = await CertificateRegistry.deploy();

  // Wait for deployment transaction to be mined
  await registry.waitForDeployment();
  const contractAddress = await registry.getAddress();

  // ── 4. Wait for block confirmations (testnets need more for Etherscan) ─
  const isTestnet = network.name !== 'hardhat' && network.name !== 'localhost';
  if (isTestnet) {
    const CONFIRMATIONS = 5;
    console.log(`   ⏳ Waiting for ${CONFIRMATIONS} block confirmations on ${network.name}...`);
    await registry.deploymentTransaction().wait(CONFIRMATIONS);
    console.log(`   ✅ Confirmed!\n`);
  }

  // ── 5. Verify deployment by reading contract state ─────────────────────
  const contractName  = await registry.name();
  const contractVer   = await registry.version();
  const ownerAddr     = await registry.owner();
  const isIssuer      = await registry.isAuthorizedIssuer(deployer.address);

  console.log('   ── Deployment Successful ──────────────────────────');
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Contract Name:    ${contractName} v${contractVer}`);
  console.log(`   Owner:            ${ownerAddr}`);
  console.log(`   Owner is Issuer:  ${isIssuer}`);
  console.log('   ───────────────────────────────────────────────────\n');

  // ── 6. Save contract address & ABI for frontend/backend consumption ────
  //
  // We write a JSON file to a shared location that both the frontend
  // and backend can import. This avoids manual copy-pasting of addresses.

  const artifact   = await ethers.getContractFactory('CertificateRegistry');
  const abi        = artifact.interface.formatJson();
  const deployInfo = {
    network:         network.name,
    chainId:         network.config.chainId,
    contractAddress: contractAddress,
    deployer:        deployer.address,
    deployedAt:      new Date().toISOString(),
    abi:             JSON.parse(abi),
  };

  // Save to contracts/deployments/ directory
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployInfo, null, 2));
  console.log(`   💾 Deployment info saved to: deployments/${network.name}.json`);

  // Also save a copy for the frontend (convenient import)
  const frontendDir = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts');
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const frontendFile = path.join(frontendDir, 'CertificateRegistry.json');
  fs.writeFileSync(frontendFile, JSON.stringify(deployInfo, null, 2));
  console.log(`   💾 ABI + address copied to:  frontend/src/contracts/CertificateRegistry.json`);

  // ── 7. Print next steps ────────────────────────────────────────────────
  console.log('\n   📋 Next Steps:');
  console.log('   ─────────────────────────────────────────────────────');

  if (isTestnet) {
    console.log(`   1. Verify on Etherscan:`);
    console.log(`      npx hardhat verify --network ${network.name} ${contractAddress}\n`);
    console.log(`   2. View on Etherscan:`);
    console.log(`      https://${network.name}.etherscan.io/address/${contractAddress}\n`);
  } else {
    console.log('   1. Start your frontend: cd ../frontend && npm run dev');
    console.log('   2. Connect MetaMask to localhost:8545 (chain ID 31337)');
    console.log('   3. Import a Hardhat test account private key into MetaMask\n');
  }

  console.log('══════════════════════════════════════════════════════\n');
}

// Catch and report deployment errors
main().catch((error) => {
  console.error('\n❌ Deployment failed:\n', error);
  process.exitCode = 1;
});
