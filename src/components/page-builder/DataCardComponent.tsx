'use client'
import React, { ReactNode } from 'react'
import DonutPie from '../ui/donoutPie'

interface DataCardComponentProps {
  children?: ReactNode;
}
const attributes=[
    {
        id:1,
        title: "Leads Table",
        number: "100",
        description: "Description",
        data: [
            { id: 0, value: 45, label: 'series A' },
            { id: 1, value: 25, label: 'series B' }
          ]
    },{
        id:2,
        title: "Leads Table",
        number: "100",
        description: "Description",
        data: [
            { id: 0, value: 10, label: 'series A' },
            { id: 1, value: 15, label: 'series B' }
          ]
    },{
        id:3,
        title: "Leads Table",
        number: "100",
        description: "Description",
        data: [
            { id: 0, value: 100, label: 'series A' },
            { id: 1, value: 67, label: 'series B' }
          ]
    }
]


export const DataCardComponent: React.FC<DataCardComponentProps> = ({ children }) => {
  return (
    <div className="cardlist grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6 w-full">
  {attributes.map((attribute) => (
    <div key={attribute.id} className='bg-white border-2 border-gray-200 shadow-sm rounded-lg p-4 pb-0 pr-0 flex flex-col '>
      <div className='flex flex-row gap-4 '>
        <h1 className=' font-bold'>{attribute.title}</h1>
        <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg" className='m-auto mr-4 font-bold'>
<path d="M5.5 12H19.5M19.5 12L12.5 5M19.5 12L12.5 19" stroke="#1E1E1E"  />
</svg>

      </div>
      <div className='flex '>
      <div className='flex flex-col gap-6 flex-1  justify-end m-auto'>
        <div className='text-2xl font-bold '>{attribute.number}</div>
        <p className='text-sm text-gray-500 justify-end'>{attribute.description}</p>
      </div>
      <div className="pie flex  gap-6 m-auto mr-0">
        <DonutPie attributes={attribute.data} />
      </div>
      </div>
    </div>
  ))}
</div>

  )
}


