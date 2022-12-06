// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { upgrades, ethers } = require("hardhat");



async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');


  /// ================ Deploy Proxy ==========================
  const _router = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

  const Greeter = await ethers.getContractFactory("Treasury");
  // const greeter = await Greeter.deploy(_router);
  const greeter = await upgrades.deployProxy(Greeter, [_router], {initializer: 'initializeTreasury'});

  await greeter.deployed();

  console.log("COLID treasury deployed at: ", greeter.address);

  /// ================ Deploy Proxy ==========================


  // /// ================ UPGRADE ==========================
  // const treasuryProxyAddress = "0x5173cce22A2fbCF0f8324B96C0651e369450474D"
  // const Treasury = await ethers.getContractFactory("TreasuryV2");
  // const treasury = await upgrades.upgradeProxy(treasuryProxyAddress, Treasury);

  // console.log("treasury upgraded: ", treasury.address);
  // /// ================ UPGRADE ==========================

  await hre.run("verify:verify", {
    address: greeter.address,
    constructorArguments: [_router],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

