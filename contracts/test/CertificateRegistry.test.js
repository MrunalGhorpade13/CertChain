/**
 * CertificateRegistry.test.js — Hardhat Unit Tests
 *
 * Tests every function in the CertificateRegistry smart contract.
 * Uses Chai for assertions and Hardhat's built-in test helpers.
 *
 * Run: npx hardhat test
 *
 * Test structure follows the "Arrange → Act → Assert" (AAA) pattern:
 *  - Arrange: set up the scenario (deploy contract, create accounts)
 *  - Act:     call the function being tested
 *  - Assert:  verify the expected outcome
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT FOR VIVA:
 *
 * Q: Why do we test smart contracts so rigorously?
 * A: Because smart contracts are IMMUTABLE once deployed. A bug in a web app
 *    can be patched with a quick deploy — a bug in a smart contract is
 *    permanent. Testing is our only safety net before deployment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { expect }       = require('chai');
const { ethers }       = require('hardhat');
const { loadFixture }  = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('CertificateRegistry', function () {

  // ═══════════════════════════════════════════════════════════════════════════
  // FIXTURE — shared setup for every test
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // loadFixture() snapshots the blockchain state after the first call and
  // resets to that snapshot before each test. This is MUCH faster than
  // redeploying in every `beforeEach` because it avoids re-mining blocks.

  /**
   * deployFixture — deploys the contract and returns useful references.
   *
   * Accounts:
   *  - owner:     deploys the contract, is auto-authorized as an issuer
   *  - issuer1:   will be added as an authorized issuer in some tests
   *  - issuer2:   another issuer for multi-issuer tests
   *  - stranger:  an unauthorized address (simulates a random person)
   */
  async function deployFixture() {
    // Get test accounts from Hardhat's local node
    const [owner, issuer1, issuer2, stranger] = await ethers.getSigners();

    // Deploy a fresh instance of the contract
    const CertificateRegistry = await ethers.getContractFactory('CertificateRegistry');
    const registry = await CertificateRegistry.deploy();

    // Create sample certificate IDs (deterministic 32-byte hashes)
    // In the real app, these would be keccak256 of student data
    const certId1 = ethers.keccak256(ethers.toUtf8Bytes('cert-alice-cs101-2024'));
    const certId2 = ethers.keccak256(ethers.toUtf8Bytes('cert-bob-math201-2024'));
    const certId3 = ethers.keccak256(ethers.toUtf8Bytes('cert-charlie-phys101-2024'));

    return { registry, owner, issuer1, issuer2, stranger, certId1, certId2, certId3 };
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Deployment', function () {

    it('should set the deployer as the owner', async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.owner()).to.equal(owner.address);
    });

    it('should set the contract name and version', async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.name()).to.equal('CertificateRegistry');
      expect(await registry.version()).to.equal('1.0.0');
    });

    it('should authorize the owner as an issuer by default', async function () {
      const { registry, owner } = await loadFixture(deployFixture);
      expect(await registry.authorizedIssuers(owner.address)).to.be.true;
      expect(await registry.isAuthorizedIssuer(owner.address)).to.be.true;
    });

    it('should start with zero total certificates', async function () {
      const { registry } = await loadFixture(deployFixture);
      expect(await registry.totalCertificates()).to.equal(0);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUER MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Issuer Management', function () {

    it('should allow the owner to add a new issuer', async function () {
      const { registry, issuer1 } = await loadFixture(deployFixture);

      await expect(registry.addIssuer(issuer1.address))
        .to.emit(registry, 'IssuerAdded')
        .withArgs(issuer1.address);

      expect(await registry.authorizedIssuers(issuer1.address)).to.be.true;
    });

    it('should prevent non-owners from adding issuers', async function () {
      const { registry, issuer1, stranger } = await loadFixture(deployFixture);

      await expect(
        registry.connect(stranger).addIssuer(issuer1.address)
      ).to.be.revertedWith('CertificateRegistry: caller is not the owner');
    });

    it('should prevent adding the zero address as an issuer', async function () {
      const { registry } = await loadFixture(deployFixture);

      await expect(
        registry.addIssuer(ethers.ZeroAddress)
      ).to.be.revertedWith('CertificateRegistry: cannot authorize zero address');
    });

    it('should prevent adding an already-authorized issuer', async function () {
      const { registry, issuer1 } = await loadFixture(deployFixture);

      await registry.addIssuer(issuer1.address);

      await expect(
        registry.addIssuer(issuer1.address)
      ).to.be.revertedWith('CertificateRegistry: address is already an authorized issuer');
    });

    it('should allow the owner to remove an issuer', async function () {
      const { registry, issuer1 } = await loadFixture(deployFixture);

      await registry.addIssuer(issuer1.address);

      await expect(registry.removeIssuer(issuer1.address))
        .to.emit(registry, 'IssuerRemoved')
        .withArgs(issuer1.address);

      expect(await registry.authorizedIssuers(issuer1.address)).to.be.false;
    });

    it('should prevent the owner from removing themselves', async function () {
      const { registry, owner } = await loadFixture(deployFixture);

      await expect(
        registry.removeIssuer(owner.address)
      ).to.be.revertedWith('CertificateRegistry: cannot remove the owner as issuer');
    });

    it('should prevent removing a non-authorized address', async function () {
      const { registry, stranger } = await loadFixture(deployFixture);

      await expect(
        registry.removeIssuer(stranger.address)
      ).to.be.revertedWith('CertificateRegistry: address is not an authorized issuer');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE ISSUANCE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('issueCertificate', function () {

    it('should allow the owner to issue a certificate', async function () {
      const { registry, owner, certId1 } = await loadFixture(deployFixture);

      const tx = await registry.issueCertificate(certId1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      // Check the emitted event
      await expect(tx)
        .to.emit(registry, 'CertificateIssued')
        .withArgs(certId1, owner.address, block.timestamp);

      // Verify the stored data
      const cert = await registry.getCertificate(certId1);
      expect(cert.exists).to.be.true;
      expect(cert.issuer).to.equal(owner.address);
      expect(cert.timestamp).to.equal(block.timestamp);
      expect(cert.isRevoked).to.be.false;
    });

    it('should allow an authorized issuer to issue a certificate', async function () {
      const { registry, issuer1, certId1 } = await loadFixture(deployFixture);

      // First, authorize issuer1
      await registry.addIssuer(issuer1.address);

      // issuer1 issues a certificate — capture tx for event check
      const tx = await registry.connect(issuer1).issueCertificate(certId1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, 'CertificateIssued')
        .withArgs(certId1, issuer1.address, block.timestamp);
    });

    it('should increment the total certificate counter', async function () {
      const { registry, certId1, certId2 } = await loadFixture(deployFixture);

      expect(await registry.totalCertificates()).to.equal(0);

      await registry.issueCertificate(certId1);
      expect(await registry.totalCertificates()).to.equal(1);

      await registry.issueCertificate(certId2);
      expect(await registry.totalCertificates()).to.equal(2);
    });

    it('should prevent unauthorized addresses from issuing', async function () {
      const { registry, stranger, certId1 } = await loadFixture(deployFixture);

      await expect(
        registry.connect(stranger).issueCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: caller is not an authorized issuer');
    });

    it('should prevent issuing a duplicate certificate ID', async function () {
      const { registry, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);

      await expect(
        registry.issueCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: certificate already exists');
    });

    it('should allow different issuers to issue different certificates', async function () {
      const { registry, owner, issuer1, certId1, certId2 } = await loadFixture(deployFixture);

      await registry.addIssuer(issuer1.address);

      // Owner issues cert1
      await registry.issueCertificate(certId1);
      // Issuer1 issues cert2
      await registry.connect(issuer1).issueCertificate(certId2);

      const cert1 = await registry.getCertificate(certId1);
      const cert2 = await registry.getCertificate(certId2);

      expect(cert1.issuer).to.equal(owner.address);
      expect(cert2.issuer).to.equal(issuer1.address);
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE VERIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('verifyCertificate', function () {

    it('should return correct data for an existing certificate', async function () {
      const { registry, owner, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);

      const [exists, issuer, timestamp, isRevoked] = await registry.verifyCertificate(certId1);

      expect(exists).to.be.true;
      expect(issuer).to.equal(owner.address);
      expect(timestamp).to.be.greaterThan(0);
      expect(isRevoked).to.be.false;
    });

    it('should return default values for a non-existent certificate', async function () {
      const { registry, certId1 } = await loadFixture(deployFixture);

      const [exists, issuer, timestamp, isRevoked] = await registry.verifyCertificate(certId1);

      expect(exists).to.be.false;
      expect(issuer).to.equal(ethers.ZeroAddress);
      expect(timestamp).to.equal(0);
      expect(isRevoked).to.be.false;
    });

    it('should be callable by anyone (no access control needed)', async function () {
      const { registry, stranger, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);

      // Even a stranger (unauthorized address) can verify
      const [exists] = await registry.connect(stranger).verifyCertificate(certId1);
      expect(exists).to.be.true;
    });

    it('should show isRevoked=true for a revoked certificate', async function () {
      const { registry, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);
      await registry.revokeCertificate(certId1);

      const [exists, , , isRevoked] = await registry.verifyCertificate(certId1);
      expect(exists).to.be.true;
      expect(isRevoked).to.be.true;
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE REVOCATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('revokeCertificate', function () {

    it('should allow the original issuer to revoke their certificate', async function () {
      const { registry, owner, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);

      // Capture the revocation transaction and get its block timestamp
      const tx = await registry.revokeCertificate(certId1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(registry, 'CertificateRevoked')
        .withArgs(certId1, owner.address, block.timestamp);

      const cert = await registry.getCertificate(certId1);
      expect(cert.isRevoked).to.be.true;
    });

    it('should prevent revoking a non-existent certificate', async function () {
      const { registry, certId1 } = await loadFixture(deployFixture);

      await expect(
        registry.revokeCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: certificate does not exist');
    });

    it('should prevent a different issuer from revoking', async function () {
      const { registry, issuer1, certId1 } = await loadFixture(deployFixture);

      // Owner issues the certificate
      await registry.issueCertificate(certId1);

      // Authorize issuer1 — but they did NOT issue certId1
      await registry.addIssuer(issuer1.address);

      await expect(
        registry.connect(issuer1).revokeCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: only the original issuer can revoke');
    });

    it('should prevent an unauthorized stranger from revoking', async function () {
      const { registry, stranger, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);

      await expect(
        registry.connect(stranger).revokeCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: only the original issuer can revoke');
    });

    it('should prevent revoking an already-revoked certificate', async function () {
      const { registry, certId1 } = await loadFixture(deployFixture);

      await registry.issueCertificate(certId1);
      await registry.revokeCertificate(certId1);

      await expect(
        registry.revokeCertificate(certId1)
      ).to.be.revertedWith('CertificateRegistry: certificate is already revoked');
    });
  });


  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * getBlockTimestamp — returns the timestamp of the latest block.
   * Useful for comparing against emitted event timestamps.
   */
  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  }
});
