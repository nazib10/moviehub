import { allMoviesData } from './data.js';

// Get series ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const seriesId = urlParams.get('id');

// Find the series data
const seriesData = allMoviesData.find(item => item.id === seriesId && item.type === 'series');

if (!seriesData) {
    // Redirect to home if series not found
    window.location.href = 'index.html';
}

// Current active season
let activeSeason = seriesData.seasons[seriesData.seasons.length - 1];

// Initialize page
function initializePage() {
    // Update page title and meta
    document.getElementById('pageTitle').textContent = `${seriesData.title} - Doraemon Films Hub`;
    document.getElementById('pageDescription').content = seriesData.description;

    // Generate Structured Data (JSON-LD) for this specific series
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "TVSeries",
        "name": seriesData.title,
        "description": seriesData.description,
        "image": `https://doraemonhub.netlify.app/${seriesData.imageUrl}`,
        "numberOfSeasons": seriesData.seasons.length,
        "containsSeason": seriesData.seasons.map(season => ({
            "@type": "TVSeason",
            "name": season.title || `Season ${season.seasonNumber}`,
            "seasonNumber": season.seasonNumber,
            "numberOfEpisodes": season.episodes.length,
            "episode": season.episodes.map(ep => ({
                "@type": "TVEpisode",
                "episodeNumber": ep.episodeNumber,
                "name": ep.title,
                "description": ep.description
            }))
        }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // Set hero background
    const heroBackground = document.querySelector('.series-hero-background');
    heroBackground.style.backgroundImage = `url('${seriesData.imageUrl}')`;

    // Update series info
    document.getElementById('seriesTitle').textContent = seriesData.title;
    document.getElementById('seriesLanguage').textContent = seriesData.language;
    document.getElementById('seriesSeasons').textContent = `${seriesData.seasons.length} Season${seriesData.seasons.length > 1 ? 's' : ''}`;

    // Calculate total episodes
    const totalEpisodes = seriesData.seasons.reduce((sum, season) => sum + season.episodes.length, 0);
    document.getElementById('seriesEpisodes').textContent = `${totalEpisodes} Episodes`;

    document.getElementById('seriesDescription').textContent = seriesData.description;

    // Render season tabs
    renderSeasonTabs();

    // Render episodes for the first season
    renderEpisodes(activeSeason);

    // Setup event listeners
    setupEventListeners();

    // Setup mobile menu
    setupMobileMenu();

    // Setup user ID tooltip
    setupUserIdTooltip();

    // Setup scroll to top button
    setupScrollToTop();

    // Check if series is in My List
    updateMyListButton();

    // Setup transparent header (Netflix style)
    // Setup transparent header (Netflix style)
    setupTransparentHeader();

    // Setup episode modal
    setupEpisodeModal();

    // Initialize Firebase
    initializeFirebase();
}

// Render season tabs
function renderSeasonTabs() {
    const tabsContainer = document.getElementById('seasonsTabs');
    tabsContainer.innerHTML = '';

    [...seriesData.seasons].reverse().forEach(season => {
        const tab = document.createElement('button');
        tab.className = `season-tab ${season.seasonNumber === activeSeason.seasonNumber ? 'active' : ''}`;
        tab.textContent = `Season ${season.seasonNumber}`;
        tab.onclick = () => switchSeason(season);
        tabsContainer.appendChild(tab);
    });
}

// Render episodes
function renderEpisodes(season) {
    const episodesContainer = document.getElementById('episodesList');
    episodesContainer.innerHTML = '';

    season.episodes.forEach(episode => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'episode-card';

        episodeCard.innerHTML = `
            <div class="episode-number">${episode.episodeNumber}</div>
            <div class="episode-info">
                <h3 class="episode-title">${episode.title}</h3>
                <p class="episode-description">${episode.description || 'Watch this exciting episode!'}</p>
            </div>
            <button class="episode-play-button" ${!episode.videoUrl ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"></path>
                </svg>
            </button>
        `;

        // Card click opens modal
        episodeCard.onclick = () => openEpisodeModal(episode);

        // Play button clicks play directly (and stop propagation to card)
        const playBtn = episodeCard.querySelector('.episode-play-button');
        playBtn.onclick = (e) => {
            e.stopPropagation(); // Don't open modal
            playEpisode(episode);
        };

        if (!episode.videoUrl) {
            playBtn.onclick = (e) => {
                e.stopPropagation();
                alert('Video link coming soon!');
            };
        }

        episodesContainer.appendChild(episodeCard);
    });
}

// Switch season
function switchSeason(season) {
    activeSeason = season;
    renderSeasonTabs();
    renderEpisodes(season);

    // Scroll to episodes list
    document.getElementById('episodesList').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Play episode
function playEpisode(episode) {
    if (episode.videoUrl) {
        window.open(episode.videoUrl, '_blank');
    } else {
        alert('Video link coming soon!');
    }
}

// Setup Episode Modal
function setupEpisodeModal() {
    const modal = document.getElementById('episodeInfoModal');
    const closeBtn = modal ? modal.querySelector('.close-button') : null;

    if (!modal || !closeBtn) return;

    closeBtn.onclick = () => {
        modal.classList.remove('active');
        document.body.style.overflow = "auto"; // Enable scrolling
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.classList.remove('active');
            document.body.style.overflow = "auto";
        }
    };
}

// Open Episode Modal
function openEpisodeModal(episode) {
    const modal = document.getElementById('episodeInfoModal');
    if (!modal) return;

    // Populate data
    document.getElementById('episodeInfoTitle').textContent = episode.title;
    document.getElementById('episodeInfoNumber').textContent = `Episode ${episode.episodeNumber}`;
    document.getElementById('episodeInfoDescription').textContent = episode.description || 'No description available for this episode.';

    // Use series image as fallback for episode image since we lack individual episode thumbs in data
    const img = document.getElementById('episodeInfoImage');
    if (img) {
        img.src = seriesData.imageUrl;
        img.alt = `${episode.title} - ${seriesData.title}`;
    }

    // Setup Watch Button in Modal
    const watchBtn = document.getElementById('episodeInfoWatchButton');
    if (watchBtn) {
        watchBtn.onclick = () => playEpisode(episode);
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = "hidden"; // Disable background scrolling
}

// Setup event listeners
function setupEventListeners() {
    // Play first episode button
    document.getElementById('playFirstEpisode').onclick = () => {
        if (seriesData.seasons && seriesData.seasons.length > 0) {
            // Select the latest season (last in the array)
            const latestSeason = seriesData.seasons[seriesData.seasons.length - 1];
            if (latestSeason.episodes && latestSeason.episodes.length > 0) {
                // Play first episode of the latest season
                playEpisode(latestSeason.episodes[0]);
            } else {
                alert('No episode available to play in this season.');
            }
        } else {
            alert('No seasons available.');
        }
    };

    // Add to list button
    document.getElementById('addToListButton').onclick = toggleMyList;
}

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config (Same as main.js) ---
const LOCAL_APP_ID = 'movieapp-b6801';
const LOCAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCgehU6OrQO757m-YTSpAvaZyTEsIn4NJA",
    authDomain: "movieapp-b6801.firebaseapp.com",
    projectId: "movieapp-b6801",
    storageBucket: "movieapp-b6801.firebasestorage.app",
    messagingSenderId: "1014850345340",
    appId: "1:1014850345340:web:4f9b548c52cb29fd85acf9",
    measurementId: "G-P365MMCVRW"
};

let app, auth, db, myListCollectionRef;
let currentUserId = null;
let userMyList = new Set();

async function initializeFirebase() {
    try {
        app = initializeApp(LOCAL_FIREBASE_CONFIG);
        auth = getAuth(app);
        db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                myListCollectionRef = collection(db, `artifacts/${LOCAL_APP_ID}/users/${currentUserId}/myList`);

                // Listener for My List
                onSnapshot(doc(myListCollectionRef, 'items'), (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        userMyList = new Set(docSnapshot.data().movieIds || []);
                    } else {
                        userMyList = new Set();
                        setDoc(doc(myListCollectionRef, 'items'), { movieIds: [] }, { merge: true });
                    }
                    updateMyListButton();
                });
            } else {
                await signInAnonymously(auth);
            }
        });
    } catch (error) {
        console.error("Firebase init error in series.js:", error);
    }
}

// Toggle My List (Firebase)
async function toggleMyList() {
    if (!currentUserId) {
        alert("Please wait for initialization...");
        return;
    }

    const button = document.getElementById('addToListButton');
    // Optimistic UI update
    const isCurrentlyIn = userMyList.has(seriesData.id);

    try {
        const docRef = doc(myListCollectionRef, 'items');
        if (isCurrentlyIn) {
            await updateDoc(docRef, { movieIds: arrayRemove(seriesData.id) });
        } else {
            await setDoc(docRef, { movieIds: arrayUnion(seriesData.id) }, { merge: true });
        }
    } catch (e) {
        console.error("Error updating list:", e);
        // Revert on error would be ideal, but for now just log
        alert("Failed to update list. Check console.");
    }
}

// Update My List button state
function updateMyListButton() {
    const button = document.getElementById('addToListButton');
    if (!button) return;

    const isInList = userMyList.has(seriesData.id);

    if (isInList) {
        button.classList.add('in-list');
        // Update SVG to checkmark
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Remove
        `;
    } else {
        button.classList.remove('in-list');
        // Update SVG to plus
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            My List
        `;
    }
}

// Setup mobile menu
function setupMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('mobileNavSidebar');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const closeBtn = document.querySelector('.close-mobile-nav');

    function openMenu() {
        sidebar.classList.add('active');
        backdrop.classList.add('active');
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        backdrop.classList.remove('active');
    }

    menuToggle?.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    backdrop?.addEventListener('click', closeMenu);
}

// Setup user ID tooltip
function setupUserIdTooltip() {
    const userButton = document.getElementById('userIdToggleButton');
    const tooltip = document.getElementById('userIdTooltip');

    if (!userButton || !tooltip) return;

    const userId = localStorage.getItem('userId') || generateUserId();

    userButton.addEventListener('click', () => {
        tooltip.textContent = `Your ID: ${userId}`;
        tooltip.classList.add('show');

        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 3000);
    });
}

// Generate user ID
function generateUserId() {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', id);
    return id;
}

// Setup scroll to top button
function setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTopBtn');

    if (!scrollBtn) return;

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('show');
        } else {
            scrollBtn.classList.remove('show');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

// Setup transparent header mode (Netflix style)
function setupTransparentHeader() {
    const header = document.querySelector('header');

    if (!header) return;

    // Enable transparent mode on page load
    header.classList.add('transparent-mode');

    // Handle scroll to toggle header background
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    });
}
