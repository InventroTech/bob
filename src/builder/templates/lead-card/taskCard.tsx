'use client'
import React, { useEffect } from 'react'

const TaskCard = ({attributes}) => {
    
  return (
    <div>
      <div className="flex flex-col gap-4 bg-[#FCFAFF] p-4 rounded-lg">
        <div className="flex flex-col gap-2">
            <h1 className="text-md font-semibold">{attributes.title}</h1>
            {attributes.tasks.map((item) => (  

                <div key={item.id} className='flex flex-row gap-2'>
                  <h2 className='text-sm '>📝 {item.title}</h2>
                  <p className='text-sm font-semibold'> {item.description}</p>
                  </div>
            ))}
        </div>
        <p className='text-sm font-semibold text-[#53389E]'>{attributes.description}</p>
      </div>
    </div>
  )
}

export default TaskCard
