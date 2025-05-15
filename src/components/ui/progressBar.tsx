import React, { useEffect, useState } from 'react'

interface ProgressBarProps {
    progress: number;
}

interface StyleData {
    width: string;
    color: string;
    title: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const [styleData, setStyleData] = useState<StyleData>({ width: '50%', color: 'bg-blue-500', title: 'Demo Bar' });

    useEffect(() => {
        const fetchStyleData = async () => {
            try {
                const email = localStorage.getItem('email');
                const response = await fetch('demourl', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'email': email || ''
                    }
                });
                
                if (!response.ok) {
                    //throw new Error('Failed to fetch style data');
                    setStyleData({ width: '50%', color: 'bg-blue-500', title: 'Demo Bar' });
                }
                
                const data = await response.json();
                setStyleData(data);
            } catch (error) {
                console.error('Error fetching style data:', error);
            }
        };

        fetchStyleData();
    }, []);
    
    return (
        <div>
            <div className="flex flex-col gap-2 items-center justify-between"> 
                <h1 className="text-sm font-semibold">{styleData.title}</h1>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className={`h-full ${styleData.color} rounded-full`} 
                         style={{ width: styleData.width }}></div>
                </div>

            </div>
        </div>
    )
}


