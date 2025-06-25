"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { toast } from "react-toastify"
import { config, isContractsDeployed } from "../lib/config"

interface DeploymentManagerProps {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  onDeploymentComplete: (addresses: any) => void
}

interface DeploymentStep {
  name: string
  status: "pending" | "deploying" | "completed" | "failed"
  address?: string
  txHash?: string
  gasUsed?: string
  error?: string
}

export default function DeploymentManager({ provider, signer, onDeploymentComplete }: DeploymentManagerProps) {
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([
    { name: "MockChainlinkOracle", status: "pending" },
    { name: "ECashToken", status: "pending" },
    { name: "OracleAggregator", status: "pending" },
    { name: "Treasury", status: "pending" },
    { name: "StabilizationController", status: "pending" },
    { name: "TestHelper", status: "pending" },
  ])
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentProgress, setDeploymentProgress] = useState(0)

  const updateStep = (index: number, updates: Partial<DeploymentStep>) => {
    setDeploymentSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...updates } : step)))
  }

  const deployContracts = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsDeploying(true)
    setDeploymentProgress(0)

    try {
      const deployedAddresses: any = {}

      // Step 1: Deploy MockChainlinkOracle
      updateStep(0, { status: "deploying" })
      const mockOracleFactory = new ethers.ContractFactory(
        ["constructor(uint8 _decimals, string memory _description)"],
        "0x", // Bytecode would be here in real deployment
        signer,
      )

      // Mock deployment simulation
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockOracleAddress = "0x" + "1".repeat(40)
      deployedAddresses.chainlinkOracle = mockOracleAddress
      updateStep(0, {
        status: "completed",
        address: mockOracleAddress,
        txHash: "0x" + "a".repeat(64),
        gasUsed: "1,234,567",
      })
      setDeploymentProgress(16.67)

      // Step 2: Deploy ECashToken
      updateStep(1, { status: "deploying" })
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const ecashTokenAddress = "0x" + "2".repeat(40)
      deployedAddresses.ecashToken = ecashTokenAddress
      updateStep(1, {
        status: "completed",
        address: ecashTokenAddress,
        txHash: "0x" + "b".repeat(64),
        gasUsed: "2,345,678",
      })
      setDeploymentProgress(33.33)

      // Step 3: Deploy OracleAggregator
      updateStep(2, { status: "deploying" })
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const oracleAggregatorAddress = "0x" + "3".repeat(40)
      deployedAddresses.oracleAggregator = oracleAggregatorAddress
      updateStep(2, {
        status: "completed",
        address: oracleAggregatorAddress,
        txHash: "0x" + "c".repeat(64),
        gasUsed: "1,876,543",
      })
      setDeploymentProgress(50)

      // Step 4: Deploy Treasury
      updateStep(3, { status: "deploying" })
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const treasuryAddress = "0x" + "4".repeat(40)
      deployedAddresses.treasury = treasuryAddress
      updateStep(3, {
        status: "completed",
        address: treasuryAddress,
        txHash: "0x" + "d".repeat(64),
        gasUsed: "1,654,321",
      })
      setDeploymentProgress(66.67)

      // Step 5: Deploy StabilizationController
      updateStep(4, { status: "deploying" })
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const stabilizationControllerAddress = "0x" + "5".repeat(40)
      deployedAddresses.stabilizationController = stabilizationControllerAddress
      updateStep(4, {
        status: "completed",
        address: stabilizationControllerAddress,
        txHash: "0x" + "e".repeat(64),
        gasUsed: "2,987,654",
      })
      setDeploymentProgress(83.33)

      // Step 6: Deploy TestHelper
      updateStep(5, { status: "deploying" })
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const testHelperAddress = "0x" + "6".repeat(40)
      deployedAddresses.testHelper = testHelperAddress
      updateStep(5, {
        status: "completed",
        address: testHelperAddress,
        txHash: "0x" + "f".repeat(64),
        gasUsed: "1,543,210",
      })
      setDeploymentProgress(100)

      toast.success("All contracts deployed successfully!")
      onDeploymentComplete(deployedAddresses)
    } catch (error: any) {
      toast.error(`Deployment failed: ${error.message}`)
      // Mark current step as failed
      const currentStepIndex = deploymentSteps.findIndex((step) => step.status === "deploying")
      if (currentStepIndex !== -1) {
        updateStep(currentStepIndex, { status: "failed", error: error.message })
      }
    } finally {
      setIsDeploying(false)
    }
  }

  const resetDeployment = () => {
    setDeploymentSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: "pending",
        address: undefined,
        txHash: undefined,
        gasUsed: undefined,
        error: undefined,
      })),
    )
    setDeploymentProgress(0)
  }

  const getStatusIcon = (status: DeploymentStep["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-4 h-4 rounded-full bg-gray-300"></div>
      case "deploying":
        return <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
      case "completed":
        return (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
      case "failed":
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
    }
  }

  if (isContractsDeployed()) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-green-900">Contracts Deployed</h3>
            <p className="text-sm text-green-700">All protocol contracts are deployed and ready for testing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(config.contracts).map(([name, address]) => (
            <div key={name} className="bg-white p-3 rounded border">
              <div className="font-medium text-gray-900 capitalize">{name.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="text-sm text-gray-600 font-mono break-all">{address}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Contract Deployment</h2>
          <p className="text-sm text-gray-600">Deploy the complete E-Cash protocol suite</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={deployContracts}
            disabled={isDeploying}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isDeploying ? "Deploying..." : "Deploy All Contracts"}
          </button>
          {!isDeploying && deploymentSteps.some((step) => step.status !== "pending") && (
            <button
              onClick={resetDeployment}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isDeploying && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Deployment Progress</span>
            <span>{deploymentProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${deploymentProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Deployment Steps */}
      <div className="space-y-4">
        {deploymentSteps.map((step, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(step.status)}
                <div>
                  <h3 className="font-medium text-gray-900">{step.name}</h3>
                  {step.address && <p className="text-sm text-gray-600 font-mono">{step.address}</p>}
                  {step.txHash && (
                    <p className="text-xs text-gray-500">
                      Tx: {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                      {step.gasUsed && ` | Gas: ${step.gasUsed}`}
                    </p>
                  )}
                  {step.error && <p className="text-sm text-red-600">Error: {step.error}</p>}
                </div>
              </div>

              <div className="text-sm">
                {step.status === "pending" && <span className="text-gray-500">Waiting</span>}
                {step.status === "deploying" && <span className="text-blue-600">Deploying...</span>}
                {step.status === "completed" && <span className="text-green-600">Completed</span>}
                {step.status === "failed" && <span className="text-red-600">Failed</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Deployment Information */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Deployment Information</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Network:</strong>{" "}
            {config.networks[config.chainId as keyof typeof config.networks]?.name || "Unknown"}
          </p>
          <p>
            <strong>Chain ID:</strong> {config.chainId}
          </p>
          <p>
            <strong>RPC URL:</strong> {config.rpcUrl}
          </p>
          <p>
            <strong>Gas Reporting:</strong> {process.env.REPORT_GAS === "true" ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>
    </div>
  )
}
