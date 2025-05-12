'use client';

import { useState } from "react";
import { LeadCardComponent } from "../page-builder/LeadCardComponent";
import axios from "axios"; // assuming axios for API call

const attributes = [
    {
        id: 1,
      name: "Mahesh",
      age: "50",
      phone: "+91 9876543210",
      email: "pisimoni@tmc.chor",
      party: "TMC",
      partyColor: "green",
      textColor: "black",
      flag:
        "https://5.imimg.com/data5/SELLER/Default/2023/3/294646333/KS/CI/NV/14541723/tmc-indian-national-flag.jpg",
      address: "Kalighat, Kolkata",
      tag: "Lead",
      image:
        "https://www.hindustantimes.com/ht-img/img/2025/04/04/550x309/Mamata_Banerjee_1740645038692_1743754103685.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "10 days ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "View Poster Layout",
            description: "",
          },
          {
            id: 2,
            title: "Package to pitch",
            description: ": Monthly",
          },
        ],
        description: "Prospect showed interest in trail activation.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 2,
      name: "Mamata",
      age: "50",
      phone: "+91 9876543210",
      email: "pisimoni@tmc.chor",
      party: "TMC",
      partyColor: "green",
      textColor: "black",
      flag:
        "https://5.imimg.com/data5/SELLER/Default/2023/3/294646333/KS/CI/NV/14541723/tmc-indian-national-flag.jpg",
      address: "Kalighat, Kolkata",
      tag: "Lead",
      image:
        "https://www.hindustantimes.com/ht-img/img/2025/04/04/550x309/Mamata_Banerjee_1740645038692_1743754103685.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "10 days ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "View Poster Layout",
            description: "",
          },
          {
            id: 2,
            title: "Package to pitch",
            description: ": Monthly",
          },
        ],
        description: "Prospect showed interest in trail activation.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 3,
      name: "Banerjee",
      age: "50",
      phone: "+91 9876543210",
      email: "pisimoni@tmc.chor",
      party: "BJP",
      partyColor: "saffron",
      textColor: "white",
      flag:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Flag_of_India.svg/2560px-Flag_of_India.svg.png",
      address: "Delhi",
      tag: "Lead",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/PM_Narendra_Modi.jpg/1200px-PM_Narendra_Modi.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "2 days ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "Review Policies",
            description: "",
          },
          {
            id: 2,
            title: "Attend Campaign",
            description: ": Weekly",
          },
        ],
        description: "Prospect is interested in a collaboration.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 4,
      name: "Amit",
      age: "45",
      phone: "+91 9823456789",
      email: "amit@bjp.org",
      party: "BJP",
      partyColor: "saffron",
      textColor: "white",
      flag:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Flag_of_India.svg/2560px-Flag_of_India.svg.png",
      address: "Mumbai",
      tag: "Lead",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Amit_Shah_2018.jpg/800px-Amit_Shah_2018.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "5 days ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "Campaign Speech",
            description: "",
          },
          {
            id: 2,
            title: "Schedule Meeting",
            description: ": Monthly",
          },
        ],
        description: "Needs to prepare for a campaign speech.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 5,
      name: "Priya",
      age: "32",
      phone: "+91 9812345678",
      email: "priya@congress.org",
      party: "Congress",
      partyColor: "blue",
      textColor: "white",
      flag:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Flag_of_India_(1947–1950).svg/2560px-Flag_of_India_(1947–1950).svg.png",
      address: "Chennai",
      tag: "Lead",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/7/7f/Indira_Gandhi_in_1966.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "3 weeks ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "Speech Preparation",
            description: "",
          },
          {
            id: 2,
            title: "Organize Rally",
            description: ": Bi-weekly",
          },
        ],
        description: "Working on the upcoming rally event.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 6,
      name: "Rani",
      age: "38",
      phone: "+91 9812345670",
      email: "rani@aap.org",
      party: "AAP",
      partyColor: "green",
      textColor: "white",
      flag:
        "https://upload.wikimedia.org/wikipedia/commons/e/ec/Flag_of_India_2014.svg",
      address: "Delhi",
      tag: "Lead",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Arvind_Kejriwal.jpg/800px-Arvind_Kejriwal.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "1 week ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "Community Outreach",
            description: "",
          },
          {
            id: 2,
            title: "Media Interaction",
            description: ": Weekly",
          },
        ],
        description: "Engaged with community members.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
    {
        id: 7,
      name: "Geeta",
      age: "29",
      phone: "+91 9876543212",
      email: "geeta@bsp.org",
      party: "BSP",
      partyColor: "blue",
      textColor: "white",
      flag:
        "https://upload.wikimedia.org/wikipedia/commons/2/2f/BSP_logo.png",
      address: "Lucknow",
      tag: "Lead",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/0/07/Mayawati_%28cropped%29.jpg",
      infoData: [
        {
          id: 1,
          title: "Last Connected",
          description: "4 days ago",
        },
      ],
      taskData: {
        title: "Task Details",
        tasks: [
          {
            id: 1,
            title: "Rally Planning",
            description: "",
          },
          {
            id: 2,
            title: "Volunteer Coordination",
            description: ": Bi-weekly",
          },
        ],
        description: "Needs to finalize rally details.",
      },
      notesData: {
        title: "Additional Notes",
      },
    },
  ];
export const LeadCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState("None");
  const [notes, setNotes] = useState("");

  const currentLead = attributes[currentIndex];

  const nextSlide = async () => {
    setCurrentIndex((prev) => (prev + 1) % attributes.length);
    setStatus("None");
    setNotes("");
  };
  const handleSubmit = async () => {
    const payload = {
      id: attributes[currentIndex].id, // you need to have an id
      notes,
      status,
    };
    try {
      const res = await fetch('/lead/edit', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (res.ok) {
        console.log('Lead updated');
        nextSlide(); // move to next card
      } else {
        console.error('Update failed');
      }
    } catch (err) {
      console.error('Network error', err);
    }
  };
  

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + attributes.length) % attributes.length);
  };

  return (
    <div className="relative w-full h-full">
      <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white">
        <LeadCardComponent
          attributes={currentLead}
          status={status}
          setStatus={setStatus}
          notes={notes}
          setNotes={setNotes}
        />
        <div className="buttons m-auto mr-0 flex gap-4 p-4">
          <button onClick={prevSlide} className="bg-gray-200 text-black px-4 py-2 rounded-md">Previous</button>
          <button onClick={handleSubmit} className="bg-[#7F56D9] text-white px-4 py-2 rounded-md">Save & Continue</button>
        </div>
      </div>
    </div>
  );
};
