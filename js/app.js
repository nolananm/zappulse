import { supabase } from './supabase.js';

const timelineContainer = document.getElementById('tv-timeline');
const filterBtns = document.querySelectorAll('.filter-btn');
const btnRoulette = document.getElementById('btn-roulette');
const rouletteResult = document.getElementById('roulette-result');

let currentPrograms = [];

// 1. LE DICTIONNAIRE DES LOGOS ET NUMÉROS TNT
const tntChannels = {
    "TF1": { order: 1, logo: "https://upload.wikimedia.org/wikipedia/commons/3/30/TF1_logo_2013.svg" },
    "France 2": { order: 2, logo: "https://upload.wikimedia.org/wikipedia/commons/d/d7/France_2_logo_%282018%29.svg" },
    "France 3": { order: 3, logo: "https://upload.wikimedia.org/wikipedia/commons/a/a2/France_3_logo_%282018%29.svg" },
    "Canal+": { order: 4, logo: "https://upload.wikimedia.org/wikipedia/commons/1/15/Canal%2B_logo.svg" },
    "France 5": { order: 5, logo: "https://upload.wikimedia.org/wikipedia/commons/d/df/France_5_logo_%282018%29.svg" },
    "M6": { order: 6, logo: "https://upload.wikimedia.org/wikipedia/commons/3/33/M6_logo_2009.svg" },
    "Arte": { order: 7, logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Logo_Arte.svg" },
    "C8": { order: 8, logo: "https://upload.wikimedia.org/wikipedia/commons/1/17/C8_logo_2016.svg" },
    "W9": { order: 9, logo: "https://upload.wikimedia.org/wikipedia/commons/8/86/W9_logo_2018.svg" },
    "TMC": { order: 10, logo: "https://upload.wikimedia.org/wikipedia/commons/3/36/TMC_logo_2016.svg" },
    "TFX": { order: 11, logo: "https://upload.wikimedia.org/wikipedia/commons/2/22/TFX_logo_2018.svg" },
    "NRJ 12": { order: 12, logo: "https://upload.wikimedia.org/wikipedia/commons/3/3a/NRJ12_logo_2015.svg" },
    "LCP": { order: 13, logo: "https://upload.wikimedia.org/wikipedia/commons/4/4b/LCP_Assemblée_nationale_2019.svg" },
    "France 4": { order: 14, logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/France_4_logo_%282018%29.svg" },
    "BFMTV": { order: 15, logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/BFMTV_Logo_2023.svg" },
    "CNEWS": { order: 16, logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/CNEWS_logo_2017.svg" },
    "CSTAR": { order: 17, logo: "https://upload.wikimedia.org/wikipedia/commons/c/c2/CStar_logo_2016.svg" },
    "Gulli": { order: 18, logo: "https://upload.wikimedia.org/wikipedia/commons/1/15/Gulli_logo_2022.svg" },
    "TF1 Séries Films": { order: 20, logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/TF1_S%C3%A9ries_Films_logo_2018.svg" },
    "L'Équipe": { order: 21, logo: "https://upload.wikimedia.org/wikipedia/commons/f/ff/L%27%C3%89quipe_logo_2015.svg" },
    "6ter": { order: 22, logo: "https://upload.wikimedia.org/wikipedia/commons/8/87/6ter_logo_2012.svg" },
    "RMC Story": { order: 23, logo: "https://upload.wikimedia.org/wikipedia/commons/4/47/RMC_Story_logo_2018.svg" },
    "RMC Découverte": { order: 24, logo: "https://upload.wikimedia.org/wikipedia/commons/c/ce/RMC_D%C3%A9couverte_logo_2017.svg" },
    "Chérie 25": { order: 25, logo: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Ch%C3%A9rie_25_logo_2015.svg" }
};

// 2. CHARGEMENT DES DONNÉES
async function loadPrograms() {
    const { data: dbData, error } = await supabase
        .from('tv_programs')
        .select('*');

    if (error) console.warn('Erreur Supabase :', error.message);

    currentPrograms = (dbData && dbData.length > 0) ? dbData : getFallbackData();
    
    // 🔥 La Magie du Tri : on ordonne les cartes selon le numéro de la chaîne TNT
    currentPrograms.sort((a, b) => {
        const orderA = tntChannels[a.channel_logo]?.order || 99;
        const orderB = tntChannels[b.channel_logo]?.order || 99;
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

        // 🎨 Gestion du vrai logo et du fond blanc pour qu'il ressorte bien
        const channelInfo = tntChannels[prog.channel_logo];
        const logoHtml = channelInfo && channelInfo.logo
            ? `<img src="${channelInfo.logo}" alt="${prog.channel_logo}" class="max-w-full max-h-full p-1.5 object-contain">`
            : `<span class="text-xs text-center text-slate-800 break-words font-bold">${prog.channel_logo}</span>`;

        // Petite pastille avec le numéro de la chaîne (ex: 1 pour TF1)
        const channelNumber = channelInfo 
            ? `<span class="absolute -top-2 -left-2 bg-slate-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-slate-500 shadow-md">${channelInfo.order}</span>` 
            : '';

        const cardHtml = `
            <div class="glass-card rounded-2xl p-5 relative overflow-hidden group mb-4 hover:bg-slate-800/80 transition-all duration-300">
                <div class="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="flex gap-5 items-start">
                    <!-- BLOC LOGO CHAÎNE -->
                    <div class="relative w-14 h-14 rounded-xl bg-white flex items-center justify-center border border-slate-400 shrink-0 shadow-inner">
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
        rouletteResult.innerHTML = `📺 Zappe sur <strong>${randomProg.channel_logo}</strong> pour <em>${randomProg.title}</em> !`;
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
