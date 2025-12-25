export function getCurrentTime(timezone) {
    if (!timezone) {
        throw new Error('Timezone is required (e.g., "Asia/Tokyo" or "UTC").');
    }

    try {
        const date = new Date();
        const timeString = date.toLocaleString('en-US', {
            timeZone: timezone,
            hour12: true,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        return {
            timezone: timezone,
            currentTime: timeString
        };
    } catch (error) {
        throw new Error(`Invalid timezone "${timezone}". Please provide a valid IANA timezone string.`);
    }
}
