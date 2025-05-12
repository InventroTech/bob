'use client';

import { useState } from "react";
import { LeadCardComponent } from "../page-builder/LeadCardComponent";
interface LeadCarouselComponentProps {
  children: React.ReactNode;
}
const attributes = [
  {
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

export const LeadCarousel: React.FC<LeadCarouselComponentProps> = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % attributes.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + attributes.length) % attributes.length);
  };

  return (
    <div className="relative w-[100%] h-[100%]">
      <div className="relative h-full overflow-hidden rounded-xl">
        {/* Add transition classes */}
        <div className="transition-all duration-500 ease-in-out opacity-100 flex flex-col justify-between border rounded-xl bg-white">
          <LeadCardComponent attributes={attributes[currentIndex]} />
          <div className="buttons m-auto mr-0 flex gap-4 p-4">
            <button onClick={prevSlide} className="bg-gray-200 text-black px-4 py-2 rounded-md ">Previous</button>
            <button onClick={nextSlide} className="bg-[#7F56D9] text-white px-4 py-2 rounded-md ">Save & Continue</button>  
        </div>
        </div>
      </div>
      

      {/* Navigation buttons */}
      {/* <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
      >
        ←
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
      >
        →
      </button> */}
    </div>
  );
}
