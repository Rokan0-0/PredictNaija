import hre from "hardhat";

async function main() {
  console.log("Starting deployment of PredictNaijaManager...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "STT");

  const PredictNaijaManager = await hre.ethers.getContractFactory("PredictNaijaManager");
  const manager = await PredictNaijaManager.deploy();
  await manager.waitForDeployment();

  const contractAddress = await manager.getAddress();
  console.log("PredictNaijaManager successfully deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
