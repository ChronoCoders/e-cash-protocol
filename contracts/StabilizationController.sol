// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./ECashToken.sol";
import "./OracleAggregator.sol";
import "./Treasury.sol";

/**
 * @title StabilizationController
 * @dev Controls rebase operations with progressive stability bands and circuit breakers
 */
contract StabilizationController is Initializable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    ECashToken public ecashToken;
    OracleAggregator public oracleAggregator;
    Treasury public treasury;

    uint256 public constant TARGET_PRICE = 1e18; // $1.00
    uint256 public constant REBASE_COOLDOWN = 12 hours;
    uint256 public constant MAX_REBASE_PERCENTAGE = 10e16; // 10%
    
    // Stability bands with different response intensities
    uint256 public constant BAND_1_THRESHOLD = 1e16;  // 1%
    uint256 public constant BAND_2_THRESHOLD = 5e16;  // 5%
    uint256 public constant BAND_3_THRESHOLD = 10e16; // 10%
    uint256 public constant BAND_4_THRESHOLD = 20e16; // 20%

    // Dampening factors for each band
    uint256 public constant BAND_1_DAMPING = 10e16;  // 10%
    uint256 public constant BAND_2_DAMPING = 25e16;  // 25%
    uint256 public constant BAND_3_DAMPING = 50e16;  // 50%
    uint256 public constant BAND_4_DAMPING = 75e16;  // 75%

    uint256 public lastRebaseTime;
    uint256 public rebaseCount;
    bool public circuitBreakerActive;

    struct RebaseData {
        uint256 timestamp;
        uint256 price;
        int256 supplyDelta;
        uint256 newSupply;
        uint8 stabilityBand;
    }

    mapping(uint256 => RebaseData) public rebaseHistory;

    event RebaseExecuted(
        uint256 indexed epoch,
        uint256 price,
        int256 supplyDelta,
        uint256 newSupply,
        uint8 stabilityBand
    );
    event CircuitBreakerTriggered(uint256 price, uint256 deviation);
    event CircuitBreakerReset();

    function initialize(
        address admin,
        address _ecashToken,
        address _oracleAggregator,
        address _treasury
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);

        ecashToken = ECashToken(_ecashToken);
        oracleAggregator = OracleAggregator(_oracleAggregator);
        treasury = Treasury(_treasury);
    }

    function rebase() external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(!circuitBreakerActive, "Circuit breaker active");
        require(canRebase(), "Rebase conditions not met");

        (uint256 price, uint256 timestamp, uint256 confidence) = oracleAggregator.getAggregatedPrice();
        require(confidence >= 50, "Insufficient oracle confidence");

        uint256 deviation = _calculateDeviation(price);
        uint8 stabilityBand = _getStabilityBand(deviation);

        // Check circuit breaker conditions
        if (deviation >= BAND_4_THRESHOLD) {
            circuitBreakerActive = true;
            emit CircuitBreakerTriggered(price, deviation);
            return;
        }

        // Calculate supply adjustment
        int256 supplyDelta = _calculateSupplyDelta(price, stabilityBand);
        
        if (supplyDelta != 0) {
            uint256 newSupply = ecashToken.rebase(supplyDelta);
            
            rebaseCount++;
            lastRebaseTime = block.timestamp;

            rebaseHistory[rebaseCount] = RebaseData({
                timestamp: timestamp,
                price: price,
                supplyDelta: supplyDelta,
                newSupply: newSupply,
                stabilityBand: stabilityBand
            });

            emit RebaseExecuted(rebaseCount, price, supplyDelta, newSupply, stabilityBand);
        }
    }

    function _calculateSupplyDelta(uint256 price, uint8 stabilityBand) internal view returns (int256) {
        if (price == TARGET_PRICE) return 0;

        uint256 currentSupply = ecashToken.totalSupply();
        uint256 deviation = _calculateDeviation(price);
        uint256 dampingFactor = _getDampingFactor(stabilityBand);

        // Calculate raw adjustment
        uint256 rawAdjustment = (currentSupply * deviation) / 1e18;
        
        // Apply damping
        uint256 dampedAdjustment = (rawAdjustment * dampingFactor) / 1e18;
        
        // Cap at maximum rebase percentage
        uint256 maxAdjustment = (currentSupply * MAX_REBASE_PERCENTAGE) / 1e18;
        if (dampedAdjustment > maxAdjustment) {
            dampedAdjustment = maxAdjustment;
        }

        // Return positive for expansion, negative for contraction
        return price > TARGET_PRICE ? int256(dampedAdjustment) : -int256(dampedAdjustment);
    }

    function _calculateDeviation(uint256 price) internal pure returns (uint256) {
        if (price >= TARGET_PRICE) {
            return ((price - TARGET_PRICE) * 1e18) / TARGET_PRICE;
        } else {
            return ((TARGET_PRICE - price) * 1e18) / TARGET_PRICE;
        }
    }

    function _getStabilityBand(uint256 deviation) internal pure returns (uint8) {
        if (deviation >= BAND_4_THRESHOLD) return 4;
        if (deviation >= BAND_3_THRESHOLD) return 3;
        if (deviation >= BAND_2_THRESHOLD) return 2;
        if (deviation >= BAND_1_THRESHOLD) return 1;
        return 0;
    }

    function _getDampingFactor(uint8 band) internal pure returns (uint256) {
        if (band == 4) return BAND_4_DAMPING;
        if (band == 3) return BAND_3_DAMPING;
        if (band == 2) return BAND_2_DAMPING;
        if (band == 1) return BAND_1_DAMPING;
        return 0;
    }

    function canRebase() public view returns (bool) {
        return block.timestamp >= lastRebaseTime + REBASE_COOLDOWN;
    }

    function previewRebase() external view returns (
        bool canExecute,
        uint256 currentPrice,
        uint256 deviation,
        int256 projectedSupplyDelta,
        uint8 stabilityBand
    ) {
        canExecute = canRebase() && !circuitBreakerActive;
        
        try oracleAggregator.getAggregatedPrice() returns (uint256 price, , uint256 confidence) {
            if (confidence >= 50) {
                currentPrice = price;
                deviation = _calculateDeviation(price);
                stabilityBand = _getStabilityBand(deviation);
                projectedSupplyDelta = _calculateSupplyDelta(price, stabilityBand);
            }
        } catch {
            canExecute = false;
        }
    }

    function resetCircuitBreaker() external onlyRole(DEFAULT_ADMIN_ROLE) {
        circuitBreakerActive = false;
        emit CircuitBreakerReset();
    }

    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
