'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; 
import DashboardLayout from '../layout/DashboardLayout';
import { LeadTableComponent } from './LeadTableComponent';
export const LeadFormComponent = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phonenumber: '',
    party: '',
    partycolor: '',
    leadstatus: '',
    lastconnected: '', // expected to be a string like '2025-05-08'
    information: '',
    image: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    console.log('Submitting:', formData);

    const { error } = await supabase.from('leads').insert([formData]); // insert as array of one object

    if (error) {
      console.error('Insert error:', error);
      setMessage(`Insert failed: ${error.message}`);
    } else {
      setMessage('Lead inserted successfully!');
      setFormData({
        name: '',
        address: '',
        phonenumber: '',
        party: '',
        partycolor: '',
        leadstatus: '',
        lastconnected: '',
        information: '',
        image: '',
      });
    }

    setLoading(false);
  };

  return (
    <DashboardLayout>
   
    <form onSubmit={handleSubmit} className="space-y-4">
    {Object.entries(formData).map(([key, value]) => (
  <div key={key}>
    <label className="block font-medium capitalize">{key}</label>
    <input
      type={key === 'lastconnected' ? 'date' : 'text'}
      name={key}
      value={value}
      onChange={handleChange}
      className="w-full p-2 border border-gray-300 rounded"
    />
  </div>
))}


      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Submitting...' : 'Submit Lead'}
      </button>

      {message && <p className="mt-2 text-sm">{message}</p>}
      
    </form>
   

    <LeadTableComponent/>
    
    
  </DashboardLayout>
)}
