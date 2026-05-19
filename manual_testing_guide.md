# 🧪 Manual Testing Guide

Here is a complete step-by-step guide to manually test your Decentralized Certificate Verification System from end to end.

---

## 1. Start Your Local Environment

You need to run three separate processes in your terminal. Open three different terminal windows/tabs:

### Terminal 1: Blockchain Node
Start your local Ethereum blockchain (Hardhat):
```bash
cd contracts
npx hardhat node
```
*Keep this running. It will print out test accounts and private keys you can use in MetaMask.*

### Terminal 2: Backend API Server
Start the Express server that stores off-chain metadata (student names, courses, etc.):
```bash
cd backend
npm run dev
```
*This will connect to MongoDB (or fall back to the local JSON file) and run on `http://localhost:5000`.*

### Terminal 3: Frontend React App
Start the Vite development server for the UI:
```bash
cd frontend
npm run dev
```
*Your frontend will be accessible at `http://localhost:5173` (or 5174/5175).*

---

## 2. Deploy the Smart Contract

Before you can interact with the blockchain, you must deploy your smart contract to the local node you started in Terminal 1.

Open a 4th terminal (or stop the frontend temporarily, run this, and restart the frontend):
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
*This script will compile the Solidity code, deploy it to your local node, and automatically save the contract address and ABI to `frontend/src/contracts/`.*

---

## 3. Set Up MetaMask for Local Testing

1. Open your browser and click on the **MetaMask** extension.
2. Go to **Settings > Networks > Add Network > Add a network manually**.
3. Enter the following details for your local Hardhat node:
   - **Network Name:** Hardhat Localhost
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save** and switch to this new network.
5. Import a test account: Look at Terminal 1 (`npx hardhat node`) and copy one of the **Private Keys** provided. In MetaMask, go to Accounts > Import Account and paste the private key. You now have an account with 10,000 test ETH!

---

## 4. Test the Application Flow

### Step A: Connect Your Wallet
1. Open the app in your browser (`http://localhost:5173`).
2. Click **🦊 Connect Wallet** in the top right corner.
3. MetaMask will prompt you to approve the connection. You should now see your shortened wallet address and a green "Hardhat Localhost" badge in the navbar.

### Step B: Issue a Certificate
1. Navigate to the **Issue** page.
2. Fill out the student details (e.g., Name: John Doe, Course: B.Sc. Computer Science, Grade: First Class).
3. Click the **Issue Certificate on Blockchain** button.
4. MetaMask will pop up asking you to confirm the transaction. Click **Confirm**.
5. Once the transaction is mined, the app will generate a unique cryptographic hash (the Certificate ID) and store the readable metadata in your backend database. 
6. *Copy the generated Certificate ID for the next step.*

### Step C: Verify the Certificate
1. Navigate to the **Verify** page.
2. Paste the Certificate ID you copied earlier into the search bar.
3. Click **Verify Certificate**.
4. The system will query the blockchain to ensure the hash exists and is valid, and fetch the student details from the backend. You should see a glowing **Verified Certificate Card**!
