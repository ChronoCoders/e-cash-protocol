// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ECashToken
 * @dev Rebasing ERC-20 token that maintains $1 peg through elastic supply
 */
contract ECashToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant REBASER_ROLE = keccak256("REBASER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private constant MAX_UINT256 = type(uint256).max;
    uint256 private constant INITIAL_FRAGMENTS_SUPPLY = 1_000_000 * 10**18;
    uint256 private constant TOTAL_GONS = MAX_UINT256 - (MAX_UINT256 % INITIAL_FRAGMENTS_SUPPLY);
    uint256 private constant MAX_SUPPLY = type(uint128).max;

    uint256 private _totalSupply;
    uint256 private _gonsPerFragment;
    mapping(address => uint256) private _gonBalances;
    mapping(address => mapping(address => uint256)) private _allowedFragments;

    event Rebase(uint256 indexed epoch, uint256 totalSupply, uint256 supplyDelta, bool positive);
    event LogRebase(uint256 indexed epoch, uint256 totalSupply);

    uint256 public rebaseCount;

    function initialize(
        string memory name,
        string memory symbol,
        address admin
    ) public initializer {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REBASER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        _totalSupply = INITIAL_FRAGMENTS_SUPPLY;
        _gonBalances[admin] = TOTAL_GONS;
        _gonsPerFragment = TOTAL_GONS / _totalSupply;

        emit Transfer(address(0), admin, _totalSupply);
    }

    function rebase(int256 supplyDelta) external onlyRole(REBASER_ROLE) whenNotPaused returns (uint256) {
        rebaseCount++;
        
        if (supplyDelta == 0) {
            emit LogRebase(rebaseCount, _totalSupply);
            return _totalSupply;
        }

        uint256 newTotalSupply;
        if (supplyDelta < 0) {
            uint256 deltaAbs = uint256(-supplyDelta);
            newTotalSupply = _totalSupply > deltaAbs ? _totalSupply - deltaAbs : 0;
        } else {
            uint256 deltaAbs = uint256(supplyDelta);
            newTotalSupply = _totalSupply + deltaAbs;
        }

        require(newTotalSupply <= MAX_SUPPLY, "Max supply exceeded");

        _totalSupply = newTotalSupply;
        _gonsPerFragment = TOTAL_GONS / _totalSupply;

        emit Rebase(rebaseCount, _totalSupply, uint256(supplyDelta > 0 ? supplyDelta : -supplyDelta), supplyDelta > 0);
        emit LogRebase(rebaseCount, _totalSupply);

        return _totalSupply;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _gonBalances[account] / _gonsPerFragment;
    }

    function scaledBalanceOf(address account) external view returns (uint256) {
        return _gonBalances[account];
    }

    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        uint256 gonAmount = amount * _gonsPerFragment;
        _gonBalances[msg.sender] -= gonAmount;
        _gonBalances[to] += gonAmount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        uint256 gonAmount = amount * _gonsPerFragment;
        
        if (_allowedFragments[from][msg.sender] != type(uint256).max) {
            _allowedFragments[from][msg.sender] -= amount;
        }

        _gonBalances[from] -= gonAmount;
        _gonBalances[to] += gonAmount;
        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _allowedFragments[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowedFragments[owner][spender];
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
