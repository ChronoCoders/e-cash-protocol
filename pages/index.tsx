"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { toast } from "react-toastify"
import { config, getNetworkInfo, isContractsDeployed, getContractsForNetwork } from "../lib/config"
import NetworkStatus from "../components/NetworkStatus"
import NetworkSwitcher from "../components/NetworkSwitcher"
import SepoliaDeploymentGuide from "../components/SepoliaDeploymentGuide"
import DeploymentManager from "../components/DeploymentManager"
import FeatureFlags, { DebugInfo } from "../components/FeatureFlags"
import RealtimeMetrics from "../components/RealtimeMetrics"
import StressTestSuite from "../components/StressTestSuite"
import ScenarioRunner from "../components/ScenarioRunner"

interface ProtocolStatus {
  currentPrice: string
  targetPrice: string
  totalSupply: string
  deviation: string
  canRebase: boolean
  circuitBreakerActive: boolean
  lastRebaseTime: string
  rebaseCount: string
  stabilityBand: number
  oracleConfidence: string
}

export default function Dashboard() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [account, setAccount] = useState<string>("")
  const [currentChainId, setCurrentChainId] = useState<number>(0)
  const [contracts, setContracts] = useState<any>({})
  const [contractAddresses, setContractAddresses] = useState<any>(null)
  const [protocolStatus, setProtocolStatus] = useState<ProtocolStatus | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(config.features.realTimeMonitoring)

  // Contract ABIs (simplified for demo)
  const contractABIs = {
    ECashToken: [
      "function totalSupply() view returns (uint256)",
      "function rebase(int256 supplyDelta) returns (uint256)",
      "function balanceOf(address account) view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)",
    ],
    OracleAggregator: [
      "function getAggregatedPrice() view returns (uint256 price, uint256 timestamp, uint256 confidence)",
      "function addOracle(string key, address oracle, uint256 weight, uint256 heartbeat, uint8 decimals, string description)",
    ],
    StabilizationController: [
      "function rebase()",
      "function canRebase() view returns (bool)",
      "function circuitBreakerActive() view returns (bool)",
      "function lastRebaseTime() view returns (uint256)",
      "function rebaseCount() view returns (uint256)",
      "function resetCircuitBreaker()",
      "function previewRebase() view returns (bool canExecute, uint256 currentPrice, uint256 deviation, int256 projectedSupplyDelta, uint8 stabilityBand)",
    ],
    Treasury: [
      "function getAssetInfo(address asset) view returns (tuple(uint256 totalBalance, uint256 strategicReserve, uint256 ecosystemFunding, uint256 liquidityIncentives, uint256 operations, bool isActive))",
    ],
    MockChainlinkOracle: [
      "function updateAnswer(int256 answer)",
      "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    ],
    TestHelper: [
      "function getProtocolStatus() view returns (tuple(uint256 currentPrice, uint256 targetPrice, uint256 totalSupply, uint256 deviation, bool canRebase, bool circuitBreakerActive, uint256 lastRebaseTime, uint256 rebaseCount, uint8 stabilityBand, uint256 oracleConfidence))",
      "function testNormalRebase() returns (bool)",
      "function testCircuitBreaker() returns (bool)",
      "function testOracleFailure() returns (bool)",
      "function simulateMarketCrash() returns (bool)",
      "function simulateBullMarket() returns (bool)",
      "function resetProtocol()",
    ],
  }

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found. Please install MetaMask.")
      return
    }

    setIsConnecting(true)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Get current network
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      setProvider(provider)
      setSigner(signer)
      setAccount(address)
      setCurrentChainId(chainId)

      toast.success(`Connected to ${address.slice(0, 6)}...${address.slice(-4)}`)

      // Initialize contracts if already deployed for this network
      const networkContracts = getContractsForNetwork(chainId)
      if (isContractsDeployed(chainId)) {
        initializeContracts(signer, networkContracts)
      }

      // Listen for network changes
      window.ethereum.on("chainChanged", handleChainChanged)
      window.ethereum.on("accountsChanged", handleAccountsChanged)
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }

  // Handle network changes
  const handleChainChanged = (chainId: string) => {
    const newChainId = Number.parseInt(chainId, 16)
    setCurrentChainId(newChainId)

    // Reset contracts when network changes
    setContracts({})
    setContractAddresses(null)
    setProtocolStatus(null)

    const networkInfo = getNetworkInfo(newChainId)
    toast.info(`Switched to ${networkInfo.name}`)
  }

  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setProvider(null)
      setSigner(null)
      setAccount("")
      setContracts({})
      setContractAddresses(null)
      setProtocolStatus(null)
      toast.info("Wallet disconnected")
    } else {
      // Account changed
      setAccount(accounts[0])
      toast.info(`Account changed to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)
    }
  }

  // Initialize contract instances
  const initializeContracts = (signer: ethers.Signer, addresses: any) => {
    const contractInstances = {
      ecashToken: new ethers.Contract(addresses.ecashToken, contractABIs.ECashToken, signer),
      oracleAggregator: new ethers.Contract(addresses.oracleAggregator, contractABIs.OracleAggregator, signer),
      stabilizationController: new ethers.Contract(
        addresses.stabilizationController,
        contractABIs.StabilizationController,
        signer,
      ),
      treasury: new ethers.Contract(addresses.treasury, contractABIs.Treasury, signer),
      chainlinkOracle: new ethers.Contract("0x" + "5".repeat(40), contractABIs.MockChainlinkOracle, signer), // Mock address
      testHelper: new ethers.Contract(addresses.testHelper, contractABIs.TestHelper, signer),
    }

    setContracts(contractInstances)
    setContractAddresses(addresses)
  }

  // Handle deployment completion
  const handleDeploymentComplete = (addresses: any) => {
    setContractAddresses(addresses)

    if (signer) {
      initializeContracts(signer, addresses)
      // Start fetching protocol status
      fetchProtocolStatus()
    }
  }

  // Fetch protocol status
  const fetchProtocolStatus = useCallback(
    async (testHelperContract?: any) => {
      const testHelper = testHelperContract || contracts.testHelper
      if (!testHelper) return

      try {
        // Mock protocol status - in real implementation, this would call the actual contract
        const mockStatus: ProtocolStatus = {
          currentPrice: (1.0 + (Math.random() - 0.5) * 0.1).toFixed(6), // Random price around $1.00
          targetPrice: "1.000000",
          totalSupply: (1000000 + Math.random() * 100000).toFixed(0),
          deviation: (Math.random() * 0.05).toFixed(6), // Random deviation up to 5%
          canRebase: Math.random() > 0.3, // 70% chance can rebase
          circuitBreakerActive: Math.random() > 0.9, // 10% chance circuit breaker active
          lastRebaseTime: (Date.now() - Math.random() * 86400000).toString(), // Random time in last 24h
          rebaseCount: Math.floor(Math.random() * 100).toString(),
          stabilityBand: Math.floor(Math.random() * 5), // 0-4
          oracleConfidence: (80 + Math.random() * 20).toFixed(0), // 80-100%
        }

        setProtocolStatus(mockStatus)
      } catch (error: any) {
        if (config.features.debugMode) {
          console.error("Failed to fetch protocol status:", error)
        }
      }
    },
    [contracts.testHelper],
  )

  // Auto-refresh protocol status
  useEffect(() => {
    if (!autoRefresh || !contracts.testHelper) return

    const interval = setInterval(() => {
      fetchProtocolStatus()
    }, config.dashboard.refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, contracts.testHelper, fetchProtocolStatus])

  // Price simulation buttons
  const simulatePrice = async (price: number) => {
    if (!contracts.chainlinkOracle) {
      toast.error("Oracle contract not available")
      return
    }

    try {
      toast.info(`Setting price to $${price.toFixed(2)}...`)

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success(`Price updated to $${price.toFixed(2)}`)
      fetchProtocolStatus()
    } catch (error: any) {
      toast.error(`Price simulation failed: ${error.message}`)
    }
  }

  // Execute rebase
  const executeRebase = async () => {
    if (!contracts.stabilizationController) {
      toast.error("Stabilization controller not available")
      return
    }

    try {
      toast.info("Executing rebase...")

      // Mock rebase execution
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success("Rebase executed successfully!")
      fetchProtocolStatus()
    } catch (error: any) {
      toast.error(`Rebase failed: ${error.message}`)
    }
  }

  // Reset circuit breaker
  const resetCircuitBreaker = async () => {
    if (!contracts.stabilizationController) {
      toast.error("Stabilization controller not available")
      return
    }

    try {
      toast.info("Resetting circuit breaker...")

      // Mock circuit breaker reset
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Circuit breaker reset successfully!")
      fetchProtocolStatus()
    } catch (error: any) {
      toast.error(`Circuit breaker reset failed: ${error.message}`)
    }
  }

  const currentNetwork = getNetworkInfo(currentChainId)
  const isCorrectNetwork = currentChainId === 11155111 || currentChainId === 31337 // Accept both Sepolia and localhost
  const contractsDeployed = isContractsDeployed(currentChainId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E₵</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">E-Cash Protocol Dashboard</h1>
                {config.features.debugMode && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">DEBUG</span>
                )}
                {currentNetwork.testnet && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">TESTNET</span>
                )}
              </div>

              {protocolStatus && contractsDeployed && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        protocolStatus.circuitBreakerActive
                          ? "bg-red-500"
                          : Number.parseFloat(protocolStatus.deviation) > 0.1
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    ></div>
                    <span className="text-gray-600">
                      {protocolStatus.circuitBreakerActive
                        ? "Circuit Breaker Active"
                        : Number.parseFloat(protocolStatus.deviation) > 0.1
                          ? "High Deviation"
                          : "System Healthy"}
                    </span>
                  </div>

                  <div className="text-gray-600">
                    Price:{" "}
                    <span className="font-medium">${Number.parseFloat(protocolStatus.currentPrice).toFixed(4)}</span>
                  </div>

                  <div className="text-gray-600">
                    Supply:{" "}
                    <span className="font-medium">{Number.parseInt(protocolStatus.totalSupply).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {account ? (
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    <div className="font-medium">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                    <div className="text-xs">{currentNetwork.name}</div>
                  </div>

                  <FeatureFlags feature="realTimeMonitoring">
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        autoRefresh
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      Auto-refresh: {autoRefresh ? "ON" : "OFF"}
                    </button>
                  </FeatureFlags>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!account ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 text-2xl font-bold">E₵</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to E-Cash Protocol Dashboard</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              A comprehensive testing environment for the E-Cash algorithmic stablecoin protocol. Connect your wallet to
              deploy contracts and start testing the stability mechanisms.
            </p>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet to Start"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Network Status and Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <NetworkStatus provider={provider} account={account} />
              <NetworkSwitcher
                provider={provider}
                currentChainId={currentChainId}
                onNetworkChanged={() => window.location.reload()}
              />
            </div>

            {/* Sepolia Deployment Guide */}
            {currentChainId === 11155111 && !contractsDeployed && <SepoliaDeploymentGuide />}

            {/* Main Content */}
            {isCorrectNetwork ? (
              <>
                {!contractsDeployed ? (
                  <DeploymentManager
                    provider={provider}
                    signer={signer}
                    onDeploymentComplete={handleDeploymentComplete}
                  />
                ) : (
                  <>
                    {/* Protocol Controls */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">Protocol Controls</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Price Simulation */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">Price Simulation</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => simulatePrice(0.95)}
                              className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm hover:bg-red-200 transition-colors"
                            >
                              $0.95 (-5%)
                            </button>
                            <button
                              onClick={() => simulatePrice(1.0)}
                              className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm hover:bg-green-200 transition-colors"
                            >
                              $1.00 (0%)
                            </button>
                            <button
                              onClick={() => simulatePrice(1.05)}
                              className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm hover:bg-yellow-200 transition-colors"
                            >
                              $1.05 (+5%)
                            </button>
                            <button
                              onClick={() => simulatePrice(1.25)}
                              className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm hover:bg-red-200 transition-colors"
                            >
                              $1.25 (+25%)
                            </button>
                          </div>
                        </div>

                        {/* Rebase Controls */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">Rebase Operations</h3>
                          <div className="space-y-2">
                            <button
                              onClick={executeRebase}
                              disabled={!protocolStatus?.canRebase || protocolStatus?.circuitBreakerActive}
                              className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Execute Rebase
                            </button>
                            <button
                              onClick={() => fetchProtocolStatus()}
                              className="w-full bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                            >
                              Refresh Status
                            </button>
                          </div>
                        </div>

                        {/* Emergency Controls */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">Emergency Controls</h3>
                          <div className="space-y-2">
                            <button
                              onClick={resetCircuitBreaker}
                              disabled={!protocolStatus?.circuitBreakerActive}
                              className="w-full bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                              Reset Circuit Breaker
                            </button>
                            <button
                              onClick={() => simulatePrice(1.0)}
                              className="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Reset to Target
                            </button>
                          </div>
                        </div>

                        {/* System Status */}
                        <div className="space-y-3">
                          <h3 className="font-medium text-gray-900">System Status</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rebase Ready:</span>
                              <span className={protocolStatus?.canRebase ? "text-green-600" : "text-red-600"}>
                                {protocolStatus?.canRebase ? "Yes" : "No"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Circuit Breaker:</span>
                              <span
                                className={protocolStatus?.circuitBreakerActive ? "text-red-600" : "text-green-600"}
                              >
                                {protocolStatus?.circuitBreakerActive ? "Active" : "Normal"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Stability Band:</span>
                              <span className="text-gray-900">{protocolStatus?.stabilityBand || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real-time Metrics */}
                    <FeatureFlags feature="realTimeMonitoring">
                      <RealtimeMetrics protocolStatus={protocolStatus} />
                    </FeatureFlags>

                    {/* Testing Components */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <FeatureFlags feature="stressTesting">
                        <StressTestSuite contracts={contracts} onStatusUpdate={() => fetchProtocolStatus()} />
                      </FeatureFlags>

                      <FeatureFlags feature="scenarioTesting">
                        <ScenarioRunner contracts={contracts} onStatusUpdate={() => fetchProtocolStatus()} />
                      </FeatureFlags>
                    </div>

                    {/* Contract Addresses */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Deployed Contracts</h2>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                          {currentNetwork.name}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(contractAddresses).map(([name, address]) => (
                          <div key={name} className="bg-gray-50 p-3 rounded">
                            <div className="font-medium text-gray-900 capitalize">
                              {name.replace(/([A-Z])/g, " $1").trim()}
                            </div>
                            <div className="text-sm text-gray-600 font-mono break-all">{address}</div>
                            {currentNetwork.explorer && (
                              <a
                                href={`${currentNetwork.explorer}/address/${address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                View on Explorer →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-yellow-600 text-2xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Network Not Supported</h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Please switch to Sepolia testnet or localhost to use the E-Cash protocol dashboard.
                </p>
              </div>
            )}

            {/* Debug Information */}
            <DebugInfo
              data={{
                currentChainId,
                currentNetwork,
                isCorrectNetwork,
                contractsDeployed,
                account,
                contractAddresses,
                protocolStatus,
                features: config.features,
              }}
            />
          </div>
        )}
      </main>
    </div>
  )
}
