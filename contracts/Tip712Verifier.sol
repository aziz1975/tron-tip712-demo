// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// TRON-specific: chainId uses uint32(block.chainid) in the domain separator.
contract Tip712Verifier {
    // EIP-712 type hashes
    bytes32 private constant EIP712DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant PERSON_TYPEHASH =
        keccak256("Person(string name,address wallet)");
    // include referenced type after the root type
    bytes32 private constant MAIL_TYPEHASH =
        keccak256("Mail(Person from,Person to,string contents,uint256 nonce)Person(string name,address wallet)");

    struct Person { string name; address wallet; }
    struct Mail   { Person from; Person to; string contents; uint256 nonce; }

    bytes32 private immutable _DOMAIN_SEPARATOR;

    constructor(string memory name, string memory version) {
        // TIP-712 on TRON: use low 32 bits of chainid
        uint256 chainId32 = uint32(block.chainid);
        _DOMAIN_SEPARATOR = keccak256(abi.encode(
            EIP712DOMAIN_TYPEHASH,
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId32,
            address(this)
        ));
    }

    function domainSeparator() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    function _hashPerson(Person memory p) internal pure returns (bytes32) {
        return keccak256(abi.encode(PERSON_TYPEHASH, keccak256(bytes(p.name)), p.wallet));
    }

    function _hashMail(Mail memory m) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            MAIL_TYPEHASH,
            _hashPerson(m.from),
            _hashPerson(m.to),
            keccak256(bytes(m.contents)),
            m.nonce
        ));
    }

    function verify(Mail calldata m, address expectedSigner, bytes calldata signature)
        external
        view
        returns (bool)
    {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, _hashMail(m)));
        (bytes32 r, bytes32 s, uint8 v) = _splitSig(signature);
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return false;
        address recovered = ecrecover(digest, v, r, s);
        return recovered == expectedSigner;
    }

    function _splitSig(bytes memory sig) private pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "bad sig len");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
