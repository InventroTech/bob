import InfoCards from '@/builder/templates/lead-card/infoCard';
import Notes from '@/builder/templates/lead-card/notes';
import TaskCard from '@/builder/templates/lead-card/taskCard';
import React, { ReactNode } from 'react';

interface LeadCardComponentProps {
  children?: ReactNode;
}
const attributes = {
    name: "Mamata Banerjee",
    age: "50",
    phone: "+91 9876543210",
    email: "pisimoni@tmc.chor",
    party: "TMC",
    partyColor: "green",
    textColor: "black",
    flag:"https://5.imimg.com/data5/SELLER/Default/2023/3/294646333/KS/CI/NV/14541723/tmc-indian-national-flag.jpg",
    address: "Kalighat, Kolkata",
    tag: "Lead",
    image: "https://www.hindustantimes.com/ht-img/img/2025/04/04/550x309/Mamata_Banerjee_1740645038692_1743754103685.jpg",
    infoData:[
      {
        id:1,
        title: "Last Connected",
        description: "10 days ago",
      }
    ],
    taskData:{
        title: "Task Details",
        tasks:[
          {
            id:1,
            title: "Veiw Poster Layout",
            description: "",
          },
          {
            id:2,
            title: "Package to pitch",
            description: ": Monthly",
          },
        ],
        description:"Prospect showed interest in trail activation."
      
      },
      notesData:{
        title: "Additional Notes",
      }
  }

export const LeadCardComponent: React.FC<LeadCardComponentProps> = ({ children }) => {
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
    <Notes attributes={attributes.notesData} />
    </div>
  );
}; 