import { supabase } from './supabase.js';

const timelineContainer = document.getElementById('tv-timeline');
const filterBtns = document.querySelectorAll('.filter-btn');
const btnRoulette = document.getElementById('btn-roulette');
const rouletteResult = document.getElementById('roulette-result');

let currentPrograms = [];

// 1. CHARGEMENT DES DONNÉES
async function loadPrograms() {
    const { data: dbData, error } = await supabase
        .from('tv_programs')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.warn('Erreur Supabase, passage sur les données de secours :', error.message);
    }

    currentPrograms = (dbData && dbData.length > 0) ? dbData : getFallbackData();
    
    updateMeteo(currentPrograms);
    renderCards(currentPrograms, 'all');
}

// 2. AFFICHAGE DES CARTES
function renderCards(programs, filterType) {
    timelineContainer.innerHTML = '';
    
    const filtered = filterType === 'all' 
        ? programs 
        : programs.filter(p => p.type.includes(filterType));

    if (filtered.length === 0) {
        timelineContainer.innerHTML = `<p class="text-center text-slate-500">Aucun programme pour cette catégorie ce soir.</p>`;
        return;
    }

    filtered.forEach((prog) => {
        const start = new Date(prog.start_time);
        const end = new Date(prog.end_time);
        const totalDuration = end - start;
        const elapsed = new Date() - start;
        
        let progressPercent = (elapsed / totalDuration) * 100;
        progressPercent = Math.max(0, Math.min(100, progressPercent)); 
        
        const timeRemaining = Math.round((end - new Date()) / 60000);
        const isStarted = timeRemaining > 0 && progressPercent > 0;
        
        let tagsHtml = '';
        if (prog.tags && Array.isArray(prog.tags)) {
            tagsHtml = prog.tags.map(tag => 
                `<span class="px-2 py-1 text-xs font-semibold rounded-md border ${tag.color}">${tag.text}</span>`
            ).join('');
        }

        const cardHtml = `
            <div class="glass-card rounded-2xl p-5 relative overflow-hidden group mb-4 hover:bg-slate-800/80 transition-all duration-300">
                <div class="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex gap-5 items-start">
                    <div class="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-xl font-bold border border-slate-600 shrink-0 shadow-inner">
                        ${prog.channel_logo}
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <h2 class="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">${prog.title}</h2>
                            <span class="text-sm font-mono font-bold ${isStarted ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'} px-2 py-1 rounded border border-white/10">
                                ${isStarted ? `Reste ${timeRemaining} min` : 'À venir'}
                            </span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-slate-400 mb-3">
                            <span class="bg-slate-800 px-2 py-0.5 rounded text-xs">${prog.type}</span>
                            <span>•</span>
                            <span class="text-yellow-500 font-bold">⭐ ${prog.rating || 'N/A'}</span>
                        </div>
                        <p class="text-sm text-slate-300 line-clamp-2 mb-4">${prog.synopsis || ''}</p>
                        <div class="flex flex-wrap gap-2">${tagsHtml}</div>
                    </div>
                </div>
            </div>
        `;
        timelineContainer.innerHTML += cardHtml;
    });
}

// 3. GESTION DES FILTRES
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Style des boutons
        filterBtns.forEach(b => {
            b.classList.remove('bg-blue-600', 'active');
            b.classList.add('bg-slate-800');
        });
        e.target.classList.remove('bg-slate-800');
        e.target.classList.add('bg-blue-600', 'active');

        // Filtrage
        const filter = e.target.getAttribute('data-filter');
        renderCards(currentPrograms, filter);
    });
});

// 4. LA ROULETTE DU ZAPPING
btnRoulette.addEventListener('click', () => {
    if (currentPrograms.length === 0) return;
    
    // Animation du bouton
    btnRoulette.classList.add('animate-pulse');
    rouletteResult.classList.remove('hide');
    rouletteResult.innerHTML = "Recherche de la pépite...";

    setTimeout(() => {
        btnRoulette.classList.remove('animate-pulse');
        const randomProg = currentPrograms[Math.floor(Math.random() * currentPrograms.length)];
        rouletteResult.innerHTML = `📺 Zappe sur <strong>${randomProg.channel_logo}</strong> pour <em>${randomProg.title}</em> !`;
    }, 800);
});

// 5. METEO DU PRIME (Calcul automatique)
function updateMeteo(programs) {
    if (!programs || programs.length === 0) return;
    
    let totalRating = 0;
    let validRatings = 0;
    
    programs.forEach(p => {
        if (p.rating && !isNaN(parseFloat(p.rating))) {
            totalRating += parseFloat(p.rating);
            validRatings++;
        }
    });

    const avg = validRatings > 0 ? (totalRating / validRatings).toFixed(1) : 0;
    const icon = document.getElementById('meteo-icon');
    const text = document.getElementById('meteo-text');

    if (avg >= 7.5) {
        icon.textContent = "☀️";
        text.textContent = `Soirée Masterclass (Moy: ${avg})`;
    } else if (avg >= 6) {
        icon.textContent = "⛅";
        text.textContent = `Soirée Correcte (Moy: ${avg})`;
    } else {
        icon.textContent = "🌧️";
        text.textContent = `Pluie de navets (Moy: ${avg})`;
    }
}

// 6. DONNÉES DE SECOURS (Si Supabase est vide)
function getFallbackData() {
    const now = new Date();
    return [
        {
            title: "Dune", 
            channel_logo: "TF1", 
            type: "Cinéma - SF", 
            rating: "8.1",
            start_time: new Date(now.getTime() - 50 * 60000).toISOString(),
            end_time: new Date(now.getTime() + 105 * 60000).toISOString(),
            synopsis: "L'histoire de Paul Atreides, jeune homme doué d'un destin hors du commun qui doit se rendre sur la planète la plus dangereuse de l'univers.",
            tags: [
                { text: "🍿 Risque de pub imminent", color: "bg-red-500/20 text-red-400 border-red-500/30" },
                { text: "Dispo Max", color: "bg-purple-600/20 text-purple-400 border-purple-600/30" }
            ]
        },
        {
            title: "Paris Saint-Germain / Olympique de Marseille", 
            channel_logo: "C+", 
            type: "Sport - Ligue 1", 
            rating: "8.5",
            start_time: new Date(now.getTime() - 25 * 60000).toISOString(),
            end_time: new Date(now.getTime() + 65 * 60000).toISOString(),
            synopsis: "Le Classique du championnat de France. Grosse intensité attendue ce soir au Parc des Princes avec des enjeux cruciaux pour le haut du classement.",
            tags: [
                { text: "⚽ Score en direct : 1 - 0", color: "bg-green-500/20 text-green-400 border-green-500/30" },
                { text: "Temps fort en cours", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" }
            ]
        },
        {
            title: "Envoyé Spécial", 
            channel_logo: "F2", 
            type: "Documentaire", 
            rating: "7.2",
            start_time: new Date(now.getTime() - 80 * 60000).toISOString(),
            end_time: new Date(now.getTime() + 30 * 60000).toISOString(),
            synopsis: "Enquête exclusive sur les failles de sécurité des réseaux mobiles et les nouvelles antennes 5G.",
            tags: [
                { text: "⚡ Résumé Express dispo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
            ]
        }
    ];
}

// Initialisation et boucle de rafraîchissement
loadPrograms();
setInterval(() => {
    const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    renderCards(currentPrograms, activeFilter);
}, 60000); // Met à jour les barres toutes les minutes
