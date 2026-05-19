/**
 * issueTestCert.js — Helper script to record a test certificate hash on-chain
 */
const { ethers } = require('hardhat');
const deployment = require('../deployments/localhost.json');

async function main() {
  const [owner] = await ethers.getSigners();
  const contract = new ethers.Contract(deployment.contractAddress, deployment.abi, owner);

  const testCertHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  
  console.log(`Issuing test certificate on-chain: ${testCertHash}`);
  
  const tx = await contract.issueCertificate(testCertHash);
  await tx.wait();
  
  console.log('✅ Test certificate issued successfully on-chain!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
