/**
 * dataLoader.js - Load and process wallet data from CSV files
 * 
 * This module processes the wallet data from fartcoin.csv and goattoken.csv,
 * structures them into arrays, and identifies shared wallets.
 */

// Simple, direct CSV parser with no fancy logic
const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') {
    console.error('PARSING ERROR: Empty or invalid CSV text');
    return [];
  }
  
  // Print the raw CSV content to debug
  console.log('RAW CSV TEXT START >>>');
  console.log(csvText);
  console.log('<<< RAW CSV TEXT END');
  
  // Split into lines
  const lines = csvText.trim().split('\n');
  console.log(`CSV has ${lines.length} lines`);
  
  if (lines.length < 2) {
    console.error('CSV must have at least a header row and one data row');
    return [];
  }
  
  // Super simple, direct parsing - assuming first column is address, second is amount
  const result = [];
  
  // Skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const parts = line.split(',');
    if (parts.length < 2) {
      console.warn(`Line ${i} doesn't have enough columns: ${line}`);
      continue;
    }
    
    const address = parts[0].trim();
    const amountStr = parts[1].trim();
    const amount = parseFloat(amountStr);
    
    if (!address || isNaN(amount)) {
      console.warn(`Line ${i} has invalid data: address=${address}, amount=${amountStr}`);
      continue;
    }
    
    result.push({
      address: address,
      amount: amount
    });
  }
  
  console.log(`Successfully parsed ${result.length} wallet entries`);
  
  // Log the first few entries to verify parsing worked
  if (result.length > 0) {
    console.log('First parsed entry:', result[0]);
    if (result.length > 1) {
      console.log('Second parsed entry:', result[1]);
    }
  }
  
  return result;
};

// Embedded CSV data
const FARTCOIN_DATA = `Account,Quantity
u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w,53353226.72
9SLPTL41SPsYkgdsMzdfJsxymEANKr5bYoBsQzJyKpKS,19700515.36
F7RkX6Y1qTfBqoX5oHoZEgrG1Dpy55UZ3GfWwPbM58nQ,18358622.60
A77HErqtfN1hLLpvZ9pCtu66FEtM8BveoaKbbMoZ4RiR,17700127.59
44P5Ct5JkPz76Rs2K6juC65zXMpFRDrHatxcASJ4Dyra,16151152.36
9cNE6KBg2Xmf34FPMMvzDF8yUHMrgLRzBV3vD7b1JnUS,12645354.91
38ESLHdJkqNvMbJmbgsHJGXjJPpsL4TkvSUgXegYgvpr,10001047.32
5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1,9042762.02
AcFmVa1HJTKkz6qn4sfLAFvjKqd914KgdaNHGEszMR5Q,8891026.60
GxhQ5LTFc4dTxAXt7aQ4uSKvr8ev9T2QXE9zWKA3pjFP,8591047.43
79sJvLQ3QrL88Uc9jgV3iTT5Ft19xtMbjmAkhgoKh38W,7932329.62
FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5,7763719.78
7QAFvj11sS5kgNh7otR3EGEZbGRHR3nMwNz31rTcDm8P,7523424.67
Ait7nuyWJSxHF7c1WX2CQ7AHFa2nPFYYg84xL5nPhYtn,7025023.12
DBmae92YTQKLsNzXcPscxiwPqMcz9stQr2prB5ZCAHPd,6728342.10
ASTyfSima4LLAdDgoFGkgqoKowG1LZFDr9fAQrg7iaJZ,6655043.23
HVh6wHNBAsG3pq1Bj5oCzRjoWKVogEDHwUHkRz3ekFgt,6251889.47
8icKqfmu95pCmfQLc2cLkmhB7LqN8tRaaE4cvKnGpwpq,6002400.00
DHeiaWt2MzA5BgBU6FQe6V3K8akJMcDbXYxrqPV19F9U,6000100.00`;

const GOATTOKEN_DATA = `Account,Quantity(GOAT)
8Mm46CsqxiyAputDUp2cXHg41HE3BfynTeMBDwzrMZQH,112378114.33
hTvwKr1RvQdPS5xiWfXM2UZYuF55Ei8zzsuB7e58feu,109758331.88
AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2,67456670.68
CBEADkb8TZAXHjVE3zwad4L995GZE7rJcacJ7asebkVG,52117385.50
u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w,41100416.44
JBQ1suc4GJBbVYP6y2poGjoDCFrfjtGSEJRt4deasyNe,32829674.18
A77HErqtfN1hLLpvZ9pCtu66FEtM8BveoaKbbMoZ4RiR,32479739.27
4vmjUC6AtFK4JyF9CrcBM8Wtq9fFvUSa31pLWJumGMZ,29012410.64
81BgcfZuZf9bESLvw3zDkh7cZmMtDwTPgkCvYu7zx26o,27626054.69
7XmrmvNNGc3LHqq3HqGHnCdgoAQv4yx7kHwYqtiMPzgD,24226306.00
8DBwT4zFqHmK5KU4kMj1zceQANHwf76NRuhevB7ZSoEc,22284354.03
5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1,18023656.63
5PAhQiYdLBd6SVdjzBQDxUAEFyDdF5ExNPQfcscnPRj5,16718869.33
417ccNwQnQykVbFUDKd3sh6xHKGSRTaCTWr6sdR9ZuCa,10704068.07
6FEVkH17P9y8Q9aCkDdPcMDjvj7SVxrTETaYEm8f51Jy,8875472.76
2tU4k62hFNMwwxrynmudXGv3csNQuxLtDBUsxAMt9SdL,8698591.41
Ezhr48hfsyUg9zoAq7CH5opi7NbSM34RjrVFf4n8cVpo,8539942.52
DBmae92YTQKLsNzXcPscxiwPqMcz9stQr2prB5ZCAHPd,8189534.80
HVh6wHNBAsG3pq1Bj5oCzRjoWKVogEDHwUHkRz3ekFgt,7987933.45`;

// Super simple CSV file fetch function
const fetchCSVFile = async (path) => {
  try {
    console.log(`FETCHING CSV: ${path}`);
    const response = await fetch(path);
    
    if (!response.ok) {
      console.error(`FETCH ERROR: ${path} - Status ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    console.log(`FETCH SUCCESS: ${path} - Got ${text.length} characters`);
    return text;
  } catch (error) {
    console.error(`FETCH EXCEPTION: ${path}`, error);
    return null;
  }
};

// Ultra-simple data loading function
const loadWalletData = async () => {
  try {
    console.log("=== LOADING WALLET DATA ===");
    
    // Start with empty arrays
    let fartcoinData = [];
    let goatTokenData = [];
    
    // Try to load from CSV files first
    const fartcoinCsvText = await fetchCSVFile('/fartcoin.csv');
    if (fartcoinCsvText) {
      fartcoinData = parseCSV(fartcoinCsvText);
      console.log(`Loaded ${fartcoinData.length} Fartcoin wallets from CSV`);
    } else {
      console.log("Using embedded Fartcoin data as fallback");
      fartcoinData = parseCSV(FARTCOIN_DATA);
      console.log(`Loaded ${fartcoinData.length} Fartcoin wallets from embedded data`);
    }
    
    const goatTokenCsvText = await fetchCSVFile('/goattoken.csv');
    if (goatTokenCsvText) {
      goatTokenData = parseCSV(goatTokenCsvText);
      console.log(`Loaded ${goatTokenData.length} Goat Token wallets from CSV`);
    } else {
      console.log("Using embedded GoatToken data as fallback");
      goatTokenData = parseCSV(GOATTOKEN_DATA);
      console.log(`Loaded ${goatTokenData.length} Goat Token wallets from embedded data`);
    }
    
    // Safety check - if we still don't have data, try the embedded data one more time
    if (fartcoinData.length === 0) {
      console.warn("FALLBACK: Using hardcoded Fartcoin data");
      fartcoinData = [
        { address: "wallet1", amount: 1000000 },
        { address: "wallet2", amount: 900000 },
        { address: "wallet3", amount: 800000 },
        { address: "shared1", amount: 700000 },
        { address: "shared2", amount: 600000 }
      ];
    }
    
    if (goatTokenData.length === 0) {
      console.warn("FALLBACK: Using hardcoded Goat Token data");
      goatTokenData = [
        { address: "wallet4", amount: 500000 },
        { address: "wallet5", amount: 400000 },
        { address: "wallet6", amount: 300000 },
        { address: "shared1", amount: 200000 },
        { address: "shared2", amount: 100000 }
      ];
    }
    
    // Normalize addresses
    fartcoinData.forEach(entry => { entry.address = entry.address.toLowerCase(); });
    goatTokenData.forEach(entry => { entry.address = entry.address.toLowerCase(); });
    
    // Find shared wallets (simple loop)
    const sharedHolders = [];
    const fartcoinMap = new Map();
    
    fartcoinData.forEach(wallet => {
      fartcoinMap.set(wallet.address, wallet.amount);
    });
    
    goatTokenData.forEach(wallet => {
      if (fartcoinMap.has(wallet.address)) {
        sharedHolders.push({
          address: wallet.address,
          fartAmount: fartcoinMap.get(wallet.address),
          goatAmount: wallet.amount
        });
      }
    });
    
    console.log(`Found ${fartcoinData.length} Fartcoin wallets`);
    console.log(`Found ${goatTokenData.length} Goat Token wallets`);
    console.log(`Found ${sharedHolders.length} shared wallets`);
    
    return {
      fartcoinHolders: fartcoinData,
      goatTokenHolders: goatTokenData,
      sharedHolders: sharedHolders
    };
  } catch (error) {
    console.error('Error loading wallet data:', error);
    return {
      fartcoinHolders: [],
      goatTokenHolders: [],
      sharedHolders: []
    };
  }
};

// Export the data loading function and placeholder arrays
export let fartcoinHolders = [];
export let goatTokenHolders = [];
export let sharedHolders = [];

// Simple data initialization function
export const initializeData = async () => {
  console.log("INITIALIZING DATA");
  
  try {
    // Load wallet data
    const data = await loadWalletData();
    
    // Direct assignment to global variables
    fartcoinHolders = data.fartcoinHolders;
    goatTokenHolders = data.goatTokenHolders;
    sharedHolders = data.sharedHolders;
    
    console.log(`DATA INITIALIZED: ${fartcoinHolders.length} Fartcoin, ${goatTokenHolders.length} Goat, ${sharedHolders.length} Shared`);
    
    return data;
  } catch (error) {
    console.error("INITIALIZATION ERROR:", error);
    
    // Emergency fallback
    console.warn("USING EMERGENCY FALLBACK DATA");
    
    fartcoinHolders = [
      { address: "wallet1", amount: 1000000 },
      { address: "wallet2", amount: 900000 },
      { address: "wallet3", amount: 800000 },
      { address: "shared1", amount: 700000 },
      { address: "shared2", amount: 600000 }
    ];
    
    goatTokenHolders = [
      { address: "wallet4", amount: 500000 },
      { address: "wallet5", amount: 400000 },
      { address: "wallet6", amount: 300000 },
      { address: "shared1", amount: 200000 },
      { address: "shared2", amount: 100000 }
    ];
    
    sharedHolders = [
      { address: "shared1", fartAmount: 700000, goatAmount: 200000 },
      { address: "shared2", fartAmount: 600000, goatAmount: 100000 }
    ];
    
    return { fartcoinHolders, goatTokenHolders, sharedHolders };
  }
};

// Default export for convenience
export default {
  initializeData,
  fartcoinHolders,
  goatTokenHolders,
  sharedHolders
};