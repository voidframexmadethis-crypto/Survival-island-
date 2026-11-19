'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Sparkles,
  Command,
  Sun,
  CloudRain,
  Shield,
  Trash2,
  Cpu,
  Compass,
  X,
} from 'lucide-react';

interface CommandConsoleModalProps {
  onClose: () => void;
  onExecuteCommand: (cmd: string) => void;
  onSpawnCreatorRelic: (relicKey: string) => void;
}

export const CommandConsoleModal: React.FC<CommandConsoleModalProps> = ({
  onClose,
  onExecuteCommand,
  onSpawnCreatorRelic,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState<'console' | 'relics'>('console');
  const [commandHistory, setCommandHistory] = useState<string[]>([
    'System initialized. Welcome to Survival Island: Lost World Creator Console.',
    'Type /help or tap autocomplete chips below.',
  ]);

  const quickCommands = [
    '/fly',
    '/tp dragon valley',
    '/tp viking village',
    '/tp resort corner',
    '/tp ruined castle',
    '/tp desert',
    '/tp cherry grove',
    '/tp ice spikes',
    '/god',
    '/warp space',
    '/warp nether',
    '/warp gold',
    '/warp diamond',
    '/warp alien',
    '/warp overworld',
    '/spawn portal_gun',
    '/spawn plasma_gun',
    '/spawn crystal_armor',
    '/weather clear',
    '/weather monsoon',
    '/weather fog',
    '/weather meteor',
    '/time dawn',
    '/time midday',
    '/time night',
    '/time bloodmoon',
    '/spawn raptor',
    '/spawn trex',
    '/spawn spinosaurus',
    '/spawn airship',
    '/spawn gun',
    '/gravity 9.8',
    '/gravity 3.0',
    '/erosion 2.0',
    '/tame',
    '/mount',
    '/clear',
  ];

  const creatorRelics = [
    { key: 'portal_gun', name: 'Dimensional Portal Gun', desc: 'Sci-fi spatial portal gun with multi-dimension vortexes' },
    { key: 'plasma_gun', name: 'Alien Plasma Rifle', desc: 'High-energy beam weapon with blue plasma ignition' },
    { key: 'crystal_armor', name: 'Crystal Energy Armor', desc: 'Prismatic defense shield with 150 energy buffer' },
    { key: 'gravity_monolith', name: 'Vortex Gravity Monolith', desc: 'Anti-gravity launch zone & enemy puller' },
    { key: 'terraformer_orb', name: 'Terraformer Orb', desc: 'Raises terrain or carves water craters' },
    { key: 'kinetic_trap', name: 'Kinetic Tripwire Trap', desc: 'Connected energy tether to spike wall' },
    { key: 'timeshift_sundial', name: 'Time-Shift Sundial Altar', desc: 'Scrubs sun/moon across sky' },
    { key: 'tamed_raptor', name: 'Saddled Mount Raptor', desc: 'Rideable mount with sprint & jump' },
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;
    const cmd = inputVal.trim();
    setCommandHistory((prev) => [...prev, `> ${cmd}`]);
    onExecuteCommand(cmd);
    setInputVal('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-amber-100">
                Sandbox &amp; Command Console
              </h2>
              <p className="text-xs text-stone-400">
                Next-generation developer powers &amp; Lost World creator relics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-950/50 px-6 pt-2 space-x-4">
          <button
            onClick={() => setActiveTab('console')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'console'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Command Line &amp; Chat
          </button>
          <button
            onClick={() => setActiveTab('relics')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === 'relics'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Creator Relic Menu
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {activeTab === 'console' ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Output Log */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Command History Log"
                className="flex-1 rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs text-stone-300 overflow-y-auto survival-scroll space-y-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {commandHistory.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.startsWith('>')
                        ? 'text-amber-400 font-semibold'
                        : line.startsWith('System')
                          ? 'text-sky-400'
                          : 'text-stone-300'
                    }
                  >
                    {line}
                  </div>
                ))}
              </div>

              {/* Autocomplete Chips */}
              <div className="flex flex-wrap gap-2">
                {quickCommands.map((qc) => (
                  <button
                    key={qc}
                    type="button"
                    onClick={() => {
                      setInputVal(qc);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-mono transition"
                  >
                    {qc}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type a command (e.g., /spawn raptor, /god, /weather clear)..."
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 text-sm font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm flex items-center space-x-2 transition shadow-lg shadow-amber-600/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Execute</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 survival-scroll pr-2">
              <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                Instant Creator Relic Spawner
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {creatorRelics.map((r) => (
                  <div
                    key={r.key}
                    onClick={() => {
                      onSpawnCreatorRelic(r.key);
                      onClose();
                    }}
                    className="cursor-pointer p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-stone-100 text-sm group-hover:text-amber-300 transition">
                          {r.name}
                        </h4>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-xs text-stone-400 leading-relaxed">{r.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-amber-400 font-semibold">
                      <span>Spawn at Crosshair</span>
                      <span>+ Tap</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
