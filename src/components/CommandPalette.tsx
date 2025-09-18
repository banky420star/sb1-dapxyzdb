import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowUp, ArrowDown, Check } from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  description: string;
  action: () => void;
  shortcut?: string;
  category: 'trading' | 'bot' | 'system';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  commands 
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(search.toLowerCase()) ||
    command.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl mx-4 bg-surface rounded-lg border border-gray-700 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center space-x-3 p-4 border-b border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={search}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Command className="w-4 h-4" />
              <span>K</span>
            </div>
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No commands found
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <motion.div
                  key={command.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    index === selectedIndex 
                      ? 'bg-primary/10 border-l-2 border-primary' 
                      : 'hover:bg-gray-800/50'
                  }`}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-300">
                        {command.category.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {command.title}
                      </div>
                      <div className="text-sm text-gray-400">
                        {command.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {command.shortcut && (
                      <div className="text-xs text-gray-500">
                        {command.shortcut}
                      </div>
                    )}
                    {index === selectedIndex && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette; 
