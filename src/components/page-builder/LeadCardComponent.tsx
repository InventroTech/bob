import InfoCards from '@/components/ui/infoCard';
import Notes from '@/components/ui/notes';
import TaskCard from '@/components/ui/taskCard';
import React, { ReactNode, useEffect, useState } from 'react';
import Dropdown from '../ui/dropdown';
import Requirements from '../ui/Requirements';
import FileUploadForm from '../ui/FileUploadForm';
interface LeadCardComponentProps {
  attributes: any;
  status: string;
  setStatus: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
}

export const demoMenuItems = [
  {
    id: 1,
    color: 'bg-green-500',
    value: 'Fresh_lead'
  },
  {
    id: 2,
    color: 'bg-yellow-500',
    value: 'Pending_layout_collection'
  },
  {
    id: 3,
    color: 'bg-blue-500',
    value: 'Pending_layout_setup'
  },
  {
    id: 4,
    color: 'bg-purple-500',
    value: 'Pending_feedback_collection'
  },
  {
    id: 5,
    color: 'bg-red-500',
    value: 'Trial_subscribed'
  },
  {
    id: 6,
    color: 'bg-gray-500',
    value: 'Inactive'
  },
];

export const LeadCardComponent: React.FC<LeadCardComponentProps> = ({ attributes = [], status, setStatus, notes, setNotes }) => {
  const [role, setRole] = useState<string>('');
  // const fetchRole = async () => {
  //   const userEmail=localStorage.getItem('user_email') || 'demo.rm@gmail.com';
  //   const response = await fetch(`https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/get-role?email=${userEmail}`);
  //   const data = await response.json();
  //   setRole(data.role);
  // }
  useEffect(() => {
    console.log("Attributes", attributes);
    setNotes(attributes.notes);
    setStatus(attributes.status);
    //fetchRole()
  }, [attributes]);
  return (
    <div className='flex flex-col gap-2 w-[100%] p-4' >
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
    {<Requirements attributes={attributes.notes} />}
    { <Notes notes={notes} setNotes={setNotes} />}
    <FileUploadForm leadId={attributes.id} leadName={attributes.name} />
    <Dropdown title="Status" menu={demoMenuItems} selected={status} onSelect={setStatus} />
    
    </div>
  );
}; 