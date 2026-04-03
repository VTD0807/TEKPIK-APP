'use client'

const Loading = () => {

    return (
        <div className='flex flex-col items-center justify-center h-screen gap-3'>
            <div className='w-11 h-11 rounded-full border-4 border-slate-300 border-t-slate-700 animate-spin'></div>
            <p className='text-sm text-slate-500'>Loading...</p>
        </div>
    )
}

export default Loading