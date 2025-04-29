'use client';
import React, { ReactNode, useState } from 'react';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';

interface LeadTableComponentProps {
    children?: ReactNode;
  }

const attributes = {
    title: "Leads Table",
    columns:[
            { header: 'Name', accessor: 'name',type:"text" },
            { header: 'Party', accessor: 'party',type:"text" },
            { header: 'Last Connected', accessor: 'lastConnected',type:"text" },
            { header: 'Information', accessor: 'information',type:"text" },
            { header: 'Lead Status', accessor: 'leadStatus',type:"chip" },
            { header: 'Phone Number', accessor: 'phoneNumber',type:"text" },
    ],
    
    data:[
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://images.assettype.com/nationalherald/2024-08-12/hrgiqut5/STOCK_PTI7_12_2023_0412.jpg', name: 'Mamata Banerjee', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'TMC', type: 'chip',color:"green" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Completed', type: 'status' ,color:"success"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://www.livemint.com/lm-img/img/2025/01/26/original/Republic_Day_2025_Narendra_Modi_wishes_India_PTI_1737859269715.jpg', name: 'Narendra Modi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'BJP', type: 'chip',color:"orange" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Pending', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
      {
        name: { attributes: {image: 'https://img.etimg.com/thumb/msid-60480099,width-640,height-480,imgsize-187456,resizemode-4/ragas-back-in-focus.jpg', name: 'Rahul Gandhi', address: '123, Main St, Anytown, USA'}, type: 'component' },
        party: { value: 'Congress', type: 'chip',color:"yellow" },
        lastConnected: { value: '2025-04-14', type: 'date' },
        information: { value: 'Information', type: 'text' },
        leadStatus: { value: 'Reach Out Later', type: 'status' ,color:"warning"},
        phoneNumber: { value: '+91 9876543210', type: 'tel' },
      },
    ]
}


export const LeadTableComponent: React.FC<LeadTableComponentProps> = ({ children }) => {  
  const columns = attributes.columns;
  const data = attributes.data;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;

  // Filter data based on search term
  const filteredData = data.filter((row) =>
    columns.some((col) =>
      String(row[col.accessor].value)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + entriesPerPage);

  // Handle page navigation
  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{attributes.title}</h2>
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table border-2 border-gray-200 rounded-lg overflow-hidden w-full">
      <table className="min-w-full bg-white ">
        <thead className="">
          <tr className="bg-gray-100 text-gray-500 font-normal border-b border-gray-200 text-sm rounded-lg">
            {columns.map((col) => (
              <th
                key={col.accessor}
                className="py-3 px-6 text-left  align-middle"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-600 text-sm">
          {paginatedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.accessor}
                  className="py-3 px-6 text-left align-middle"
                >
                  {row[col.accessor].type === 'chip' ||
                  row[col.accessor].type === 'status' ? (
                    <div className="flex items-center">
                      <StatusCard
                        text={row[col.accessor].value}
                        color={row[col.accessor].color}
                        type={row[col.accessor].type}
                      />
                    </div>
                  ) : row[col.accessor].type === 'component' ? (
                    <ShortProfileCard attributes={row[col.accessor].attributes} />
                  ) : (
                    row[col.accessor].value
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      

      {/* Display message when no results found */}
      {filteredData.length === 0 && (
        <div className="mt-4 text-gray-600 text-center">
          No results found for "{searchTerm}"
        </div>
      )}

      {/* Pagination Controls */}
      {filteredData.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={`px-4 py-2 border rounded-md ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 border rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
