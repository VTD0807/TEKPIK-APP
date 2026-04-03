import React from 'react'
import Title from './Title'

const Newsletter = () => {
    return (
        <div className='flex flex-col items-center mx-4 sm:mx-6 my-16 sm:my-28'>
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week." visibleButton={false} />
            <div className='flex flex-col sm:flex-row gap-2 bg-slate-100 text-sm p-2 rounded-2xl sm:rounded-full w-full max-w-xl my-8 sm:my-10 border-2 border-white ring ring-slate-200'>
                <input className='flex-1 px-4 py-3 sm:py-0 sm:pl-5 outline-none bg-transparent' type="text" placeholder='Enter your email address' />
                <button className='font-medium bg-green-500 text-white px-6 py-3 rounded-xl sm:rounded-full hover:scale-103 active:scale-95 transition'>Get Updates</button>
            </div>
        </div>
    )
}

export default Newsletter
