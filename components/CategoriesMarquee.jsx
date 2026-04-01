const CategoriesMarquee = ({ categories = [] }) => {
    
    // If no custom categories are passed or fetched yet, return null
    if (!categories || categories.length === 0) return null;

    // Remove duplicates so repeated marquee does not show duplicated chips from source data.
    const uniqueCategories = Array.from(new Set(
        categories
            .map(c => (typeof c === 'string' ? c.trim() : ''))
            .filter(Boolean)
    ));

    const shouldMarquee = uniqueCategories.length > 4;

    // Repeat only when marquee animation is actually needed.
    const repeatedList = shouldMarquee
        ? [...uniqueCategories, ...uniqueCategories, ...uniqueCategories, ...uniqueCategories, ...uniqueCategories]
        : uniqueCategories;

    return (
        <div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
            <div className={`flex gap-4 px-4 ${shouldMarquee ? 'animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] w-max' : 'flex-wrap justify-start'}`}>
                {repeatedList.map((category, index) => (
                    <button key={index} className="px-5 py-2 whitespace-nowrap bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300">
                        {category}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategoriesMarquee;
