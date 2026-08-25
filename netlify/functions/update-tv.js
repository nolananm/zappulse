export const config = { schedule: "0 16 * * *" };

export default async (req, context) => {
    const supabaseUrl = 'https://arwrmenzaxpgojaixsff.supabase.co/rest/v1/tv_programs';
    const supabaseSecretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyd3JtZW56YXhwZ29qYWl4c2ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY4NDU4NiwiZXhwIjoyMTAzMjYwNTg2fQ.rfUpeoc4S0YTPMEtN2NclRXNg0x-mt7Qz-DJEDhFgS8'; 
    const TMDB_KEY = '23eea876b20c9ec911e1e6622854d6e1';

    const supabaseHeaders = {
        'apikey': supabaseSecretKey,
        'Authorization': `Bearer ${supabaseSecretKey}`,
        'Content-Type': 'application/json'
    };

    try {
        const xmlResponse = await fetch('https://xmltvfr.fr/xmltv/xmltv_tnt.xml');
        const xmlText = await xmlResponse.text();

        const channels = {};
        const channelRegex = /<channel id="([^"]+)">\s*<display-name[^>]*>(.*?)<\/display-name>/g;
        let match;
        while ((match = channelRegex.exec(xmlText)) !== null) {
            channels[match[1]] = match[2];
        }

        const now = new Date();
        const todayStr = now.getFullYear().toString() + 
                         (now.getMonth() + 1).toString().padStart(2, '0') + 
                         now.getDate().toString().padStart(2, '0');

        const progRegex = /<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g;
        
        // On va stocker le MEILLEUR programme par chaîne
        const primeTimeByChannel = {};

        const formatISO = (str) => {
            const y = str.substring(0,4), m = str.substring(4,6), d = str.substring(6,8);
            const h = str.substring(8,10), min = str.substring(10,12), s = str.substring(12,14);
            return new Date(`${y}-${m}-${d}T${h}:${min}:${s}+02:00`);
        };

        while ((match = progRegex.exec(xmlText)) !== null) {
            const startStr = match[1]; 
            const stopStr = match[2];
            const channelId = match[3];
            const content = match[4];

            // Filtre : Uniquement entre 20h50 et 21h30
            if (startStr.startsWith(todayStr) && startStr.substring(8, 12) >= "2045" && startStr.substring(8, 12) <= "2130") {
                
                const startDate = formatISO(startStr);
                const stopDate = formatISO(stopStr);
                const durationMinutes = (stopDate - startDate) / 60000;

                // FILTRE TÉLÉ-LOISIRS : On zappe la Météo et My Million (moins de 45 min)
                if (durationMinutes < 45) continue;

                const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/);
                const categoryMatch = content.match(/<category[^>]*>(.*?)<\/category>/);
                const descMatch = content.match(/<desc[^>]*>(.*?)<\/desc>/);
                
                // Si on a déjà un programme pour cette chaîne, on garde le plus long
                if (!primeTimeByChannel[channelId] || primeTimeByChannel[channelId].duration < durationMinutes) {
                    primeTimeByChannel[channelId] = {
                        title: titleMatch ? titleMatch[1] : "Programme Inconnu",
                        type: categoryMatch ? categoryMatch[1] : "TV",
                        synopsis: descMatch ? descMatch[1] : "Pas de résumé.",
                        channel_logo: channels[channelId] || channelId,
                        start_time: startDate.toISOString(),
                        end_time: stopDate.toISOString(),
                        duration: durationMinutes
                    };
                }
            }
        }

        const programmesEnrichis = [];

        // Enrichissement TMDB
        for (const prog of Object.values(primeTimeByChannel)) {
            let rating = null;
            let tags = [];

            if (prog.type.toLowerCase().includes("film")) {
                const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(prog.title)}&language=fr-FR`;
                const tmdbResponse = await fetch(searchUrl);
                const tmdbData = await tmdbResponse.json();

                if (tmdbData.results && tmdbData.results.length > 0) {
                    const film = tmdbData.results[0];
                    if(film.vote_average > 0) rating = film.vote_average.toFixed(1);
                    prog.synopsis = film.overview || prog.synopsis; 
                    tags.push({ text: "🍿 Fiche TMDB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" });
                }
            }

            programmesEnrichis.push({
                title: prog.title,
                channel_logo: prog.channel_logo,
                type: prog.type,
                rating: rating,
                start_time: prog.start_time,
                end_time: prog.end_time,
                synopsis: prog.synopsis,
                tags: tags
            });
        }

        await fetch(`${supabaseUrl}?id=not.is.null`, { method: 'DELETE', headers: supabaseHeaders });
        await fetch(supabaseUrl, { method: 'POST', headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' }, body: JSON.stringify(programmesEnrichis) });

        return new Response(`Succès !`, { status: 200 });

    } catch (error) {
        return new Response("Erreur: " + error.message, { status: 500 });
    }
};
