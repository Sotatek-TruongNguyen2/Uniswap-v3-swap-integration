// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const _router = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

  const Greeter = await hre.ethers.getContractFactory("TestSwap");
  const greeter = await Greeter.deploy(_router);

  await greeter.deployed();

  console.log("COLID TestSwap deployed at: ", greeter.address);

  await hre.run("verify:verify", {
    address: greeter.address,
    contract: "contracts/TestSwap.sol:TestSwap",
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

