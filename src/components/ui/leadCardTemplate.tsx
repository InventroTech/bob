'use client'
import React from 'react'
import InfoCards from './infoCard'
import TaskCard from './taskCard'
import Notes from './notes'

const LeadCardTemplate = ({attributes}: {attributes: any}) => {
  return (
    <div className='flex flex-col gap-2 w-[70%] p-4' >
    <div className='full-box  m-auto  top-12 left-12 rounded-sm p-2 flex  bg-gray-100 text-black w-full'>
        <div className="profile flex items-center p-4  gap-4 w-[50%] h-[100%]">
            <div className="image ">
                <img className="border h-24 w-24 rounded-lg" src={attributes.image} alt="profile" />
            </div>
            <div className="right-Details flex flex-col gap-2">
                <div className='flex gap-2'>
                <h1 className='text-2xl font-bold'>{attributes.name} </h1>
                
                </div>
                

                <div className=' gap-2 flex flex-col'>
                  <div className="inner flex gap-2 flex-row">
                  <h2 className='text-black '> {attributes.age} years</h2>
                  <h2 className='text-black '>📍 {attributes.address}</h2>
                  
                  </div>
                  <div className="partyTag max-w-[100px]  rounded-full item-fit font-bold flex flex-row items-center justify-center" style={{backgroundColor: attributes.partyColor}}>
                    <img src={attributes.flag} alt="flag" className="border-r-2 border-white rounded-full h-10 w-10 m-auto ml-0"/>
                    <span className='p-2 pl-0 m-auto mr-2' style={{color: attributes.textColor}}>{attributes.party}</span>
                  </div>
                  
                
                </div>
                
                {/* <h2 className='text-blue-500'>📧 {attributes.email}</h2>
                {attributes.other.map((item) => (
                  <div key={item.id} className='text-black font-semibold'>{item.key} : {item.value}</div>
                ))} */}
                
            </div>
        </div>
        <div className="right-icons  w-[50%] h-[100%] flex flex-col justify-end  items-end gap-4 p-4 ">
        
        <h2 className='text-[#7F56D9] hover:border-b-2 hover:border-[#FCFAFF] hover:bg-[#FCFAFF]'>📞 {attributes.phone}</h2>
        <h2 className='text-[#7F56D9] hover:border-b-2 hover:border-[#FCFAFF] hover:bg-[#FCFAFF]'>📧 {attributes.email}</h2>
        
        </div>
    </div>
    <InfoCards attributes={attributes.infoData} />
    <TaskCard attributes={attributes.taskData} />
    <Notes notes={attributes.notes} setNotes={() => {}} />
    </div>
  )
}

export default LeadCardTemplate
