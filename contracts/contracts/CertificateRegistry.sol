// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CertificateRegistry
 * @author CertChain Team
 * @notice A decentralized certificate verification system that stores certificate
 *         hashes on-chain, allowing tamper-proof issuance and instant public verification.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURE OVERVIEW (for Viva)                                          │
 * │                                                                             │
 * │  1. The contract OWNER deploys this contract and can authorize ISSUERS.    │
 * │  2. An ISSUER (university admin) calls issueCertificate() with the         │
 * │     keccak256 hash of the certificate data.                                │
 * │  3. The hash, issuer address, and block timestamp are stored on-chain.     │
 * │  4. ANYONE can call verifyCertificate() with a certificate ID to check     │
 * │     whether it exists, who issued it, and when.                            │
 * │  5. Only the ORIGINAL ISSUER can revoke their own certificate.             │
 * │                                                                             │
 * │  Why store a hash, not the full data?                                      │
 * │  → Gas efficiency: storing strings on Ethereum is very expensive.          │
 * │  → Privacy: student PII stays off-chain in MongoDB.                        │
 * │  → The hash acts as a unique fingerprint — any change in the original      │
 * │    data produces a completely different hash (avalanche effect).            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * @dev Solidity 0.8.24 — built-in overflow/underflow checks, no need for SafeMath.
 */
contract CertificateRegistry {

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice The address that deployed this contract.
     * @dev The owner has exclusive rights to add/remove authorized issuers.
     *      Set once in the constructor and cannot be changed (for simplicity).
     */
    address public owner;

    /**
     * @notice Human-readable name and version for frontend display.
     */
    string public constant name    = "CertificateRegistry";
    string public constant version = "1.0.0";

    /**
     * @notice Counter for total certificates ever issued (including revoked).
     * @dev Useful for analytics and frontend stats display.
     */
    uint256 public totalCertificates;

    /**
     * @notice Struct representing a single certificate record on-chain.
     *
     * @param exists     Whether this certificate ID has been registered (guards against default values).
     * @param issuer     The Ethereum address of the institution that issued this certificate.
     * @param timestamp  The block.timestamp when the certificate was recorded on-chain.
     * @param isRevoked  Whether the certificate has been revoked by its issuer.
     *
     * Why use a struct?
     *  → Groups related data together for clean, readable code.
     *  → Solidity packs smaller types in a struct to save gas (storage slots).
     */
    struct Certificate {
        bool    exists;      // true if this certId has been registered
        address issuer;      // wallet address of the issuer (university admin)
        uint256 timestamp;   // block.timestamp when issued (epoch seconds)
        bool    isRevoked;   // true if the issuer has revoked this certificate
    }

    /**
     * @notice Main storage mapping: certificateId → Certificate struct.
     *
     * The key is a bytes32 hash (keccak256 of certificate data).
     * The value is the Certificate struct containing issuer, timestamp, and status.
     *
     * Why bytes32?
     *  → keccak256() returns 32 bytes. Using bytes32 as the key is gas-efficient
     *    because Solidity can directly use it as a storage slot key without hashing again.
     *  → Strings would require additional hashing and cost more gas.
     */
    mapping(bytes32 => Certificate) public certificates;

    /**
     * @notice Mapping of authorized issuers.
     *
     * Only addresses in this mapping (set to `true`) can call issueCertificate().
     * The contract owner manages this list via addIssuer() and removeIssuer().
     *
     * Why a separate mapping instead of a role system?
     *  → Simpler to understand and explain in a Viva.
     *  → For a production system, you'd use OpenZeppelin's AccessControl.
     */
    mapping(address => bool) public authorizedIssuers;


    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // Events are logs stored on the blockchain that DON'T cost storage gas.
    // Frontend apps (ethers.js) can listen for these events in real-time
    // and indexed parameters allow efficient filtering/querying.

    /**
     * @notice Emitted when a new certificate is issued (recorded on-chain).
     * @param certId    The unique certificate hash (indexed for efficient filtering).
     * @param issuer    The address of the issuer who recorded it.
     * @param timestamp The block timestamp when it was recorded.
     */
    event CertificateIssued(
        bytes32 indexed certId,
        address indexed issuer,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a certificate is revoked by its original issuer.
     * @param certId    The certificate hash that was revoked.
     * @param issuer    The address that revoked it (must be original issuer).
     * @param timestamp When the revocation occurred.
     */
    event CertificateRevoked(
        bytes32 indexed certId,
        address indexed issuer,
        uint256 timestamp
    );

    /**
     * @notice Emitted when the owner adds a new authorized issuer.
     * @param issuer The newly authorized address.
     */
    event IssuerAdded(address indexed issuer);

    /**
     * @notice Emitted when the owner removes an authorized issuer.
     * @param issuer The de-authorized address.
     */
    event IssuerRemoved(address indexed issuer);


    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // Modifiers are reusable access-control checks that are prepended to functions.
    // They execute BEFORE the function body. The `_` placeholder marks where
    // the actual function code runs.

    /**
     * @notice Restricts a function to the contract owner only.
     * @dev Used on addIssuer() and removeIssuer().
     */
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "CertificateRegistry: caller is not the owner"
        );
        _; // Continue executing the function body
    }

    /**
     * @notice Restricts a function to authorized issuers only.
     * @dev Used on issueCertificate().
     *
     * Note: The owner is ALSO automatically an authorized issuer
     * (checked inside the modifier with an OR condition).
     */
    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner,
            "CertificateRegistry: caller is not an authorized issuer"
        );
        _; // Continue executing the function body
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the contract. The deployer becomes the owner.
     * @dev Called exactly once when the contract is deployed to the blockchain.
     *
     * msg.sender in the constructor is the wallet address that pays for deployment.
     * The owner is also added as an authorized issuer by default.
     */
    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;

        emit IssuerAdded(msg.sender);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Issue a new certificate by recording its hash on-chain.
     *
     * @param _certId The unique certificate identifier (keccak256 hash of certificate data).
     *                This hash is generated on the frontend from the student's details
     *                (name, course, date, etc.) to create a unique fingerprint.
     *
     * @dev Only authorized issuers can call this function (enforced by modifier).
     *
     * How it works:
     *  1. Checks that the certId hasn't been used before (prevents duplicates).
     *  2. Creates a Certificate struct with the issuer's address and current timestamp.
     *  3. Stores the struct in the `certificates` mapping.
     *  4. Increments the total certificate counter.
     *  5. Emits a CertificateIssued event for frontend listeners.
     *
     * Gas cost: ~50,000 gas (writing a new storage slot is the most expensive EVM operation).
     *
     * @custom:security-note The certId should be generated deterministically on the frontend
     *                       so that the same certificate data always produces the same hash.
     */
    function issueCertificate(bytes32 _certId) external onlyAuthorizedIssuer {
        // Guard: ensure this certificate ID has not been issued before
        require(
            !certificates[_certId].exists,
            "CertificateRegistry: certificate already exists"
        );

        // Store the certificate record on-chain
        certificates[_certId] = Certificate({
            exists:    true,
            issuer:    msg.sender,          // The wallet address calling this function
            timestamp: block.timestamp,     // Current block's Unix timestamp (seconds)
            isRevoked: false                // Newly issued certificates are valid
        });

        // Increment the global counter
        totalCertificates++;

        // Emit event — this is picked up by the frontend via ethers.js event listeners
        emit CertificateIssued(_certId, msg.sender, block.timestamp);
    }

    /**
     * @notice Verify whether a certificate exists on-chain and get its details.
     *
     * @param _certId The certificate ID (hash) to look up.
     *
     * @return exists    Whether the certificate was ever issued.
     * @return issuer    The address that issued it (0x0 if not found).
     * @return timestamp When it was issued (0 if not found).
     * @return isRevoked Whether it has been revoked.
     *
     * @dev This is a `view` function — it reads data without modifying state,
     *      so it costs ZERO gas when called from a frontend (no transaction needed).
     *      This is why verification is free and instant.
     *
     * Usage from frontend (ethers.js):
     *   const [exists, issuer, timestamp, isRevoked] = await contract.verifyCertificate(certId);
     */
    function verifyCertificate(bytes32 _certId)
        external
        view
        returns (
            bool    exists,
            address issuer,
            uint256 timestamp,
            bool    isRevoked
        )
    {
        // Look up the certificate in storage
        Certificate storage cert = certificates[_certId];

        // Return all fields — the caller decides how to interpret them
        return (
            cert.exists,
            cert.issuer,
            cert.timestamp,
            cert.isRevoked
        );
    }

    /**
     * @notice Revoke a previously issued certificate.
     *
     * @param _certId The certificate ID to revoke.
     *
     * @dev Only the ORIGINAL ISSUER of a specific certificate can revoke it.
     *      This prevents one university from revoking another university's certificates.
     *
     * Use cases for revocation:
     *  - Certificate was issued in error
     *  - Student's degree was rescinded
     *  - Fraudulent issuance detected
     *
     * Important: Revocation does NOT delete the record. The certificate struct
     * remains on-chain with `isRevoked = true`. This provides an immutable
     * audit trail — you can always see that it was issued AND later revoked.
     */
    function revokeCertificate(bytes32 _certId) external {
        // Load the certificate from storage
        Certificate storage cert = certificates[_certId];

        // Guard: certificate must exist
        require(
            cert.exists,
            "CertificateRegistry: certificate does not exist"
        );

        // Guard: only the original issuer can revoke
        require(
            cert.issuer == msg.sender,
            "CertificateRegistry: only the original issuer can revoke"
        );

        // Guard: cannot revoke an already-revoked certificate
        require(
            !cert.isRevoked,
            "CertificateRegistry: certificate is already revoked"
        );

        // Mark as revoked (does NOT delete — preserves audit trail)
        cert.isRevoked = true;

        // Emit event for frontend listeners
        emit CertificateRevoked(_certId, msg.sender, block.timestamp);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS (Owner-only)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add a new authorized issuer address.
     * @param _issuer The wallet address to authorize as a certificate issuer.
     *
     * @dev Only the contract owner can call this.
     *      In practice, the university would add department admin wallets here.
     */
    function addIssuer(address _issuer) external onlyOwner {
        require(
            _issuer != address(0),
            "CertificateRegistry: cannot authorize zero address"
        );
        require(
            !authorizedIssuers[_issuer],
            "CertificateRegistry: address is already an authorized issuer"
        );

        authorizedIssuers[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    /**
     * @notice Remove an authorized issuer address.
     * @param _issuer The wallet address to de-authorize.
     *
     * @dev The owner cannot remove themselves to prevent accidental lockout.
     *      Previously issued certificates by this issuer remain valid on-chain.
     */
    function removeIssuer(address _issuer) external onlyOwner {
        require(
            _issuer != owner,
            "CertificateRegistry: cannot remove the owner as issuer"
        );
        require(
            authorizedIssuers[_issuer],
            "CertificateRegistry: address is not an authorized issuer"
        );

        authorizedIssuers[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }


    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER / VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if a specific address is an authorized issuer.
     * @param _addr The address to check.
     * @return True if the address is authorized to issue certificates.
     *
     * @dev View function — free to call (no gas).
     */
    function isAuthorizedIssuer(address _addr) external view returns (bool) {
        return authorizedIssuers[_addr] || _addr == owner;
    }

    /**
     * @notice Get the full details of a certificate (alternative to verifyCertificate).
     * @param _certId The certificate ID to look up.
     * @return The full Certificate struct.
     *
     * @dev Solidity auto-generates a getter for the `certificates` public mapping,
     *      but it returns individual values. This function returns the full struct
     *      for cleaner frontend consumption.
     */
    function getCertificate(bytes32 _certId) external view returns (Certificate memory) {
        return certificates[_certId];
    }
}
