// Configuration management for the E-Cash Protocol Dashboard
export const config = {
  // Network Configuration - Auto-detect or use environment variable
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID
    ? Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID)
    : typeof window !== "undefined" && window.ethereum
      ? 11155111 // Default to Sepolia for public testing
      : 31337, // Fallback to localhost
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",

  // Contract Addresses (populated after deployment)
  contracts: {
    ecashToken: process.env.NEXT_PUBLIC_ECASH_TOKEN_ADDRESS || "",
    oracleAggregator: process.env.NEXT_PUBLIC_ORACLE_AGGREGATOR_ADDRESS || "",
    stabilizationController: process.env.NEXT_PUBLIC_STABILIZATION_CONTROLLER_ADDRESS || "",
    governance: process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS || "",
    treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "",
    testHelper: process.env.NEXT_PUBLIC_TEST_HELPER_ADDRESS || "",
  },

  // Feature Flags
  features: {
    stressTesting: process.env.NEXT_PUBLIC_ENABLE_STRESS_TESTING === "true",
    scenarioTesting: process.env.NEXT_PUBLIC_ENABLE_SCENARIO_TESTING === "true",
    realTimeMonitoring: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_MONITORING === "true",
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === "true",
    multiNetwork: true, // Enable multi-network support
  },

  // API Configuration
  infuraProjectId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || "",

  // Network Information
  networks: {
    31337: {
      name: "Localhost",
      symbol: "ETH",
      explorer: "",
      rpcUrl: "http://localhost:8545",
      testnet: true,
    },
    1: {
      name: "Ethereum Mainnet",
      symbol: "ETH",
      explorer: "https://etherscan.io",
      rpcUrl: `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
      testnet: false,
    },
    5: {
      name: "Goerli Testnet",
      symbol: "ETH",
      explorer: "https://goerli.etherscan.io",
      rpcUrl: `https://goerli.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
      testnet: true,
    },
    11155111: {
      name: "Sepolia Testnet",
      symbol: "ETH",
      explorer: "https://sepolia.etherscan.io",
      rpcUrl: `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
      testnet: true,
    },
  },

  // Dashboard Settings
  dashboard: {
    refreshInterval: 5000, // 5 seconds
    maxChartDataPoints: 50,
    defaultGasLimit: 500000,
  },

  // Sepolia-specific contract addresses (if deployed)
  sepoliaContracts: {
    ecashToken: process.env.NEXT_PUBLIC_SEPOLIA_ECASH_TOKEN || "",
    oracleAggregator: process.env.NEXT_PUBLIC_SEPOLIA_ORACLE_AGGREGATOR || "",
    stabilizationController: process.env.NEXT_PUBLIC_SEPOLIA_STABILIZATION_CONTROLLER || "",
    treasury: process.env.NEXT_PUBLIC_SEPOLIA_TREASURY || "",
    testHelper: process.env.NEXT_PUBLIC_SEPOLIA_TEST_HELPER || "",
  },
}

export const getNetworkInfo = (chainId: number) => {
  return (
    config.networks[chainId as keyof typeof config.networks] || {
      name: "Unknown Network",
      symbol: "ETH",
      explorer: "",
      rpcUrl: "",
      testnet: true,
    }
  )
}

export const isContractsDeployed = (chainId?: number) => {
  // Check if contracts are deployed for the current network
  if (chainId === 11155111) {
    return Object.values(config.sepoliaContracts).every((address) => address && address !== "")
  }
  return Object.values(config.contracts).every((address) => address && address !== "")
}

export const getContractsForNetwork = (chainId: number) => {
  if (chainId === 11155111) {
    return config.sepoliaContracts
  }
  return config.contracts
}
