// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title OracleAggregator
 * @dev Aggregates price data from multiple oracle sources with weighted averaging
 */
contract OracleAggregator is Initializable, AccessControlUpgradeable {
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");

    struct OracleConfig {
        address oracle;
        uint256 weight;
        uint256 heartbeat;
        bool isActive;
        uint8 decimals;
        string description;
    }

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
    }

    mapping(string => OracleConfig) public oracles;
    string[] public oracleKeys;
    
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant MAX_PRICE_DEVIATION = 20e16; // 20%
    uint256 public constant MIN_ORACLES_REQUIRED = 1;
    
    event OracleAdded(string indexed key, address oracle, uint256 weight);
    event OracleUpdated(string indexed key, address oracle, uint256 weight);
    event OracleRemoved(string indexed key);
    event PriceUpdated(uint256 price, uint256 timestamp, uint256 confidence);

    function initialize(address admin) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_MANAGER_ROLE, admin);
    }

    function addOracle(
        string memory key,
        address oracle,
        uint256 weight,
        uint256 heartbeat,
        uint8 decimals,
        string memory description
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(oracle != address(0), "Invalid oracle address");
        require(weight > 0, "Weight must be positive");
        require(!oracles[key].isActive, "Oracle already exists");

        oracles[key] = OracleConfig({
            oracle: oracle,
            weight: weight,
            heartbeat: heartbeat,
            isActive: true,
            decimals: decimals,
            description: description
        });

        oracleKeys.push(key);
        emit OracleAdded(key, oracle, weight);
    }

    function updateOracle(
        string memory key,
        uint256 weight,
        uint256 heartbeat
    ) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(oracles[key].isActive, "Oracle does not exist");
        require(weight > 0, "Weight must be positive");

        oracles[key].weight = weight;
        oracles[key].heartbeat = heartbeat;
        emit OracleUpdated(key, oracles[key].oracle, weight);
    }

    function removeOracle(string memory key) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(oracles[key].isActive, "Oracle does not exist");
        
        oracles[key].isActive = false;
        
        // Remove from array
        for (uint i = 0; i < oracleKeys.length; i++) {
            if (keccak256(bytes(oracleKeys[i])) == keccak256(bytes(key))) {
                oracleKeys[i] = oracleKeys[oracleKeys.length - 1];
                oracleKeys.pop();
                break;
            }
        }
        
        emit OracleRemoved(key);
    }

    function getAggregatedPrice() external view returns (uint256 price, uint256 timestamp, uint256 confidence) {
        require(oracleKeys.length >= MIN_ORACLES_REQUIRED, "Insufficient oracles");

        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 oldestTimestamp = type(uint256).max;
        uint256 validOracles = 0;

        for (uint i = 0; i < oracleKeys.length; i++) {
            string memory key = oracleKeys[i];
            OracleConfig memory config = oracles[key];
            
            if (!config.isActive) continue;

            try AggregatorV3Interface(config.oracle).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (answer > 0 && updatedAt > 0) {
                    // Check if data is fresh
                    if (block.timestamp - updatedAt <= config.heartbeat) {
                        uint256 normalizedPrice = _normalizePrice(uint256(answer), config.decimals);
                        
                        weightedSum += normalizedPrice * config.weight;
                        totalWeight += config.weight;
                        validOracles++;
                        
                        if (updatedAt < oldestTimestamp) {
                            oldestTimestamp = updatedAt;
                        }
                    }
                }
            } catch {
                // Oracle call failed, skip this oracle
                continue;
            }
        }

        require(validOracles >= MIN_ORACLES_REQUIRED, "Insufficient valid oracles");
        require(totalWeight > 0, "No valid oracle data");

        price = weightedSum / totalWeight;
        timestamp = oldestTimestamp;
        confidence = (validOracles * 100) / oracleKeys.length;

        return (price, timestamp, confidence);
    }

    function _normalizePrice(uint256 price, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) {
            return price;
        } else if (decimals < 18) {
            return price * (10 ** (18 - decimals));
        } else {
            return price / (10 ** (decimals - 18));
        }
    }

    function getOracleCount() external view returns (uint256) {
        return oracleKeys.length;
    }

    function isHealthy() external view returns (bool) {
        (, , uint256 confidence) = this.getAggregatedPrice();
        return confidence >= 50; // At least 50% of oracles must be working
    }
}
