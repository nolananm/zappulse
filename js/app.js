import { supabase } from './supabase.js';

const timelineContainer = document.getElementById('tv-timeline');

async function loadPrograms() {
    // Requête Supabase pour récupérer la grille TV
    const { data: dbData, error } = await supabase
        .from('tv_programs')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Erreur Supabase :', error);
        timelineContainer.innerHTML = `<p class="text-red-500 text-center">Erreur Supabase. Vérifie tes clés et la table tv_programs.</p>`;
        return;
    }

    // Si la base de données est vide, on affiche des fausses données pour tester le front
    const programs = dbData && dbData.length > 0 ? dbData : getFallbackData();
    renderCards(programs);
}

function renderCards(programs) {
    timelineContainer.innerHTML = '';
    
    programs.forEach((prog) => {
        // Calcul des temps
        const start = new Date(prog.start_time);
        const end = new Date(prog.end_time);
        const totalDuration = end - start;
        const elapsed = new Date() - start;
        
        let progressPercent = (elapsed / totalDuration) * 100;
        progressPercent = Math.max(0, Math.min(100, progressPercent)); 
        
        const timeRemaining = Math.round((end - new Date()) / 60000);
        
        // Gestion des tags JSONB
        let tagsHtml = '';
        if (prog.tags && Array.isArray(prog.tags)) {
            tagsHtml = prog.tags.map(tag => 
                `<span class="px-2 py-1 text-xs font-semibold rounded-md border ${tag.color}">${tag.text}</span>`
            ).join('');
        }

        const cardHtml = `
            <div class="glass-card rounded-2xl p-5 relative overflow-hidden group mb-4">
                <div class="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 progress-bar-animated" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex gap-5 items-start">
                    <div class="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold border border-white/20 shrink-0">
                        ${prog.channel_logo}
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <h2 class="text-xl font-bold text-white">${prog.title}</h2>
                            <span class="text-sm font-mono font-bold bg-white/10 px-2 py-1 rounded text-blue-300">
                                Reste ${timeRemaining > 0 ? timeRemaining : 0} min
                            </span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-slate-400 mb-3">
                            <span>${prog.type || 'Programme'}</span>
                            <span>•</span>
                            <span>⭐ ${prog.rating || '-'}</span>
                        </div>
                        <p class="text-sm text-slate-300 line-clamp-1 mb-4">${prog.synopsis || ''}</p>
                        <div class="flex flex-wrap gap-2">${tagsHtml}</div>
                    </div>
                </div>
            </div>
        `;
        timelineContainer.innerHTML += cardHtml;
    });
}

function getFallbackData() {
    const now = new Date();
    return [
        {
            title: "Connecte ta base Supabase !", 
            channel_logo: "1", 
            type: "Test", 
            rating: "9.9",
            start_time: new Date(now.getTime() - 45 * 60000).toISOString(),
            end_time: new Date(now.getTime() + 65 * 60000).toISOString(),
            synopsis: "Les données réelles ne sont pas encore chargées. Ajoute des lignes dans ta table tv_programs.",
            tags: [{ text: "Mock Data", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" }]
        }
    ];
}

// Initialisation
loadPrograms();
// Rafraîchissement chaque minute pour la barre de progression
setInterval(loadPrograms, 60000);
