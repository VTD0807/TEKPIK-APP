import React from 'react'
import Title from './Title'
import { ShieldCheck, Truck, Headphones, CreditCard, RotateCcw, Zap } from 'lucide-react'

const ourSpecsData = [
    {
        title: "Fast & Free Shipping",
        description: "Get your items delivered quickly and for free on orders over $50.",
        icon: Truck,
        accent: "#3b82f6"
    },
    {
        title: "Secure Payments",
        description: "Your transactions are protected with industry-leading encryption.",
        icon: ShieldCheck,
        accent: "#10b981"
    },
    {
        title: "24/7 Support",
        description: "Our dedicated support team is available around the clock to help.",
        icon: Headphones,
        accent: "#f59e0b"
    },
    {
        title: "Easy Returns",
        description: "Not satisfied? Return your items within 30 days for a full refund.",
        icon: RotateCcw,
        accent: "#ef4444"
    },
    {
        title: "Instant AI Analysis",
        description: "Get real-time pros, cons, and value scores for any product.",
        icon: Zap,
        accent: "#8b5cf6"
    },
    {
        title: "Best Price Guarantee",
        description: "We ensure you get the most value for your money on every purchase.",
        icon: CreditCard,
        accent: "#ec4899"
    }
]

const OurSpecs = () => {

    return (
        <div className='px-6 my-20 max-w-6xl mx-auto'>
            <Title visibleButton={false} title='Our Specifications' description="We offer top-tier service and convenience to ensure your shopping experience is smooth, secure and completely hassle-free." />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 gap-y-10 mt-26'>
                {
                    ourSpecsData.map((spec, index) => {
                        return (
                            <div className='relative h-44 px-8 flex flex-col items-center justify-center w-full text-center border rounded-lg group' style={{ backgroundColor: spec.accent + 10, borderColor: spec.accent + 30 }} key={index}>
                                <h3 className='text-slate-800 font-medium'>{spec.title}</h3>
                                <p className='text-sm text-slate-600 mt-3'>{spec.description}</p>
                                <div className='absolute -top-5 text-white size-10 flex items-center justify-center rounded-md group-hover:scale-105 transition' style={{ backgroundColor: spec.accent }}>
                                    <spec.icon size={20} />
                                </div>
                            </div>
                        )
                    })
                }
            </div>

        </div>
    )
}

export default OurSpecs