// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PredictNaijaManager {
    address public owner;

    struct Market {
        uint256 id;
        string question;
        string[] outcomes;
        uint256[] totalStakesPerOutcome;
        uint256 totalPool;
        uint256 resolutionTime;
        string category;
        bool resolved;
        uint256 winningOutcomeIndex;
    }

    // List of all markets
    Market[] public markets;

    // marketId => userAddress => outcomeIndex => stakeAmount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userBets;
    // marketId => userAddress => totalStaked
    mapping(uint256 => mapping(address => uint256)) public userTotalStakes;
    // marketId => userAddress => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    // Leaderboard tracking
    address[] public uniqueBettors;
    mapping(address => bool) public isUniqueBettor;
    mapping(address => uint256) public userWinsCount;
    mapping(address => uint256) public userTotalEarnings;

    // Events
    event MarketCreated(
        uint256 indexed id,
        string question,
        string[] outcomes,
        uint256 resolutionTime,
        string category
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        uint256 indexed outcomeIndex,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint256 winningOutcomeIndex
    );
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    // Create a new prediction market
    function createMarket(
        string calldata _question,
        string[] calldata _outcomes,
        uint256 _resolutionTime,
        string calldata _category
    ) external onlyOwner returns (uint256) {
        require(_outcomes.length >= 2, "Must have at least 2 outcomes");
        require(_resolutionTime > block.timestamp, "Resolution time must be in the future");

        uint256 marketId = markets.length;
        
        // Initialize stakes array
        uint256[] memory initialStakes = new uint256[](_outcomes.length);

        markets.push(Market({
            id: marketId,
            question: _question,
            outcomes: _outcomes,
            totalStakesPerOutcome: initialStakes,
            totalPool: 0,
            resolutionTime: _resolutionTime,
            category: _category,
            resolved: false,
            winningOutcomeIndex: 0
        }));

        emit MarketCreated(marketId, _question, _outcomes, _resolutionTime, _category);
        return marketId;
    }

    // Place a bet on a specific outcome
    function placeBet(uint256 _marketId, uint256 _outcomeIndex) external payable {
        require(_marketId < markets.length, "Market does not exist");
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market is already resolved");
        require(block.timestamp < market.resolutionTime, "Market is closed for betting");
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(_outcomeIndex < market.outcomes.length, "Invalid outcome index");

        // Record bet
        userBets[_marketId][msg.sender][_outcomeIndex] += msg.value;
        userTotalStakes[_marketId][msg.sender] += msg.value;
        
        // Update market pool
        market.totalStakesPerOutcome[_outcomeIndex] += msg.value;
        market.totalPool += msg.value;

        // Record unique bettor for leaderboard
        if (!isUniqueBettor[msg.sender]) {
            isUniqueBettor[msg.sender] = true;
            uniqueBettors.push(msg.sender);
        }

        emit BetPlaced(_marketId, msg.sender, _outcomeIndex, msg.value);
    }

    // Resolve a market (Admin only)
    function resolveMarket(uint256 _marketId, uint256 _winningOutcomeIndex) external onlyOwner {
        require(_marketId < markets.length, "Market does not exist");
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market is already resolved");
        require(_winningOutcomeIndex < market.outcomes.length, "Invalid outcome index");

        market.resolved = true;
        market.winningOutcomeIndex = _winningOutcomeIndex;

        emit MarketResolved(_marketId, _winningOutcomeIndex);
    }

    // Claim winnings for a resolved market
    function claimWinnings(uint256 _marketId) external {
        require(_marketId < markets.length, "Market does not exist");
        Market storage market = markets[_marketId];
        require(market.resolved, "Market is not resolved yet");
        require(!claimed[_marketId][msg.sender], "Winnings already claimed");

        uint256 userBet = userBets[_marketId][msg.sender][market.winningOutcomeIndex];
        require(userBet > 0, "You did not bet on the winning outcome");

        uint256 winningPool = market.totalStakesPerOutcome[market.winningOutcomeIndex];
        require(winningPool > 0, "Invalid winning pool");

        // Calculate payout: (User's Winning Stake * Total Pool) / Total Winning Stake
        uint256 payout = (userBet * market.totalPool) / winningPool;
        
        claimed[_marketId][msg.sender] = true;

        // Update leaderboard stats
        userWinsCount[msg.sender] += 1;
        userTotalEarnings[msg.sender] += payout;

        // Send payout
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Payout transfer failed");

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    // Get outcomes of a market
    function getOutcomes(uint256 _marketId) external view returns (string[] memory) {
        require(_marketId < markets.length, "Market does not exist");
        return markets[_marketId].outcomes;
    }

    // Get total stakes per outcome
    function getTotalStakesPerOutcome(uint256 _marketId) external view returns (uint256[] memory) {
        require(_marketId < markets.length, "Market does not exist");
        return markets[_marketId].totalStakesPerOutcome;
    }

    // Get details for all markets
    function getMarkets() external view returns (Market[] memory) {
        return markets;
    }

    // Helper to get total market count
    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    // Helper to get all bettors for leaderboard sorting
    function getUniqueBettors() external view returns (address[] memory) {
        return uniqueBettors;
    }

    // Fallback/Receive to accept ETH
    receive() external payable {}
}
