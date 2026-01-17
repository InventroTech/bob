import React, { useEffect, useState } from 'react'

interface ProgressBarProps {
    progress: number;
}

interface StyleData {
    width: string;
    color: string;
    title: string;
    info: string;
    number: number;
    total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
    const [styleData, setStyleData] = useState<StyleData>({ width: '50%', color: 'bg-blue-500', title: 'Demo Bar', info: 'Demo Info', number: 0, total: 100 });

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
                    setStyleData({ width: '50%', color: 'bg-blue-500', title: 'Demo Bar', info: 'Demo Info', number: 0, total: 100 });
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
                <h3 className="text-sm font-semibold">{styleData.info}</h3>
                <div className="bottom flex flex-row gap-2 w-full justify-center items-center">
                <h3 className="text-sm font-semibold">{styleData.title}</h3>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className={`h-full ${styleData.color} rounded-full`} 
                         style={{ width: styleData.width }}></div>
                </div>
                <h3 className="text-sm font-semibold bg-gray-200 rounded-full p-2">{styleData.number}/{styleData.total}</h3>
                </div>
                

            </div>
        </div>
    )
}


