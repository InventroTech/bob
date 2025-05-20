import React, { useState } from 'react';

interface DropdownProps {
  title: string;
  menu: any[];
  selected: string;
  onSelect: (value: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ title, menu, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleSelect = (status: any) => {
    onSelect(status); // Call parent
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block w-full">
      <div
        className="flex items-center justify-left p-2 gap-2 cursor-pointer"
        onClick={toggleDropdown}
      >
        <span className="font-semibold">{title}:</span>
        <span className="text-gray-700 border border-gray-300 rounded-md p-2 flex flex-row gap-2 items-center">
          {selected || 'None'}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="#344054"
              strokeWidth="1.67"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div className="absolute w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-[40%]">
          <ul className="space-y-2 p-2">
            {menu.map((item, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(item.value)}
              >
                <div>{item.value}</div>
                
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
