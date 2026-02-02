import React from 'react';

interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    isDay: boolean;
}

interface WeatherCardProps {
    data: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
    // Determine icon based on condition
    const getIcon = (condition: string) => {
        const c = condition.toLowerCase();
        if (c.includes('sun') || c.includes('clear')) return '☀️';
        if (c.includes('cloud')) return '☁️';
        if (c.includes('rain')) return '🌧️';
        if (c.includes('snow')) return '❄️';
        if (c.includes('storm')) return '⚡';
        return '🌥️';
    };

    const isWarm = data.temperature > 20;

    return (
        <div className={`
            relative overflow-hidden rounded-3xl p-6 text-white w-full max-w-sm
            shadow-xl transition-all hover:scale-[1.02] duration-300
            ${isWarm
                ? 'bg-gradient-to-br from-orange-400 to-rose-500'
                : 'bg-gradient-to-br from-blue-400 to-indigo-600'}
        `}>
            {/* Background pattern */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{data.location}</h2>
                        <p className="text-white/80 font-medium">Current Weather</p>
                    </div>
                    <div className="text-4xl filter drop-shadow-md animate-pulse">
                        {getIcon(data.condition)}
                    </div>
                </div>

                {/* Main Temperature */}
                <div className="flex items-end gap-4 mb-8">
                    <div className="text-6xl font-bold tracking-tighter">
                        {Math.round(data.temperature)}°
                    </div>
                    <div className="text-xl font-medium text-white/80 mb-2">
                        {data.condition}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-white/30 mb-6" />

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-white/60">Humidity</span>
                        <span className="font-semibold text-lg">{data.humidity}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-white/60">Wind</span>
                        <span className="font-semibold text-lg">{data.windSpeed} km/h</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-white/60">Feels Like</span>
                        <span className="font-semibold text-lg">{Math.round(data.feelsLike)}°</span>
                    </div>
                </div>

                {/* Interactive Buttons (Mock) */}
                <div className="mt-6 flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors backdrop-blur-sm">
                        Forecast
                    </button>
                    <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors backdrop-blur-sm">
                        Radar
                    </button>
                    <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors backdrop-blur-sm">
                        Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeatherCard;
