// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';


/// @title Periphery Payments
/// @notice Functions to ease deposits and withdrawals of ETH
interface IPeripheryPayments {
    /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
    /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
    /// that use ether for the input amount
    function refundETH() external payable;
}

interface IPeripheryImmutableState {
    /// @return Returns the address of the Uniswap V3 factory
    function factory() external view returns (address);

    /// @return Returns the address of WETH9
    function WETH9() external view returns (address);
}

/// @title Interface for WETH9
interface IWETH9 is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}

contract TestSwap {
    ISwapRouter public swapRouter;

    // This example swaps DAI/WETH9 for single path swaps and DAI/USDC/WETH9 for multi path swaps.

    event SwapExactInputMultihop(address sender, address[] paths, uint256 amountIn, uint amountOut);
    event SwapExactOutputMultihop(address sender, address[] paths, uint256 amountIn, uint256 amountOut);


    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    // function _swapInit(ISwapRouter _swapRouter) internal {
    //     swapRouter = _swapRouter;
    // }

    function toBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    function toBytesFromUint(uint24 a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    function _validatePathAndFees(
        address[] memory paths, 
        uint24[] memory poolFees
    ) internal pure {
        require(paths.length >= 2, "Invalid paths!");
        require(poolFees.length == paths.length - 1, "Invalid pool fee length!");

        for (uint i; i < poolFees.length; ) {
            require(poolFees[i]  <= 10000, "Invalid pool fee value!");
            unchecked {
                ++i;
            }
        }
    }

    function _getSwapPath(
        address[] memory paths, 
        uint24[] memory poolFees,
        bool useReverse
    ) internal pure returns(bytes memory swapPath) {
        _validatePathAndFees(paths, poolFees);

        if (useReverse) {
            for (uint i = paths.length - 1; i >= 0;) {
                if (i == 0) {
                    swapPath = bytes.concat(swapPath, toBytes(paths[i]));
                    break;
                } else swapPath = bytes.concat(swapPath, toBytes(paths[i]), toBytesFromUint(poolFees[i - 1]));

                unchecked {
                    i--;
                }
            }
        } else {
            for (uint i; i < paths.length; ) {
                if (i == paths.length - 1) {
                    swapPath = bytes.concat(swapPath, toBytes(paths[i]));
                } else swapPath = bytes.concat(swapPath, toBytes(paths[i]), toBytesFromUint(poolFees[i]));

                unchecked {
                    ++i;
                }
            }
        }
    }
    // ["0xc778417E063141139Fce010982780140Aa0cD5Ab","0xA739e45E6aEDf91e1B4D92b0331162b603246982", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"]
    
    function swapExactInputMultihop(address[] memory paths, uint24[] memory poolFees, uint256 amountIn, uint amountOutMinimum, bool usingNative) external returns (uint amountOut) {
        address cache_weth9 = IPeripheryImmutableState(address(swapRouter)).WETH9();
        
        if (usingNative) {
            require(paths[paths.length - 1] == cache_weth9, "INVALID PATH");
        }

        bytes memory swapPath = _getSwapPath(paths, poolFees, false);

        // Transfer `amountIn` of DAI to this contract.
        TransferHelper.safeTransferFrom(paths[0], msg.sender, address(this), amountIn);

        // // Approve the router to spend DAI.
        TransferHelper.safeApprove(paths[0], address(swapRouter), amountIn);

        // Multiple pool swaps are encoded through bytes called a `path`. A path is a sequence of token addresses and poolFees that define the pools used in the swaps.
        // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut) where tokenIn/tokenOut parameter is the shared token across the pools.
        // Since we are swapping DAI to USDC and then USDC to WETH9 the path encoding is (DAI, 0.3%, USDC, 0.3%, WETH9).
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: swapPath,
                recipient: usingNative ? address(this): msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

        // Executes the swap.
        amountOut = swapRouter.exactInput(params);

        if (usingNative) {
            _deliverETH(cache_weth9, msg.sender, amountOut);
        }

        emit SwapExactInputMultihop(msg.sender, paths, amountIn, amountOut);
    }

    function swapETHExactInputMultihop(address[] memory paths, uint24[] memory poolFees, uint256 amountIn, uint amountOutMinimum) external payable returns (uint amountOut) {
        bytes memory swapPath = _getSwapPath(paths, poolFees, false);

        require(paths[0] == IPeripheryImmutableState(address(swapRouter)).WETH9(), "INVALID PATH");
        require(msg.value == amountIn, "INVALID AMOUNT");

        // Multiple pool swaps are encoded through bytes called a `path`. A path is a sequence of token addresses and poolFees that define the pools used in the swaps.
        // The format for pool encoding is (tokenIn, fee, tokenOut/tokenIn, fee, tokenOut) where tokenIn/tokenOut parameter is the shared token across the pools.
        // Since we are swapping DAI to USDC and then USDC to WETH9 the path encoding is (DAI, 0.3%, USDC, 0.3%, WETH9).
        ISwapRouter.ExactInputParams memory params =
            ISwapRouter.ExactInputParams({
                path: swapPath,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

        // Executes the swap.
        amountOut = swapRouter.exactInput{ value: amountIn }(params);

        emit SwapExactInputMultihop(msg.sender, paths, amountIn, amountOut);
    }

    /// @notice swapExactOutputMultihop swaps a minimum possible amount of DAI for a fixed amount of WETH through an intermediary pool.
    /// For this example, we want to swap DAI for WETH9 through a USDC pool but we specify the desired amountOut of WETH9. Notice how the path encoding is slightly different in for exact output swaps.
    /// @dev The calling address must approve this contract to spend its DAI for this function to succeed. As the amount of input DAI is variable,
    /// the calling address will need to approve for a slightly higher amount, anticipating some variance.
    /// @param amountOut The desired amount of WETH9.
    /// @param amountInMaximum The maximum amount of DAI willing to be swapped for the specified amountOut of WETH9.
    /// @return amountIn The amountIn of DAI actually spent to receive the desired amountOut.
    function swapExactOutputMultihop(address[] memory paths, uint24[] memory poolFees, uint256 amountOut, uint256 amountInMaximum, bool usingNative) external returns (uint256 amountIn) {
        address cache_weth9 = IPeripheryImmutableState(address(swapRouter)).WETH9();
        
        if (usingNative) {
            require(paths[paths.length - 1] == cache_weth9, "INVALID PATH");
        }
        
        bytes memory swapPath = _getSwapPath(paths, poolFees, true);

        // Transfer the specified `amountInMaximum` to this contract.
        TransferHelper.safeTransferFrom(paths[0], msg.sender, address(this), amountInMaximum);
        // Approve the router to spend  `amountInMaximum`.
        TransferHelper.safeApprove(paths[0], address(swapRouter), amountInMaximum);

        // The parameter path is encoded as (tokenOut, fee, tokenIn/tokenOut, fee, tokenIn)
        // The tokenIn/tokenOut field is the shared token between the two pools used in the multiple pool swap. In this case USDC is the "shared" token.
        // For an exactOutput swap, the first swap that occurs is the swap which returns the eventual desired token.
        // In this case, our desired output token is WETH9 so that swap happpens first, and is encoded in the path accordingly.
        ISwapRouter.ExactOutputParams memory params =
            ISwapRouter.ExactOutputParams({
                path: swapPath,
                recipient: usingNative ? address(this): msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            });

        // Executes the swap, returning the amountIn actually spent.
        amountIn = swapRouter.exactOutput(params);

        // If the swap did not require the full amountInMaximum to achieve the exact amountOut then we refund msg.sender and approve the router to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(paths[0], address(swapRouter), 0);
            TransferHelper.safeTransfer(paths[0],  msg.sender, amountInMaximum - amountIn);
        }

        if (usingNative) {
            _deliverETH(cache_weth9, msg.sender, amountOut);
        }

        emit SwapExactOutputMultihop(msg.sender, paths, amountIn, amountOut);
    }

    function swapETHExactOutputMultihop(address[] memory paths, uint24[] memory poolFees, uint256 amountOut, uint256 amountInMaximum) external payable returns (uint256 amountIn) {
        require(msg.value == amountInMaximum, "Not equals");
        require(paths[0] == IPeripheryImmutableState(address(swapRouter)).WETH9(), "INVALID PATH");
        bytes memory swapPath = _getSwapPath(paths, poolFees, true);
 
        ISwapRouter.ExactOutputParams memory params =
            ISwapRouter.ExactOutputParams({
                path: swapPath,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            });
 
        // Executes the swap, returning the amountIn actually spent.
        amountIn = swapRouter.exactOutput{ value: amountInMaximum }(params);
 
        IPeripheryPayments(address(swapRouter)).refundETH();
 
        // If the swap did not require the full amountInMaximum to achieve the exact amountOut then we refund msg.sender and approve the router to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeTransferETH(msg.sender, amountInMaximum - amountIn);
        }

        emit SwapExactOutputMultihop(msg.sender, paths, amountIn, amountOut);
    }

    function _deliverETH(address weth, address receiver, uint amount) internal {
        IWETH9(weth).withdraw(amount);
        TransferHelper.safeTransferETH(receiver, amount);
    }

    fallback() external payable {}
}