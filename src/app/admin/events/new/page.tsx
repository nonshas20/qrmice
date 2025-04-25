'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { createEvent } from '@/lib/supabase';

type FormData = {
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
};

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Set default date to today
  const today = new Date().toISOString().slice(0, 10);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<FormData>({
    defaultValues: {
      date: today
    }
  });
  
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await createEvent(data);
      router.push('/admin/events');
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Create New Event</h1>
          <Link href="/admin/events" className="text-primary-600 hover:text-primary-800">
            &larr; Back to Events
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label htmlFor="name" className="form-label">
                    Event Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter event name"
                    className={`form-input ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('name', { 
                      required: 'Event name is required',
                      minLength: {
                        value: 3,
                        message: 'Event name must be at least 3 characters'
                      } 
                    })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    placeholder="Enter event description"
                    className={`form-input ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('description')}
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="date" className="form-label">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    className={`form-input ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('date', { 
                      required: 'Date is required'
                    })}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="location" className="form-label">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    placeholder="Enter event location"
                    className={`form-input ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('location')}
                  />
                </div>
                
                <div>
                  <label htmlFor="start_time" className="form-label">
                    Start Time
                  </label>
                  <input
                    id="start_time"
                    type="time"
                    className={`form-input ${errors.start_time ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('start_time', { 
                      required: 'Start time is required'
                    })}
                  />
                  {errors.start_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="end_time" className="form-label">
                    End Time
                  </label>
                  <input
                    id="end_time"
                    type="time"
                    className={`form-input ${errors.end_time ? 'border-red-500' : 'border-gray-300'}`}
                    {...register('end_time', { 
                      required: 'End time is required'
                    })}
                  />
                  {errors.end_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <Link 
                  href="/admin/events"
                  className="btn-secondary"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    'Create Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
} 