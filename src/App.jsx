import { useState } from 'react';
import { configureChains, createConfig, WagmiConfig, useAccount, useConnect, useDisconnect, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { injected } from 'wagmi';
import { contractABI } from './abi';

const { chains, publicClient } = configureChains([sepolia], [createPublicClient({ chain: sepolia, transport: http() })]);
const config = createConfig({
  autoConnect: true,
  connectors: [injected({ chains })],
  publicClient,
});

const contractAddress = '0x5821dc572072ace880fb032da8b2d6cd3312de58'; // Assuming correct

function App() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [betAmount, setBetAmount] = useState('');
  const [joinGameId, setJoinGameId] = useState('');
  const [choice, setChoice] = useState('Rock');
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState('');

  // Prepare createGame
  const { config: createGameConfig } = usePrepareContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'createGame',
    value: betAmount ? BigInt(betAmount * 10 ** 18) : undefined,
  });
  const { write: createGame, isLoading: createLoading, error: createError } = useContractWrite(createGameConfig);

  // Prepare joinGame
  const { config: joinGameConfig } = usePrepareContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'joinGame',
    value: betAmount ? BigInt(betAmount * 10 ** 18) : undefined,
    args: [joinGameId ? BigInt(joinGameId) : undefined],
    enabled: !!joinGameId && !!betAmount,
  });
  const { write: joinGame, isLoading: joinLoading, error: joinError } = useContractWrite(joinGameConfig);

  // Prepare play
  const getChoiceEnum = (choice) => {
    if (choice === 'Rock') return 0;
    if (choice === 'Paper') return 1;
    if (choice === 'Scissors') return 2;
    return 0;
  };
  const { config: playConfig } = usePrepareContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'play',
    args: [gameId ? BigInt(gameId) : undefined, getChoiceEnum(choice)],
    enabled: !!gameId,
  });
  const { write: play, isLoading: playLoading, error: playError } = useContractWrite(playConfig);

  const handleCreateGame = async () => {
    if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
      setStatus('Please enter a valid bet amount in ETH.');
      return;
    }
    try {
      const tx = await createGame();
      setStatus('Creating game...');
      const receipt = await tx.wait();
      const gameId = receipt.logs.find(log => log.topics[0] === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925').topics[1];
      setGameId(gameId);
      setStatus(`Game created with ID: ${gameId}! Waiting for Player 2.`);
    } catch (err) {
      setStatus(`Error creating game: ${err.message}`);
    }
  };

  const handleJoinGame = async () => {
    if (!joinGameId || isNaN(joinGameId) || !betAmount || isNaN(betAmount) || betAmount <= 0) {
      setStatus('Please enter a valid game ID and bet amount.');
      return;
    }
    try {
      const tx = await joinGame();
      setStatus('Joining game...');
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
      const tx = await play();
      setStatus(`Playing ${choice} in game ${gameId}...`);
      await tx.wait();
      setStatus(`Played ${choice} in game ${gameId}! Waiting for result...`);
    } catch (err) {
      setStatus(`Error playing game: ${err.message}`);
    }
  };

  return (
    <WagmiConfig config={config}>
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Rock Paper Scissors DApp</h1>
        <div>
          {!isConnected ? (
            <button onClick={() => connect({ connector: connectors[0] })} className="bg-blue-500 text-white px-4 py-2 rounded mb-2">
              Connect Wallet
            </button>
          ) : (
            <>
              <button onClick={() => disconnect()} className="bg-red-500 text-white px-4 py-2 rounded mb-2">
                Disconnect
              </button>
              <div>Connected: {address}</div>
            </>
          )}
        </div>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          placeholder="Bet Amount (ETH)"
          className="border p-2 mb-2 w-full"
          disabled={!isConnected || createLoading || joinLoading}
        />
        <button onClick={handleCreateGame} className="bg-green-500 text-white px-4 py-2 rounded mb-2" disabled={!isConnected || createLoading}>
          Create Game
        </button>
        <input
          type="number"
          value={joinGameId}
          onChange={(e) => setJoinGameId(e.target.value)}
          placeholder="Game ID"
          className="border p-2 mb-2 w-full"
          disabled={!isConnected || joinLoading}
        />
        <button onClick={handleJoinGame} className="bg-yellow-500 text-white px-4 py-2 rounded mb-2" disabled={!isConnected || joinLoading}>
          Join Game
        </button>
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className="border p-2 mb-2 w-full" disabled={!isConnected || playLoading}>
          <option>Rock</option>
          <option>Paper</option>
          <option>Scissors</option>
        </select>
        <button onClick={handlePlay} className="bg-red-500 text-white px-4 py-2 rounded mb-2" disabled={!isConnected || playLoading}>
          Play
        </button>
        <div>Game ID: {gameId}</div>
        <div className="mt-2">{status}</div>
        {(createError || joinError || playError) && <div className="text-red-500">{(createError || joinError || playError).message}</div>}
      </div>
    </WagmiConfig>
  );
}

export default App;