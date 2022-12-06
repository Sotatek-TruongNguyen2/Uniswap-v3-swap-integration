// contracts/STEPNNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract CLOIDNFT is ERC721, Ownable {
    // base uri for nfts
    string private _buri;

    constructor() ERC721("CLOIDNFT", "CNFT") {}

    function _baseURI() internal view override returns (string memory) {
        return _buri;
    }

    // have onlyOwner
    function setBaseURI(string memory buri) public {
        require(bytes(buri).length > 0, "wrong base uri");
        _buri = buri;
    }

    // have onlyOwner
    function mint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }

    function burn(uint256 tokenId) public virtual {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "burn caller is not owner nor approved"
        );
        _burn(tokenId);
    }
}