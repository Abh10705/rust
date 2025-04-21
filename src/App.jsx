import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract , useChainId } from 'wagmi';
import { waitForTransaction } from 'wagmi/actions';
import { contractABI } from './abi.js';
import { useState } from 'react';
import { parseEther } from 'viem';

const contractAddress = '0x5821dc572072ace880fb032da8b2d6cd3312de58';

function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const { data: gameCounter, refetch: refetchGameCounter } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'gameCounter',
  });
  const chainId = useChainId();

  const [betAmount, setBetAmount] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [playGameId, setPlayGameId] = useState('');
  const [timeoutGameId, setTimeoutGameId] = useState('');
  const [choice, setChoice] = useState('Rock');
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState('');

  const getChoiceEnum = (choice) => {
    switch (choice) {
      case 'Rock': return 1; // In contract Rock = 1
      case 'Paper': return 2; // In contract Paper = 2
      case 'Scissors': return 3; // In contract Scissors = 3
      default: return 0; // None = 0
    }
  };

  const handleCreateGame = async () => {
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
      setStatus('Please enter a valid bet amount in ETH.');
      return;
    }
  
    try {
      setStatus('Creating game...');
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'createGame',
        value: BigInt(parseFloat(betAmount) * 1e18),
      });
  
      setStatus('Transaction submitted, waiting for confirmation...');
      await waitForTransaction({ hash });
  
      const { data: updatedGameCounter } = await refetchGameCounter();
      const newGameId = Number(updatedGameCounter);
      setGameId(newGameId);
      setPlayGameId(newGameId.toString());
      setStatus(`Game created with ID: ${newGameId}! Waiting for Player 2.`);
    } catch (err) {
      setStatus(`Error creating game: ${err.message}`);
      console.error("Full error:", err);
    }
  };
  

  const handleJoinGame = async () => {
    if (!joinGameId || isNaN(joinGameId)) {
      setStatus('Please enter a valid game ID.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'joinGame',
        args: [BigInt(joinGameId)], // <-- this line
        value: parseEther(betAmount), // <-- better than BigInt
    });
    
      
     
      
      setStatus('Transaction submitted, waiting for confirmation...');
      await waitForTransaction({ hash });

      
      setGameId(joinGameId);
      setPlayGameId(joinGameId);
      setStatus(`Joined game ${joinGameId}! Time to play.`);
    } catch (err) {
      setStatus(`Error joining game: ${err.message}`);
      console.error("Full error:", err);
    }
  };

  const handlePlay = async () => {
    if (!playGameId || isNaN(playGameId)) {
      setStatus('Please enter a valid game ID.');
      return;
    }

    try {
      setStatus(`Playing ${choice} in game ${playGameId}...`);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'play',
        args: [BigInt(playGameId), getChoiceEnum(choice)],
      });
      
      setStatus('Transaction submitted, waiting for confirmation...');
      await waitForTransaction({ hash });

      
      setStatus(`Played ${choice} in game ${playGameId}! Waiting for opponent's move or result...`);
    } catch (err) {
      setStatus(`Error playing game: ${err.message}`);
      console.error("Full error:", err);
    }
  };

  const handleTimeout = async () => {
    if (!timeoutGameId || isNaN(timeoutGameId)) {
      setStatus('Please enter a valid game ID to check for timeout.');
      return;
    }

    try {
      setStatus(`Checking timeout for game ${timeoutGameId}...`);
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'handleTimeout',
        args: [BigInt(timeoutGameId)],
      });
      
      setStatus('Transaction submitted, waiting for confirmation...');
      await waitForTransaction({ hash });

      
      setStatus(`Game ${timeoutGameId} has been timed out and refunded.`);
    } catch (err) {
      setStatus(`Error handling timeout: ${err.message}`);
      console.error("Full error:", err);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rock Paper Scissors DApp</h1>

      {!isConnected ? (
        <button onClick={() => connect({ connector: connectors[0] })} className="bg-blue-500 text-white px-4 py-2 rounded mb-4 w-full">
          Connect Wallet
        </button>
      ) : (
        <div className="mb-4">
          <div className="mb-2">Connected: {address}</div>
          <button onClick={disconnect} className="bg-red-500 text-white px-4 py-2 rounded w-full">
            Disconnect
          </button>
        </div>
      )}

      <div className="border p-4 rounded mb-4">
        <h2 className="text-xl font-bold mb-2">Create Game</h2>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          placeholder="Bet Amount (ETH)"
          className="border p-2 mb-2 w-full"
        />
        <button onClick={handleCreateGame} className="bg-green-500 text-white px-4 py-2 rounded w-full">
          Create Game
        </button>
        {gameCounter && (
          <div className="mt-2 text-sm text-gray-600">
            Current Game Counter: {Number(gameCounter)}
          </div>
        )}
      </div>

      <div className="border p-4 rounded mb-4">
        <h2 className="text-xl font-bold mb-2">Join Game</h2>
        <input
          type="number"
          value={joinGameId}
          onChange={(e) => setJoinGameId(e.target.value)}
          placeholder="Game ID"
          className="border p-2 mb-2 w-full"
        />
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          placeholder="Bet Amount (ETH)"
          className="border p-2 mb-2 w-full"
        />
        <button onClick={handleJoinGame} className="bg-yellow-500 text-white px-4 py-2 rounded w-full">
          Join Game
        </button>
      </div>

      <div className="border p-4 rounded mb-4">
        <h2 className="text-xl font-bold mb-2">Play Game</h2>
        <input
          type="number"
          value={playGameId}
          onChange={(e) => setPlayGameId(e.target.value)}
          placeholder="Game ID"
          className="border p-2 mb-2 w-full"
        />
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className="border p-2 mb-2 w-full">
          <option>Rock</option>
          <option>Paper</option>
          <option>Scissors</option>
        </select>
        <button onClick={handlePlay} className="bg-purple-500 text-white px-4 py-2 rounded w-full">
          Play
        </button>
      </div>

      <div className="border p-4 rounded mb-4">
        <h2 className="text-xl font-bold mb-2">Handle Timeout</h2>
        <input
          type="number"
          value={timeoutGameId}
          onChange={(e) => setTimeoutGameId(e.target.value)}
          placeholder="Game ID"
          className="border p-2 mb-2 w-full"
        />
        <button onClick={handleTimeout} className="bg-orange-500 text-white px-4 py-2 rounded w-full">
          Handle Timeout
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded">
        <div><strong>Current Game ID:</strong> {gameId}</div>
        <div className="mt-2"><strong>Status:</strong> {status}</div>
      </div>
    </div>
  );
}

export default App;