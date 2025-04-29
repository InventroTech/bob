'use client'
import React, { useState, useEffect } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
const DonutPie = ({ attributes = [] }) => {
  const [mounted, setMounted] = useState(false);

  const seriesData = attributes.length > 0 ? attributes : [
    { id: 0, value: 10, label: 'series A' },
    { id: 1, value: 15, label: 'series B' },
    { id: 2, value: 20, label: 'series C' },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Don't render initially

  return (
    <div className='bg-white rounded-lg  flex items-center justify-center m-auto' style={{ width: '100px', height: '100px' ,paddingBottom: '0px' }}>
      <PieChart
        series={[
          {
            data: seriesData,
            innerRadius: 17,
            outerRadius: 37,
            paddingAngle: 1,
            cornerRadius: 2,
            startAngle: 0,
            endAngle: 360,
            cx: 40,
            cy: 40,
            label: {
              show: false,
              position: 'outside',
              fontSize: 12,
              fontWeight: 'bold',
              color: 'black',
            },
          }
        ]}
        legend={{
          position: 'right',
          hidden: true,
        }}
        
      />
    </div>
  );
}

export default DonutPie;
