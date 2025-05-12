import React, { useState } from 'react';

interface DropdownProps {
  title: string;
  menu: string[];
}

const Dropdown: React.FC<DropdownProps> = ({ title, menu }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('None');

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (status: string) => {
    setSelectedStatus(status);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block w-full">
      {/* Title and selected status */}
      <div
        className="flex items-center justify-left p-2  gap-2 cursor-pointer"
        onClick={toggleDropdown}
      >
        <span className="font-semibold">{title}:</span>
        <span className="text-gray-700 border border-gray-300 rounded-md p-2 flex flex-row gap-2 items-center">
            {selectedStatus} 
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 7.5L10 12.5L15 7.5" stroke="#344054" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
</span>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg m-auto">
          <ul className="space-y-2 p-2">
            {menu.map((item, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
