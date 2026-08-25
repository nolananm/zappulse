// Configuration : Ce script s'exécutera tous les jours à 16h00 automatiquement
export const config = {
    schedule: "0 16 * * *"
};

export default async (req, context) => {
    // 1. Tes clés intégrées
    const supabaseUrl = 'https://arwrmenzaxpgojaixsff.supabase.co/rest/v1/tv_programs';
    const supabaseSecretKey = 'sb_secret_5paoguGIEpW7-X7spOETeA_W8d4sGOg';
    const TMDB_KEY = '23eea876b20c9ec911e1e6622854d6e1';

    const supabaseHeaders = {
        'apikey': supabaseSecretKey,
        'Authorization': `Bearer ${supabaseSecretKey}`,
        'Content-Type': 'application/json'
    };

    try {
        console.log("Démarrage de la mise à jour de la grille TV...");

        // 2. RÉCUPÉRER LES HORAIRES (Données de test)
        const grilleTV = [
            { title: "Dune", channel: "TF1", start: "21:10", type: "Film" },
            { title: "Top Chef", channel: "M6", start: "21:10", type: "Divertissement" },
            { title: "Interstellar", channel: "TMC", start: "21:15", type: "Film" }
        ];

        const programmesEnrichis = [];
        const today = new Date().toISOString().split('T')[0];

        // 3. ENRICHIR AVEC TMDB
        for (const prog of grilleTV) {
            let rating = null;
            let synopsis = "Pas de résumé disponible pour ce programme.";
            let tags = [];

            if (prog.type === "Film") {
                const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(prog.title)}&language=fr-FR`;
                const response = await fetch(searchUrl);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const film = data.results[0];
                    rating = film.vote_average.toFixed(1);
                    synopsis = film.overview;
                    tags.push({ text: "Synopsis TMDB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" });
                }
            }

            const startTime = new Date(`${today}T${prog.start}:00`).toISOString();
            const endTime = new Date(new Date(startTime).getTime() + 120 * 60000).toISOString(); 

            programmesEnrichis.push({
                title: prog.title,
                channel_logo: prog.channel,
                type: prog.type,
                rating: rating,
                start_time: startTime,
                end_time: endTime,
                synopsis: synopsis,
                tags: tags
            });
        }

        // 4. INJECTER DANS SUPABASE VIA L'API REST
        
        // A. On supprime les anciennes données (où l'id n'est pas nul)
        await fetch(`${supabaseUrl}?id=not.is.null`, { 
            method: 'DELETE', 
            headers: supabaseHeaders 
        });

        // B. On insère les nouvelles données
        const insertResponse = await fetch(supabaseUrl, {
            method: 'POST',
            headers: { ...supabaseHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify(programmesEnrichis)
        });

        if (!insertResponse.ok) {
            const errorDetail = await insertResponse.text();
            throw new Error(`Erreur d'insertion: ${errorDetail}`);
        }

        console.log("Mise à jour réussie avec succès !");
        return new Response("Mise à jour réussie !", { status: 200 });

    } catch (error) {
        console.error("Erreur fatale :", error.message);
        return new Response("Erreur: " + error.message, { status: 500 });
    }
};
