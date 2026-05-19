const hre = require("hardhat");

async function main() {
  const contractAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  console.log("Checking contract at:", contractAddress);
  
  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const contract = CertificateRegistry.attach(contractAddress);
  
  try {
    const owner = await contract.owner();
    console.log("Contract owner:", owner);
    
    const isOwnerAuthorized = await contract.isAuthorizedIssuer(owner);
    console.log("Is owner authorized issuer:", isOwnerAuthorized);
    
    console.log("Contract is fully functional and responding!");
  } catch (err) {
    console.error("Failed to query contract:", err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
