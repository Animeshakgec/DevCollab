import React, { useState } from 'react';
import { FaUsers } from 'react-icons/fa';
import { IoMdChatbubbles  } from "react-icons/io";
import { FaPlay } from "react-icons/fa6";


const Sidebar = ({ onToggle }) => {
  const [activeTab, setActiveTab] = useState('clients');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    onToggle(tab);
  };

  return (
    
    <div className="h-screen w-16 bg-[#232329] text-white flex flex-col items-center py-4 border-r border-gray-700 shadow-lg">
      <div className="flex flex-col space-y-8">
      <button
          onClick={() => handleTabChange('clients')}
          className={`p-3 rounded-lg transition-all ${
            activeTab === 'clients'
              ? 'bg-[#393E46] text-white'
              : 'text-gray-400'
          }`}
        >
          <FaUsers size={24} />
        </button>
        <button
          onClick={() => handleTabChange('chat')}
          className={`p-3 rounded-lg transition-all ${
            activeTab === 'chat'
              ? 'bg-[#393E46] text-white'
              : 'text-gray-400'
          }`}
        >
          <IoMdChatbubbles size={24} />
        </button>
        <button
          onClick={() => handleTabChange('run')}
          className={`p-3 rounded-lg transition-all ${
            activeTab === 'run'
              ? 'bg-[#393E46] text-white'
              : 'text-gray-400'
          }`}
        >
          <FaPlay size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 