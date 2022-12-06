const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { keccak256 } = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const { constants, balance } = require("@openzeppelin/test-helpers");
const { BigNumber } =  require("ethers");
const { tracker } = require("@openzeppelin/test-helpers/src/balance");

function expandTo18Decimals(n) {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

const provider = ethers.provider;

describe("Treasury", function () {
  
  async function deployTreasury() {
    const [owner, wallet_1, wallet_2, wallet_3, wallet_4] =
      await ethers.getSigners();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("USDC", "USDC");

    const NFT = await ethers.getContractFactory("CLOIDNFT");
    const nft = await NFT.deploy();

    await nft.connect(wallet_1).mint(wallet_1.address, 1);

    const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);
    const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);
    await treasury.grantRole(ADMIN_ROLE, wallet_2.address);

    return { treasury, owner, wallet_1, wallet_2, token, nft };
  }

  describe("Deployment", function () {
    it("Should set role for admin", async function () {
      const { treasury, owner, wallet_1 } = await loadFixture(deployTreasury);

      const bigAdminRole = ethers.utils.solidityPack(
        ["string"],
        ["BIG_ADMIN_ROLE"]
      );

      const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);

      // console.log(bigAdminRole)
      const BIG_ADMIN_ROLE = ethers.utils.solidityKeccak256(
        ["bytes"],
        [bigAdminRole]
      );
      const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);

      expect(await treasury.owner()).to.equal(owner.address);
      expect(await treasury.hasRole(BIG_ADMIN_ROLE, owner.address)).to.be.equal(
        true
      );
      expect(await treasury.getRoleAdmin(ADMIN_ROLE)).to.be.equal(
        BIG_ADMIN_ROLE
      );
    });

    it("BIG_ADMIN_ROLE should grant ADMIN_ROLE", async function () {
      const { treasury, owner, wallet_1 } = await loadFixture(deployTreasury);

      const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);

      const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);

      await treasury.grantRole(ADMIN_ROLE, wallet_1.address);

      expect(await treasury.hasRole(ADMIN_ROLE, wallet_1.address)).to.be.equal(
        true
      );
    });

    it("Should revert if granter is not BIG_ADMIN_ROLE", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      const bigAdminRole = ethers.utils.solidityPack(
        ["string"],
        ["BIG_ADMIN_ROLE"]
      );

      const adminRole = ethers.utils.solidityPack(["string"], ["ADMIN_ROLE"]);

      const BIG_ADMIN_ROLE = ethers.utils.solidityKeccak256(
        ["bytes"],
        [bigAdminRole]
      );
      const ADMIN_ROLE = ethers.utils.solidityKeccak256(["bytes"], [adminRole]);

      await expect(
        treasury.connect(wallet_2).grantRole(ADMIN_ROLE, wallet_1.address)
      ).to.be.reverted;
      await treasury.grantRole(ADMIN_ROLE, wallet_1.address);
      expect(await treasury.hasRole(ADMIN_ROLE, wallet_1.address)).to.be.equal(
        true
      );
      await expect(
        treasury.connect(wallet_1).grantRole(ADMIN_ROLE, wallet_2.address)
      ).to.be.reverted;
    });
  });

  describe("Treasury Deposit Token", function () {
    it("Should Deposit ETH", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      // await wallet_1.sendTransaction({
      //   to: treasury.address,
      //   value: ethers.utils.parseEther("1.0"),
      // });

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("1")});

      let balanceAfterTransfer = await provider.getBalance(treasury.address);

      let balanceInEtherBefore =  parseInt(ethers.utils.formatEther(balanceBeforeTransfer));  
      let balanceInEtherAfter = parseInt(ethers.utils.formatEther(balanceAfterTransfer));
      
      expect(balanceInEtherBefore).to.be.equal(0);
      expect(balanceInEtherAfter).to.be.equal(1);
    });

    it("Should revert if Deposit 0 ETH", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await expect(treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(0), {value: ethers.utils.parseEther("0")})).to.be.rejected;
    });

    it("Should revert if Deposit ETH and amount not match", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      await expect(treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("2")})).to.be.reverted;
    });

    it("Should Deposit token", async function () {
      const { treasury, owner, wallet_1, wallet_2, token } = await loadFixture(
        deployTreasury
      );

      let tokenBalanceBeforeTransfer = await token.balanceOf(treasury.address);

      await token.connect(owner).approve(treasury.address, expandTo18Decimals(100));
      await treasury.connect(owner).deposit(token.address, expandTo18Decimals(100));

      let tokenBalanceAfterTransfer = await token.balanceOf(treasury.address);

      let blanceBefore =  parseInt(ethers.utils.formatEther(tokenBalanceBeforeTransfer));
      let balanceAfter = parseInt(ethers.utils.formatEther(tokenBalanceAfterTransfer));
      
      expect(blanceBefore).to.be.equal(0);
      expect(balanceAfter).to.be.equal(100);
    });

    it("Should revert when Deposit zero amount token", async function () {
      const { treasury, owner, wallet_1, wallet_2, token } = await loadFixture(
        deployTreasury
      );

      await token.connect(owner).approve(treasury.address, expandTo18Decimals(100));
      await expect(treasury.connect(owner).deposit(token.address, expandTo18Decimals(0))).to.be.reverted;
    
    });

    it("Should revert when Deposit token with amount ethers", async function () {
      const { treasury, owner, wallet_1, wallet_2, token } = await loadFixture(
        deployTreasury
      );

      await token.connect(owner).approve(treasury.address, expandTo18Decimals(100));
      await expect(treasury.connect(owner).deposit(token.address, expandTo18Decimals(100), {value: ethers.utils.parseEther("2")})).to.be.reverted;
      
    });

  });

  describe("Treasury Withdraw Token", function () {
    it("Should withdraw ETH", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("1")});

      let balanceAfterTransfer = await provider.getBalance(treasury.address);

      let balanceInEtherBefore =  parseInt(ethers.utils.formatEther(balanceBeforeTransfer));  
      let balanceInEtherAfter = parseInt(ethers.utils.formatEther(balanceAfterTransfer));
    
      expect(balanceInEtherBefore).to.be.equal(0);
      expect(balanceInEtherAfter).to.be.equal(1);

      await treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1));

      let balanceAfterWithdraw = await provider.getBalance(treasury.address);
      let balanceInEtherBeforeWithdraw =  parseInt(ethers.utils.formatEther(balanceAfterWithdraw));  

      expect(balanceInEtherBeforeWithdraw).to.be.equal(0);
    });

    it("Should revert Withdraw if 0 ETH in contract", async function () { 
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      await expect(treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1))).to.be.reverted;
    });

    it("Should revert Withdraw if transfer to zero address", async function () { 
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("1")});

      let balanceAfterTransfer = await provider.getBalance(treasury.address);

      let balanceInEtherBefore =  parseInt(ethers.utils.formatEther(balanceBeforeTransfer));  
      let balanceInEtherAfter = parseInt(ethers.utils.formatEther(balanceAfterTransfer));
    
      expect(balanceInEtherBefore).to.be.equal(0);
      expect(balanceInEtherAfter).to.be.equal(1);

      await expect(treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, constants.ZERO_ADDRESS, expandTo18Decimals(1))).to.be.reverted;
    });

    it("Should Withdraw token", async function () { 
      const { treasury, owner, wallet_1, wallet_2, token } = await loadFixture(
        deployTreasury
      );

      let tokenBalanceBeforeTransfer = await token.balanceOf(treasury.address);
      let blanceBefore =  parseInt(ethers.utils.formatEther(tokenBalanceBeforeTransfer));

      await token.connect(owner).approve(treasury.address, expandTo18Decimals(100));
      await treasury.connect(owner).deposit(token.address, expandTo18Decimals(100));

      let tokenBalanceAfterTransfer = await token.balanceOf(treasury.address);
      let balanceAfter = parseInt(ethers.utils.formatEther(tokenBalanceAfterTransfer));
      
      expect(blanceBefore).to.be.equal(0);
      expect(balanceAfter).to.be.equal(100);

      await treasury.connect(wallet_2).withdraw(token.address, wallet_1.address, expandTo18Decimals(100));

      let tokenBalanceBeforeWithdraw = await token.balanceOf(treasury.address);
      let blanceBeforeWithdraw =  parseInt(ethers.utils.formatEther(tokenBalanceBeforeWithdraw));

      expect(blanceBeforeWithdraw).to.be.equal(0);
    });

    it("Should revert when withdraw zero amount token", async function () { 
      const { treasury, owner, wallet_1, wallet_2, token } = await loadFixture(
        deployTreasury
      );

      let tokenBalanceBeforeTransfer = await token.balanceOf(treasury.address);
      let blanceBefore =  parseInt(ethers.utils.formatEther(tokenBalanceBeforeTransfer));

      await token.connect(owner).approve(treasury.address, expandTo18Decimals(100));
      await treasury.connect(owner).deposit(token.address, expandTo18Decimals(100));

      let tokenBalanceAfterTransfer = await token.balanceOf(treasury.address);
      let balanceAfter = parseInt(ethers.utils.formatEther(tokenBalanceAfterTransfer));
      
      expect(blanceBefore).to.be.equal(0);
      expect(balanceAfter).to.be.equal(100);

      await expect(treasury.connect(wallet_2).withdraw(token.address, wallet_1.address, expandTo18Decimals(0))).to.be.reverted;
    });

  });

  describe("Treasury Deposit NFT", function () {
  
    it("Should deposit NFT", async function () {
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      let balanceBeforHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceBefor = parseInt(balanceBeforHex);

      // await nft.connect(wallet_1).approve(treasury.address, 1);
      await nft.connect(wallet_1).setBaseURI("xxx");
      // await nft.connect(wallet_1).safeTransferFrom(wallet_1.address, treasury.ad);
      // await treasury.connect(wallet_1).depositNFT(nft.address, 1);


      await expect(nft.connect(wallet_1)["safeTransferFrom(address,address,uint256)"](wallet_1.address, treasury.address, 1)).to.be.emit(treasury, "DepositNFT").withArgs(nft.address, wallet_1.address, treasury.address, 1);  
  
      let eventFilter = treasury.filters.DepositNFT();
      let events = await treasury.queryFilter(eventFilter)
      console.log(events);

      let balanceAfterHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceAfter = parseInt(balanceAfterHex);

      expect(balanceBefor).to.be.equal(0);
      expect(balanceAfter).to.be.equal(1);

    });

    xit("Should revert if deposit zero address token", async function () { 
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      await nft.connect(wallet_1).approve(treasury.address, 1);
      await expect(treasury.connect(wallet_1).depositNFT(constants.ZERO_ADDRESS, 1)).to.be.reverted;
    });

    xit("Should revert if NFT id not exist", async function () { 
      const { treasury, owner, wallet_1, wallet_2 , token, nft} = await loadFixture(
        deployTreasury
      );

      await nft.connect(wallet_1).approve(treasury.address, 1);
      await expect(treasury.connect(wallet_1).depositNFT(nft.address, 2)).to.be.reverted;
    });

    xit("Should revert if NFT id not approve", async function () { 
      const { treasury, owner, wallet_1, wallet_2 , token, nft} = await loadFixture(
        deployTreasury
      );

      await expect(treasury.connect(wallet_1).depositNFT(nft.address, 1)).to.be.reverted;

    });

  });

  xdescribe("Treasury Withdraw NFT", function () {
  
    it("Should Withdraw NFT", async function () { 
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      let balanceBeforHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceBefor = parseInt(balanceBeforHex);

      await nft.connect(wallet_1).approve(treasury.address, 1);
      await treasury.connect(wallet_1).depositNFT(nft.address, 1);
  
      let balanceAfterHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceAfter = parseInt(balanceAfterHex);

      expect(balanceBefor).to.be.equal(0);
      expect(balanceAfter).to.be.equal(1);

      await treasury.connect(wallet_2).withdrawNFT(nft.address, wallet_1.address, 1);

      let balanceAfterWithdrawString = (await nft.balanceOf(treasury.address)).toString();
      let balanceAfterWithdraw = parseInt(balanceAfterWithdrawString);

      expect(balanceAfterWithdraw).to.be.equal(0);
      await nft.connect(wallet_1).burn(1);
    });

    it("Should revert if withdraw zero address token", async function () { //// xxxx 
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      let balanceBeforHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceBefor = parseInt(balanceBeforHex);

      await nft.connect(wallet_1).approve(treasury.address, 1);
      await treasury.connect(wallet_1).depositNFT(nft.address, 1);
  
      let balanceAfterHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceAfter = parseInt(balanceAfterHex);

      expect(balanceBefor).to.be.equal(0);
      expect(balanceAfter).to.be.equal(1);

      await expect(treasury.connect(wallet_2).withdrawNFT(nft.address, constants.ZERO_ADDRESS, 1)).to.be.reverted;
    });

    it("Should revert if contract doesn't own NFT id", async function () { //// xxxx 
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      await expect(treasury.connect(wallet_2).withdrawNFT(nft.address, wallet_1.address, 1)).to.be.reverted;

    });

  });

  xdescribe("Treasury Withdraw Pause", function () {

    it("Should revert withdraw ETH when pause", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("1")});

      let balanceAfterTransfer = await provider.getBalance(treasury.address);

      let balanceInEtherBefore =  parseInt(ethers.utils.formatEther(balanceBeforeTransfer));  
      let balanceInEtherAfter = parseInt(ethers.utils.formatEther(balanceAfterTransfer));
    
      expect(balanceInEtherBefore).to.be.equal(0);
      expect(balanceInEtherAfter).to.be.equal(1);

      await treasury.connect(wallet_2).setPauseStatus();

      await expect(treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1))).to.be.reverted;

      await treasury.connect(wallet_2).setUnPauseStatus();

      await treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1));
    });

    it("Should revert withdraw ETH when pause", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      let balanceBeforeTransfer = await provider.getBalance(treasury.address);

      await treasury.connect(wallet_1).deposit(constants.ZERO_ADDRESS, expandTo18Decimals(1), {value: ethers.utils.parseEther("1")});

      let balanceAfterTransfer = await provider.getBalance(treasury.address);

      let balanceInEtherBefore =  parseInt(ethers.utils.formatEther(balanceBeforeTransfer));  
      let balanceInEtherAfter = parseInt(ethers.utils.formatEther(balanceAfterTransfer));
  
      expect(balanceInEtherBefore).to.be.equal(0);
      expect(balanceInEtherAfter).to.be.equal(1);

      await treasury.connect(wallet_2).setPauseStatus();

      await expect(treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1))).to.be.reverted;

      await treasury.connect(wallet_2).setUnPauseStatus();

      await treasury.connect(wallet_2).withdraw(constants.ZERO_ADDRESS, wallet_1.address, expandTo18Decimals(1));
    });

    it("Should revert withdraw NFT when pause", async function () {
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      let balanceBeforHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceBefor = parseInt(balanceBeforHex);

      await nft.connect(wallet_1).approve(treasury.address, 1);
      await treasury.connect(wallet_1).depositNFT(nft.address, 1);

      let balanceAfterHex = (await nft.balanceOf(treasury.address)).toString();
      let balanceAfter = parseInt(balanceAfterHex);

      expect(balanceBefor).to.be.equal(0);
      expect(balanceAfter).to.be.equal(1);

      await treasury.connect(wallet_2).setPauseStatus();

      await expect(treasury.connect(wallet_2).withdrawNFT(nft.address, wallet_1.address, 1)).to.be.reverted;
    
      await treasury.connect(wallet_2).setUnPauseStatus();

      await treasury.connect(wallet_2).withdrawNFT(nft.address, wallet_1.address, 1);
    });

    it("Should revert setUnPauStatus while UnPause", async function () {
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      await expect(treasury.connect(wallet_2).setUnPauseStatus()).to.be.reverted;
    
    });

    it("Should revert setPauStatus while Pause", async function () {
      const { treasury, owner, wallet_1, wallet_2, token, nft } = await loadFixture(
        deployTreasury
      );

      await treasury.connect(wallet_2).setPauseStatus();

      await expect(treasury.connect(wallet_2).setPauseStatus()).to.be.reverted;
    
    });

  });

  describe("Fall Back", function () {

    it("Should invoke the callback function", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      const nonExistentFuncSignature = 'nonExistentFunc(uint256,uint256)';

      const fakeDemoContract = new ethers.Contract(
        treasury.address,
        [
          ...treasury.interface.fragments,
          `function ${nonExistentFuncSignature}`,
        ],
        owner,
      );

      // const tx = fakeDemoContract[nonExistentFuncSignature](8, 9);

      // await expect(tx)
      //   .to.emit(demoContract, 'Error')
      //   .withArgs('call of a non-existent function');

      await expect(fakeDemoContract.connect(wallet_2).nonExistentFunc(expandTo18Decimals(1), expandTo18Decimals(1))).to.be.reverted;
    });

    it("Should invoke the receive function", async function () {
      const { treasury, owner, wallet_1, wallet_2 } = await loadFixture(
        deployTreasury
      );

      await expect(owner.sendTransaction({to: treasury.address, value: ethers.utils.parseEther("1"), gasLimit: 3e7})).to.be.reverted;

    });    
  });

});


//await expect(nft.connect(wallet_1)["safeTransferFrom(address,address,uint256)"](wallet_1.address, treasury.address, 1)).to.be.emit(treasury, "DepositNFT").withArgs(nft.address, wallet_1.address, treasury.address, 1);