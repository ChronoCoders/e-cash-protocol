"use client"

import { useState } from "react"
import type { ethers } from "ethers"
import { toast } from "react-toastify"
import { getNetworkInfo } from "../lib/config"

interface NetworkSwitcherProps {
  provider: ethers.BrowserProvider | null
  currentChainId: number
  onNetworkChanged: () => void
}

export default function NetworkSwitcher({ provider, currentChainId, onNetworkChanged }: NetworkSwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false)

  const supportedNetworks = [
    { chainId: 31337, name: "Localhost", recommended: false },
    { chainId: 11155111, name: "Sepolia Testnet", recommended: true },
    { chainId: 5, name: "Goerli Testnet", recommended: false },
  ]

  const switchNetwork = async (targetChainId: number) => {
    if (!provider || !window.ethereum) {
      toast.error("MetaMask not available")
      return
    }

    setIsSwitching(true)

    try {
      const networkInfo = getNetworkInfo(targetChainId)

      if (targetChainId === 31337) {
        // For localhost, just switch
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        })
      } else {
        // For other networks, try to switch or add if not exists
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          })
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${targetChainId.toString(16)}`,
                  chainName: networkInfo.name,
                  nativeCurrency: {
                    name: networkInfo.symbol,
                    symbol: networkInfo.symbol,
                    decimals: 18,
                  },
                  rpcUrls: [networkInfo.rpcUrl],
                  blockExplorerUrls: networkInfo.explorer ? [networkInfo.explorer] : [],
                },
              ],
            })
          } else {
            throw switchError
          }
        }
      }

      toast.success(`Switched to ${networkInfo.name}`)
      onNetworkChanged()
    } catch (error: any) {
      toast.error(`Failed to switch network: ${error.message}`)
    } finally {
      setIsSwitching(false)
    }
  }

  const addSepoliaTestnetFunds = () => {
    window.open("https://sepoliafaucet.com/", "_blank")
  }

  const currentNetwork = getNetworkInfo(currentChainId)
  const isTestnet = currentNetwork.testnet

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Network Configuration</h3>
        {isTestnet && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">TESTNET</span>}
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">Current Network</span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                currentChainId === 11155111 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {currentNetwork.name}
            </span>
          </div>
          <div className="text-sm text-gray-600">Chain ID: {currentChainId}</div>
        </div>

        {currentChainId === 11155111 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-green-900">Perfect! You're on Sepolia</h4>
                <p className="text-sm text-green-700 mt-1">
                  Sepolia is the recommended testnet for E-Cash protocol testing. You can deploy contracts and test all
                  features safely.
                </p>
                {currentNetwork.explorer && (
                  <a
                    href={currentNetwork.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:text-green-800 underline mt-2 inline-block"
                  >
                    View on Sepolia Explorer →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Available Networks</h4>
          {supportedNetworks.map((network) => (
            <div key={network.chainId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    currentChainId === network.chainId ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <span>{network.name}</span>
                    {network.recommended && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Recommended</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Chain ID: {network.chainId}</div>
                </div>
              </div>

              {currentChainId !== network.chainId && (
                <button
                  onClick={() => switchNetwork(network.chainId)}
                  disabled={isSwitching}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSwitching ? "Switching..." : "Switch"}
                </button>
              )}
            </div>
          ))}
        </div>

        {currentChainId === 11155111 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need Sepolia ETH?</h4>
            <p className="text-sm text-blue-700 mb-3">
              You need Sepolia ETH to deploy contracts and execute transactions. Get free testnet ETH from the faucet.
            </p>
            <button
              onClick={addSepoliaTestnetFunds}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Get Sepolia ETH →
            </button>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Network Recommendations</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Sepolia Testnet:</strong> Best for public testing and sharing results
            </p>
            <p>
              <strong>Localhost:</strong> Best for development and rapid iteration
            </p>
            <p>
              <strong>Goerli Testnet:</strong> Alternative testnet (being deprecated)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
