// Configuration de l'horaire : Le script se lance tous les jours à 16h
export const config = {
    schedule: "0 16 * * *"
};

export default async (req, context) => {
    // 1. Clés d'API (Avec ta clé JWT service_role valide)
    const supabaseUrl = 'https://arwrmenzaxpgojaixsff.supabase.co/rest/v1/tv_programs';
    const supabaseSecretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyd3JtZW56YXhwZ29qYWl4c2ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY4NDU4NiwiZXhwIjoyMTAzMjYwNTg2fQ.rfUpeoc4S0YTPMEtN2NclRXNg0x-mt7Qz-DJEDhFgS8'; 
    const TMDB_KEY = '23eea876b20c9ec911e1e6622854d6e1';

    const supabaseHeaders = {
        'apikey': supabaseSecretKey,
        'Authorization': `Bearer ${supabaseSecretKey}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log("Aspiration de la vraie grille TV...");

        // 2. RÉCUPÉRATION DU FLUX XMLTV GRATUIT (Grille TNT Française)
        const xmlResponse = await fetch('https://xmltvfr.fr/xmltv/xmltv_tnt.xml');
        const xmlText = await xmlResponse.text();

        // 3. PARSING DU FICHIER (Sans librairie externe)
        const channels = {};
        const channelRegex = /<channel id="([^"]+)">\s*<display-name[^>]*>(.*?)<\/display-name>/g;
        let match;
        while ((match = channelRegex.exec(xmlText)) !== null) {
            channels[match[1]] = match[2];
        }

        const programmesEnrichis = [];
        
        // Définir la date d'aujourd'hui pour filtrer (Format YYYYMMDD)
        const now = new Date();
        const todayStr = now.getFullYear().toString() + 
                         (now.getMonth() + 1).toString().padStart(2, '0') + 
                         now.getDate().toString().padStart(2, '0');

        const progRegex = /<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)">([\s\S]*?)<\/programme>/g;
        
        while ((match = progRegex.exec(xmlText)) !== null) {
            const startStr = match[1]; // Ex: 20260825211000 +0200
            const stopStr = match[2];
            const channelId = match[3];
            const content = match[4];

            // On ne garde que les programmes de CE SOIR (entre 20h50 et 21h30)
            if (startStr.startsWith(todayStr) && startStr.substring(8, 12) >= "2050" && startStr.substring(8, 12) <= "2130") {
                
                const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/);
                const categoryMatch = content.match(/<category[^>]*>(.*?)<\/category>/);
                const descMatch = content.match(/<desc[^>]*>(.*?)<\/desc>/);
                
                const title = titleMatch ? titleMatch[1] : "Programme Inconnu";
                const type = categoryMatch ? categoryMatch[1] : "TV";
                let synopsis = descMatch ? descMatch[1] : "Pas de résumé.";
                
                let rating = null;
                let tags = [];

                // 4. LA MAGIE TMDB : On enrichit si c'est un film
                if (type.toLowerCase().includes("film")) {
                    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=fr-FR`;
                    const tmdbResponse = await fetch(searchUrl);
                    const tmdbData = await tmdbResponse.json();

                    if (tmdbData.results && tmdbData.results.length > 0) {
                        const film = tmdbData.results[0];
                        if(film.vote_average > 0) {
                            rating = film.vote_average.toFixed(1);
                        }
                        synopsis = film.overview || synopsis; 
                        tags.push({ text: "🍿 Fiche TMDB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" });
                    }
                }

                // Formatage des dates pour Supabase (ISO 8601)
                const formatISO = (str) => {
                    const y = str.substring(0,4), m = str.substring(4,6), d = str.substring(6,8);
                    const h = str.substring(8,10), min = str.substring(10,12), s = str.substring(12,14);
                    return new Date(`${y}-${m}-${d}T${h}:${min}:${s}+02:00`).toISOString();
                };

                programmesEnrichis.push({
                    title: title,
                    channel_logo: channels[channelId] || channelId, 
                    type: type,
                    rating: rating,
                    start_time: formatISO(startStr),
                    end_time: formatISO(stopStr),
                    synopsis: synopsis,
                    tags: tags
                });
            }
        }

        if (programmesEnrichis.length === 0) {
            throw new Error("Aucun programme trouvé pour ce soir. Vérifie le flux XMLTV.");
        }

        // 5. INJECTION DANS SUPABASE
        await fetch(`${supabaseUrl}?id=not.is.null`, { 
            method: 'DELETE', 
            headers: supabaseHeaders 
        });

        const insertResponse = await fetch(supabaseUrl, {
            method: 'POST',
            headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify(programmesEnrichis)
        });

        if (!insertResponse.ok) {
            throw new Error(`Erreur Supabase: ${await insertResponse.text()}`);
        }

        console.log(`Succès ! ${programmesEnrichis.length} vrais programmes injectés.`);
        return new Response(`Succès !`, { status: 200 });

    } catch (error) {
        console.error("Erreur:", error.message);
        return new Response("Erreur: " + error.message, { status: 500 });
    }
};
