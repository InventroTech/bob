import React from 'react'

const Requirements = ({attributes}: {attributes: any}) => {
  return (
    <div className='flex flex-col gap-2'>
      <h3>Requirements</h3>
      <p className='text-sm border rounded-md p-2 bg-[#F8F9FC] text-black'>{attributes}</p>
    </div>
  )
}

export default Requirements
