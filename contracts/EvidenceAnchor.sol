// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceAnchor {

    struct EvidenceRecord {
        bytes32  hash;
        address  signer;
        address  custodian;
        uint256  anchoredAt;
        uint256  blockNumber;
        string   metadata;
    }

    struct CustodyEvent {
        address  from;
        address  to;
        uint256  timestamp;
        string   note;
    }

    mapping(bytes32 => EvidenceRecord) private _records;
    mapping(bytes32 => CustodyEvent[]) private _custody;
    mapping(address => bytes32[]) private _signerIndex;
    uint256 public totalAnchored;

    event EvidenceAnchored(bytes32 indexed hash, address indexed signer, uint256 timestamp, string metadata);
    event CustodyTransferred(bytes32 indexed hash, address indexed from, address indexed to, uint256 timestamp, string note);

    error AlreadyAnchored(bytes32 hash);
    error NotAnchored(bytes32 hash);
    error NotCustodian(address caller, address custodian);
    error InvalidSignature();

    function anchor(bytes32 hash, bytes calldata signature, string calldata metadata) external {
        if (_records[hash].anchoredAt != 0) revert AlreadyAnchored(hash);
        address signer = _recoverSigner(hash, signature);
        if (signer == address(0)) revert InvalidSignature();
        _records[hash] = EvidenceRecord({ hash: hash, signer: signer, custodian: signer, anchoredAt: block.timestamp, blockNumber: block.number, metadata: metadata });
        _signerIndex[signer].push(hash);
        totalAnchored++;
        emit EvidenceAnchored(hash, signer, block.timestamp, metadata);
    }

    function transferCustody(bytes32 hash, address to, string calldata note) external {
        EvidenceRecord storage rec = _records[hash];
        if (rec.anchoredAt == 0) revert NotAnchored(hash);
        if (rec.custodian != msg.sender) revert NotCustodian(msg.sender, rec.custodian);
        address from = rec.custodian;
        rec.custodian = to;
        _custody[hash].push(CustodyEvent({ from: from, to: to, timestamp: block.timestamp, note: note }));
        emit CustodyTransferred(hash, from, to, block.timestamp, note);
    }

    function verify(bytes32 hash) external view returns (bool exists, address signer, address custodian, uint256 anchoredAt) {
        EvidenceRecord storage rec = _records[hash];
        exists = rec.anchoredAt != 0;
        signer = rec.signer;
        custodian = rec.custodian;
        anchoredAt = rec.anchoredAt;
    }

    function getRecord(bytes32 hash) external view returns (EvidenceRecord memory) {
        if (_records[hash].anchoredAt == 0) revert NotAnchored(hash);
        return _records[hash];
    }

    function getCustodyLog(bytes32 hash) external view returns (CustodyEvent[] memory) {
        return _custody[hash];
    }

    function getBySignerAddress(address signer) external view returns (bytes32[] memory) {
        return _signerIndex[signer];
    }

    function _recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return ecrecover(ethSignedHash, v, r, s);
    }
}
