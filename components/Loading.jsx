'use client'

const Loading = () => {

    return (
        <div className='flex flex-col items-center justify-center h-screen gap-4'>
            <div className="relative">
                <div className='w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-slate-700 animate-spin'></div>
            </div>
            <p className='text-sm text-slate-400 font-medium'>Loading...</p>
        </div>
    )
}

export default Loading