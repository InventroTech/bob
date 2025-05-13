'use client'
import React, { useState, useEffect } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';

const DonutPie = ({ attributes = [] }) => {
  const [mounted, setMounted] = useState(false);

  const seriesData = attributes.length > 0 ? attributes : [
    { id: 0, value: 10, label: 'Series A' },
    { id: 1, value: 15, label: 'Series B' },
    { id: 2, value: 20, label: 'Series C' },
  ];
  const sizing = {
    width: 200,
    height: 200,
    hideLegend: true,
  };
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="bg-white rounded-lg flex items-center justify-center m-auto"
      style={{ width: '100px', height: '100px' }}
    >
      <PieChart
        
        series={[
          {
            data: seriesData,
            innerRadius: 20,
            outerRadius: 40,
            paddingAngle: 1,
            cornerRadius: 2,
            highlightScope: { faded: 'global', highlighted: 'item' },
            faded: { additionalRadius: -5, color: 'gray' },
            // 👇 no permanent labels
            label: { visible: false },
          },
        ]}
        {...sizing}
        
      />
    </div>
  );
};

export default DonutPie;
