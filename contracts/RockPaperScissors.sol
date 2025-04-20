// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RockPaperScissors {
    enum Choice { None, Rock, Paper, Scissors }
    enum Result { Tie, Player1Wins, Player2Wins }
    struct Game {
        address player1;
        address player2;
        Choice player1Choice;
        Choice player2Choice;
        uint256 betAmount;
        bool isActive;
        uint256 startTime; // Added for timeout
    }

    mapping(uint256 => Game) public games;
    uint256 public gameCounter;
    uint256 public timeoutDuration = 5 minutes; // Added timeout duration

    event GameCreated(uint256 gameId, address player1, uint256 betAmount);
    event GameJoined(uint256 gameId, address player2);
    event GameResult(uint256 gameId, Result result);
    event GameTimeout(uint256 gameId); // Add GameTimeout event
    event DebugLog(string message, uint256 value);
   
    function createGame() external payable returns (uint256) {
        require(msg.value > 0, "Bet amount must be greater than 0");
        gameCounter++;
        games[gameCounter] = Game({
            player1: msg.sender,
            player2: address(0),
            player1Choice: Choice.None,
            player2Choice: Choice.None,
            betAmount: msg.value,
            isActive: true,
            startTime: block.timestamp // Store start time
        });
        emit GameCreated(gameCounter, msg.sender, msg.value);
        return gameCounter;
    }

    function joinGame(uint256 gameId) external payable {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(game.player2 == address(0), "Game already has two players");
        require(msg.value == game.betAmount, "Incorrect bet amount");
        game.player2 = msg.sender;
        emit GameJoined(gameId, msg.sender);
    }

    function play(uint256 gameId, Choice choice) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(choice != Choice.None, "Invalid choice");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");

        if (msg.sender == game.player1) {
            require(game.player1Choice == Choice.None, "Player 1 already chose");
            game.player1Choice = choice;
        } else {
            require(game.player2Choice == Choice.None, "Player 2 already chose");
            game.player2Choice = choice;
        }

        if (game.player1Choice != Choice.None && game.player2Choice != Choice.None) {
            resolveGame(gameId);
        }
    }

    function resolveGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        Result result = determineWinner(game.player1Choice, game.player2Choice);
        uint256 totalPot = game.betAmount * 2;

        if (result == Result.Tie) {
            payable(game.player1).transfer(game.betAmount);
            payable(game.player2).transfer(game.betAmount);
        } else if (result == Result.Player1Wins) {
            payable(game.player1).transfer(totalPot);
        } else {
            payable(game.player2).transfer(totalPot);
        }

        game.isActive = false;
        emit GameResult(gameId, result);
    }

    function determineWinner(Choice c1, Choice c2) internal pure returns (Result) {
        if (c1 == c2) return Result.Tie;
        if (c1 == Choice.Rock && c2 == Choice.Scissors) return Result.Player1Wins;
        if (c1 == Choice.Paper && c2 == Choice.Rock) return Result.Player1Wins;
        if (c1 == Choice.Scissors && c2 == Choice.Paper) return Result.Player1Wins;
        return Result.Player2Wins;
    }

    function handleTimeout(uint256 gameId) external {
        Game storage game = games[gameId];
        require(game.isActive, "Game is not active");
        require(block.timestamp >= game.startTime + timeoutDuration, "Game not timed out yet");
        require(game.player2 == address(0), "Player 2 already joined.  Can't timeout.");

        // Refund player1
        payable(game.player1).transfer(game.betAmount);
        game.isActive = false; // Set game to inactive
        emit GameTimeout(gameId); // Emit the timeout event
    }
}
