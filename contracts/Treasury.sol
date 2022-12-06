// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";


import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "./SwapRouterProxy.sol";

contract Treasury is Initializable, OwnableUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable, IERC721ReceiverUpgradeable, SwapRouterProxy {

    bytes32 constant public BIG_ADMIN_ROLE = keccak256("BIG_ADMIN_ROLE");
    bytes32 constant public ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event Deposit(address indexed token, address indexed from, address indexed to, uint256 amount);
    event Withdraw(address indexed token, address indexed from, address indexed to, uint256 amount);
    event DepositNFT(address indexed token, address indexed from, address indexed to, uint256 id);
    event WithdrawNFT(address indexed token, address indexed from, address indexed to, uint256 id);

    // constructor(ISwapRouter _router) SwapRouterProxy(_router) {
    //     _setRoleAdmin(ADMIN_ROLE, BIG_ADMIN_ROLE);
    //     _setupRole(BIG_ADMIN_ROLE, msg.sender);
    //     _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    // }

    function initializeTreasury(ISwapRouter _router) external initializer {
        _swapInit(_router);
        _setRoleAdmin(ADMIN_ROLE, BIG_ADMIN_ROLE);
        _setupRole(BIG_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        __Ownable_init();
        __Pausable_init();
    }


    function changeRouter(ISwapRouter _swapRouter) external onlyRole(ADMIN_ROLE) {
        swapRouter = _swapRouter;
    }

    function deposit(address _token, uint256 _amount) external payable {
        if (_token != address(0)) {
            require(msg.value == 0, "INVALID_AMOUNT_NATIVE_TOKEN_DEPOSIT");
            require(_amount > 0, "ZERO_AMOUNT_TOKEN");
            IERC20(_token).transferFrom(address(msg.sender), address(this), _amount);
        }
        else {
            require(msg.value > 0, "ZERO_ETHER");
            require(msg.value == _amount, "AMOUNT_NOT_MATCH");
        }

        emit Deposit(_token, msg.sender, address(this), _amount);
    }

    function withdraw(address _token, address _to, uint256 _amount) external  onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {

        require(_to != address(0), "CANT_TRANSFER_TO_ZERO_ADDRESS");

        if (_token != address(0)) {
            require(_amount > 0, "ZERO_AMOUNT_TOKEN");
            require(IERC20(_token).balanceOf(address(this)) >= _amount);
            IERC20(_token).transfer(_to, _amount);
        }
        else {
            require(address(this).balance >= _amount, "NOT_ENOUGH_ETHERS");
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "TRANSFER_NATIVE_TOKEN_FAILED!");
        }
        
        emit Withdraw(_token, address(this), _to, _amount);
    }

    function depositNFT(address _token, address _from, uint256 _id) internal {
        require(_token != address(0), "INVALID_TOKEN_ADDRESS");

        emit DepositNFT(_token, address(_from), address(this), _id);
    }

    function withdrawNFT(address _token, address _to, uint256 _id) external onlyRole(ADMIN_ROLE) whenNotPaused { 
        require(_token != address(0), "INVALID_TOKEN_ADDRESS");
        require(IERC721Upgradeable(_token).ownerOf(_id) == address(this), "TREASURY_DOESNT_HAVE_THIS_NFT");

        IERC721Upgradeable(_token).safeTransferFrom(address(this), _to, _id, "0x");
        

        emit WithdrawNFT(_token, address(this), _to, _id);
    }

    function setPauseStatus() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function setUnPauseStatus() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev fallback function
     */
    fallback() external override payable {

    }

    /**
     * @dev fallback function
     */
    receive() external payable {

    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        depositNFT(msg.sender, from, tokenId);
        return IERC721ReceiverUpgradeable.onERC721Received.selector;    
    }

}


