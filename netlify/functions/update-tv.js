import { createClient } from '@supabase/supabase-js';

// Configuration : Ce script s'exécutera tous les jours à 16h00 automatiquement
export const config = {
    schedule: "0 16 * * *"
};

export default async (req, context) => {
    // 1. Initialiser Supabase avec la clé SECRÈTE (pour avoir le droit d'écrire)
    const supabaseUrl = 'https://arwrmenzaxpgojaixsff.supabase.co';
    const supabaseSecretKey = 'sb_secret_5paoguGIEpW7-X7spOETeA_W8d4sGOg'; // <-- À REMPLACER
    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    const TMDB_KEY = '23eea876b20c9ec911e1e6622854d6e1';

    try {
        console.log("Démarrage de la mise à jour de la grille TV...");

        // 2. RÉCUPÉRER LES HORAIRES 
        // (Pour l'instant on simule 3 programmes pour créer la logique. 
        // Plus tard, on remplacera ce tableau par un "fetch" vers un vrai fichier XMLTV).
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

            // On demande à l'API TMDB seulement si c'est un film
            if (prog.type === "Film") {
                const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(prog.title)}&language=fr-FR`;
                const response = await fetch(searchUrl);
                const data = await response.json();

                // Si TMDB trouve le film, on récupère les vraies infos !
                if (data.results && data.results.length > 0) {
                    const film = data.results[0];
                    rating = film.vote_average.toFixed(1); // Arrondi à 1 décimale (ex: 8.1)
                    synopsis = film.overview;
                    tags.push({ text: "Synopsis TMDB", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" });
                }
            }

            // Création des dates de début et fin pour Supabase
            const startTime = new Date(`${today}T${prog.start}:00`).toISOString();
            // On estime que le programme dure 2 heures (120 min) pour l'exemple
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

        // 4. INJECTER DANS SUPABASE
        // On supprime d'abord les vieux programmes (pour faire place nette)
        await supabase.from('tv_programs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // On insère les nouveaux programmes enrichis par TMDB
        const { error } = await supabase.from('tv_programs').insert(programmesEnrichis);

        if (error) throw error;

        console.log("Mise à jour réussie avec succès !");
        return new Response("Mise à jour réussie !", { status: 200 });

    } catch (error) {
        console.error("Erreur fatale :", error.message);
        return new Response("Erreur: " + error.message, { status: 500 });
    }
};
