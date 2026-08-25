import { supabase } from './supabase.js';

const timelineContainer = document.getElementById('tv-timeline');
const filterBtns = document.querySelectorAll('.filter-btn');
const btnRoulette = document.getElementById('btn-roulette');
const rouletteResult = document.getElementById('roulette-result');

let currentPrograms = [];

// 1. LE NOUVEAU DICTIONNAIRE (Logos ultra-fiables via Clearbit)
const tntChannels = {
    "TF1": { order: 1, logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWcumyL5r4CyKSxUNVJ03ehX31iteA7c7RPowA2HJfGQ&s" },
    "France 2": { order: 2, logo: "https://logo.clearbit.com/france.tv" }, 
    "France 3": { order: 3, logo: "https://logo.clearbit.com/france.tv" },
    "Canal+": { order: 4, logo: "https://logo.clearbit.com/canalplus.com" },
    "France 5": { order: 5, logo: "https://logo.clearbit.com/france.tv" },
    "M6": { order: 6, logo: "https://logo.clearbit.com/m6.fr" },
    "Arte": { order: 7, logo: "https://logo.clearbit.com/arte.tv" },
    "C8": { order: 8, logo: "https://logo.clearbit.com/c8.fr" },
    "W9": { order: 9, logo: "https://logo.clearbit.com/w9.fr" },
    "TMC": { order: 10, logo: "https://logo.clearbit.com/tf1.fr" }, 
    "TFX": { order: 11, logo: "https://logo.clearbit.com/tf1.fr" },
    "NRJ 12": { order: 12, logo: "https://logo.clearbit.com/nrj12.fr" },
    "LCP": { order: 13, logo: "https://logo.clearbit.com/lcp.fr" },
    "France 4": { order: 14, logo: "https://logo.clearbit.com/france.tv" },
    "BFMTV": { order: 15, logo: "https://logo.clearbit.com/bfmtv.com" },
    "CNEWS": { order: 16, logo: "https://logo.clearbit.com/cnews.fr" },
    "CSTAR": { order: 17, logo: "https://logo.clearbit.com/cstar.fr" },
    "Gulli": { order: 18, logo: "https://logo.clearbit.com/gulli.fr" },
    "TF1 Séries Films": { order: 20, logo: "https://logo.clearbit.com/tf1.fr" },
    "L'Équipe": { order: 21, logo: "https://logo.clearbit.com/lequipe.fr" },
    "6ter": { order: 22, logo: "https://logo.clearbit.com/6ter.fr" },
    "RMC Story": { order: 23, logo: "https://logo.clearbit.com/rmcstory.bfmtv.com" },
    "RMC Découverte": { order: 24, logo: "https://logo.clearbit.com/rmcdecouverte.bfmtv.com" },
    "Chérie 25": { order: 25, logo: "https://logo.clearbit.com/cherie25.fr" }
};

// Fonction intelligente pour trouver la chaîne même si le nom varie
function getChannelInfo(dbName) {
    if (!dbName) return null;
    const normalized = dbName.toLowerCase().trim();
    for (const [key, info] of Object.entries(tntChannels)) {
        if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
            return { name: key, ...info };
        }
    }
    return null;
}

// 2. CHARGEMENT DES DONNÉES
async function loadPrograms() {
    const { data: dbData, error } = await supabase
        .from('tv_programs')
        .select('*');

    if (error) console.warn('Erreur Supabase :', error.message);

    currentPrograms = (dbData && dbData.length > 0) ? dbData : getFallbackData();
    
    // Tri avec le numéro de la chaîne (de 1 à 25)
    currentPrograms.sort((a, b) => {
        const infoA = getChannelInfo(a.channel_logo);
        const infoB = getChannelInfo(b.channel_logo);
        const orderA = infoA ? infoA.order : 99;
        const orderB = infoB ? infoB.order : 99;
        return orderA - orderB;
    });

    updateMeteo(currentPrograms);
    renderCards(currentPrograms, 'all');
}

// 3. AFFICHAGE DES CARTES
function renderCards(programs, filterType) {
    timelineContainer.innerHTML = '';
    
    const filtered = filterType === 'all' 
        ? programs 
        : programs.filter(p => p.type.toLowerCase().includes(filterType.toLowerCase()));

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

        // Le fameux logo (image 100% fiable)
        const channelInfo = getChannelInfo(prog.channel_logo);
        const logoHtml = channelInfo && channelInfo.logo
            ? `<img src="${channelInfo.logo}" alt="${channelInfo.name}" class="w-full h-full object-cover rounded-lg">`
            : `<span class="text-xs text-center text-slate-800 break-words font-bold">${prog.channel_logo}</span>`;

        const channelNumber = channelInfo 
            ? `<span class="absolute -top-2 -left-2 bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-slate-500 shadow-md z-10">${channelInfo.order}</span>` 
            : '';

        const cardHtml = `
            <div class="glass-card rounded-2xl p-5 relative overflow-hidden group mb-4 hover:bg-slate-800/80 transition-all duration-300">
                <div class="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex gap-5 items-start">
                    
                    <div class="relative w-14 h-14 rounded-xl bg-white flex items-center justify-center border border-slate-400 shrink-0 shadow-inner p-1">
                        ${channelNumber}
                        ${logoHtml}
                    </div>
                    
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <h2 class="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">${prog.title}</h2>
                            <span class="text-sm font-mono font-bold ${isStarted ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'} px-2 py-1 rounded border border-white/10 shrink-0 ml-2">
                                ${isStarted ? `Reste ${timeRemaining} min` : 'À venir'}
                            </span>
                        </div>
                        <div class="flex items-center gap-3 text-sm text-slate-400 mb-3">
                            <span class="bg-slate-800 px-2 py-0.5 rounded text-xs border border-white/5">${prog.type}</span>
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

// 4. GESTION DES FILTRES
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => {
            b.classList.remove('bg-blue-600', 'active');
            b.classList.add('bg-slate-800');
        });
        e.target.classList.remove('bg-slate-800');
        e.target.classList.add('bg-blue-600', 'active');
        const filter = e.target.getAttribute('data-filter');
        renderCards(currentPrograms, filter);
    });
});

// 5. LA ROULETTE DU ZAPPING
btnRoulette.addEventListener('click', () => {
    if (currentPrograms.length === 0) return;
    btnRoulette.classList.add('animate-pulse');
    rouletteResult.classList.remove('hide');
    rouletteResult.innerHTML = "Recherche de la pépite...";

    setTimeout(() => {
        btnRoulette.classList.remove('animate-pulse');
        const randomProg = currentPrograms[Math.floor(Math.random() * currentPrograms.length)];
        const nomChaine = getChannelInfo(randomProg.channel_logo) ? getChannelInfo(randomProg.channel_logo).name : randomProg.channel_logo;
        rouletteResult.innerHTML = `📺 Zappe sur <strong>${nomChaine}</strong> pour <em>${randomProg.title}</em> !`;
    }, 800);
});

// 6. METEO DU PRIME
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

// 7. DONNÉES DE SECOURS (Au cas où)
function getFallbackData() {
    const now = new Date();
    return [{
        title: "Dune", channel_logo: "TF1", type: "Film - SF", rating: "8.1",
        start_time: new Date(now.getTime() - 50 * 60000).toISOString(),
        end_time: new Date(now.getTime() + 105 * 60000).toISOString(),
        synopsis: "La grille n'est pas encore chargée depuis Supabase...",
        tags: []
    }];
}

// Initialisation
loadPrograms();
setInterval(loadPrograms, 60000);
