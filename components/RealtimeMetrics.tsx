"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"

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

interface RealtimeMetricsProps {
  protocolStatus: ProtocolStatus | null
}

interface ChartDataPoint {
  timestamp: string
  price: number
  supply: number
  deviation: number
}

export default function RealtimeMetrics({ protocolStatus }: RealtimeMetricsProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [maxDataPoints] = useState(50)

  useEffect(() => {
    if (protocolStatus) {
      const newDataPoint: ChartDataPoint = {
        timestamp: new Date().toLocaleTimeString(),
        price: Number.parseFloat(protocolStatus.currentPrice),
        supply: Number.parseFloat(protocolStatus.totalSupply) / 1000000, // Convert to millions
        deviation: Number.parseFloat(protocolStatus.deviation) * 100, // Convert to percentage
      }

      setChartData((prevData) => {
        const updatedData = [...prevData, newDataPoint]
        return updatedData.slice(-maxDataPoints) // Keep only last N points
      })
    }
  }, [protocolStatus, maxDataPoints])

  if (!protocolStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-time Metrics</h2>
        <div className="text-center py-8 text-gray-500">Loading protocol data...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Real-time Metrics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Price Tracking</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis domain={[0.8, 1.3]} tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Price"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 3 }}
                />
                {/* Target price line */}
                <Line
                  type="monotone"
                  dataKey={() => 1.0}
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
            Current Price
            <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2 ml-4"></span>
            Target Price ($1.00)
          </div>
        </div>

        {/* Supply Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supply Changes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value.toFixed(1)}M`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}M`, "Supply"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area type="monotone" dataKey="supply" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span className="inline-block w-3 h-3 bg-purple-500 rounded mr-2"></span>
            Total Supply (Millions)
          </div>
        </div>

        {/* Deviation Chart */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Price Deviation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis domain={[-25, 25]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Deviation"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="deviation"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ fill: "#F59E0B", strokeWidth: 2, r: 3 }}
                />
                {/* Stability band lines */}
                <Line
                  type="monotone"
                  dataKey={() => 1}
                  stroke="#10B981"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => -1}
                  stroke="#10B981"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => 5}
                  stroke="#F59E0B"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => -5}
                  stroke="#F59E0B"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => 10}
                  stroke="#EF4444"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => -10}
                  stroke="#EF4444"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-2"></span>
            Price Deviation
            <div className="mt-1 text-xs">
              <span className="text-green-600">±1%</span> |<span className="text-yellow-600 ml-1">±5%</span> |
              <span className="text-red-600 ml-1">±10%</span> Bands
            </div>
          </div>
        </div>

        {/* Market Cap */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Market Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Market Cap</span>
              <span className="text-xl font-bold text-gray-900">
                $
                {(
                  Number.parseFloat(protocolStatus.currentPrice) * Number.parseFloat(protocolStatus.totalSupply)
                ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rebase Count</span>
              <span className="text-xl font-bold text-gray-900">{protocolStatus.rebaseCount}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Oracle Confidence</span>
              <span
                className={`text-xl font-bold ${
                  Number.parseInt(protocolStatus.oracleConfidence) >= 80
                    ? "text-green-600"
                    : Number.parseInt(protocolStatus.oracleConfidence) >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {protocolStatus.oracleConfidence}%
              </span>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">System Health</span>
                <div
                  className={`px-3 py-1 rounded-full text-sm ${
                    protocolStatus.circuitBreakerActive
                      ? "bg-red-100 text-red-800"
                      : Number.parseFloat(protocolStatus.deviation) > 0.1
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {protocolStatus.circuitBreakerActive
                    ? "Critical"
                    : Number.parseFloat(protocolStatus.deviation) > 0.1
                      ? "Warning"
                      : "Healthy"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
