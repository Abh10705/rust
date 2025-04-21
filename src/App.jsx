import { WagmiProvider, useAccount, useConnect, useDisconnect, useWriteContract } from 'wagmi';
import { contractABI } from './abi.js';
import { useState } from 'react';

const contractAddress = '0x5821dc572072ace880fb032da8b2d6cd3312de58';

function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [betAmount, setBetAmount] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [choice, setChoice] = useState('Rock');
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState('');

  const getChoiceEnum = (choice) => {
    return { Rock: 0, Paper: 1, Scissors: 2 }[choice] ?? 0;
  };

  const handleCreateGame = async () => {
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
      setStatus('Please enter a valid bet amount in ETH.');
      return;
    }

    try {
      setStatus('Creating game...');
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'createGame',
        value: BigInt(parseFloat(betAmount) * 1e18),
      });

      const receipt = await tx.wait();
      const logs = receipt?.logs || [];

      const createEvent = logs.find(log =>
        log.topics[0] === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'
      );

      if (createEvent) {
        const newGameId = parseInt(createEvent.topics[1], 16);
        setGameId(newGameId);
        setStatus(`Game created with ID: ${newGameId}! Waiting for Player 2.`);
      } else {
        setStatus('Game created, but game ID not found in logs.');
      }
    } catch (err) {
      setStatus(`Error creating game: ${err.message}`);
    }
  };

  const handleJoinGame = async () => {
    if (!joinGameId || isNaN(joinGameId) || !betAmount || parseFloat(betAmount) <= 0) {
      setStatus('Please enter a valid game ID and bet amount.');
      return;
    }

    try {
      setStatus('Joining game...');
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'joinGame',
        args: [BigInt(joinGameId)],
        value: BigInt(parseFloat(betAmount) * 1e18),
      });
      await tx.wait();
      setStatus(`Joined game ${joinGameId}! Time to play.`);
    } catch (err) {
      setStatus(`Error joining game: ${err.message}`);
    }
  };

  const handlePlay = async () => {
    if (!gameId || isNaN(gameId)) {
      setStatus('Please enter a valid game ID.');
      return;
    }

    try {
      setStatus(`Playing ${choice} in game ${gameId}...`);
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: contractABI,
        functionName: 'play',
        args: [BigInt(gameId), getChoiceEnum(choice)],
      });
      await tx.wait();
      setStatus(`Played ${choice} in game ${gameId}! Waiting for result...`);
    } catch (err) {
      setStatus(`Error playing game: ${err.message}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rock Paper Scissors DApp</h1>

      {!isConnected ? (
        <button onClick={() => connect({ connector: connectors[0] })} className="bg-blue-500 text-white px-4 py-2 rounded mb-2">
          Connect Wallet
        </button>
      ) : (
        <>
          <button onClick={disconnect} className="bg-red-500 text-white px-4 py-2 rounded mb-2">
            Disconnect
          </button>
          <div>Connected: {address}</div>
        </>
      )}

      <input
        type="number"
        value={betAmount}
        onChange={(e) => setBetAmount(e.target.value)}
        placeholder="Bet Amount (ETH)"
        className="border p-2 mb-2 w-full"
      />
      <button onClick={handleCreateGame} className="bg-green-500 text-white px-4 py-2 rounded mb-2">
        Create Game
      </button>

      <input
        type="number"
        value={joinGameId}
        onChange={(e) => setJoinGameId(e.target.value)}
        placeholder="Game ID"
        className="border p-2 mb-2 w-full"
      />
      <button onClick={handleJoinGame} className="bg-yellow-500 text-white px-4 py-2 rounded mb-2">
        Join Game
      </button>

      <select value={choice} onChange={(e) => setChoice(e.target.value)} className="border p-2 mb-2 w-full">
        <option>Rock</option>
        <option>Paper</option>
        <option>Scissors</option>
      </select>
      <button onClick={handlePlay} className="bg-purple-500 text-white px-4 py-2 rounded mb-2">
        Play
      </button>

      <div>Game ID: {gameId}</div>
      <div className="mt-2">{status}</div>
    </div>
  );
}

export default App;
