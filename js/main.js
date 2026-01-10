// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

import { allMoviesData } from '/js/data.js';
import { supportData } from '/js/support.js';

// Global Firebase variables
let app;
let db;
let auth;
let analytics;
let currentUserId = null;
let myListCollectionRef;

// --- IMPORTANT: Firebase Config for Local Testing (Updated with your movieapp-b6801 project) ---
const LOCAL_APP_ID = 'movieapp-b6801'; // Your actual project ID
const LOCAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCgehU6OrQO757m-YTSpAvaZyTEsIn4NJA",
    authDomain: "movieapp-b6801.firebaseapp.com",
    projectId: "movieapp-b6801",
    storageBucket: "movieapp-b6801.firebasestorage.app",
    messagingSenderId: "1014850345340",
    appId: "1:1014850345340:web:4f9b548c52cb29fd85acf9",
    measurementId: "G-P365MMCVRW" // Updated to match server-fetched ID
};
// --- END Firebase Config ---

// Hero Carousel Configuration
// This references actual movie IDs from allMoviesData to avoid duplication
const heroMoviesConfig = [
    {
        // Welcome slide - custom content
        id: "hero-welcome",
        title: "Welcome to Dorahub",
        description: "Your ultimate destination for all Doraemon movies and anime adventures. Explore the gadgetless world of wonders!",
        imageUrl: "images/doraemon_hero.png",
        videoUrl: "#allMoviesGrid",
        language: "Multi-Language",
        category: [],
        isCustom: true
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "doraemon-2005-series", // TV Series
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "db-super-broly-2018",
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "doraemon-earth-symphony-2024",
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "death-note-relight-2007",
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "sky-utopia-2023",
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "treasure-island",
        isCustom: false
    },
    {
        // Reference to actual movie in allMoviesData
        movieId: "db-super-hero-2022",
        isCustom: false
    }
];

// This will be populated after allMoviesData is imported
let heroMoviesData = [];

document.addEventListener('DOMContentLoaded', async function () {
    console.log("DOMContentLoaded fired. Starting initialization...");

    // --- DOM Elements ---
    const searchToggleButton = document.getElementById('searchToggleButton');
    const movieSearchInput = document.getElementById('movieSearch');
    const donateButton = document.getElementById('donateButton');
    const heroSection = document.getElementById('heroSection');
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const copiedMessageElement = document.getElementById('copiedMessage');
    const myListSection = document.getElementById('myListSection');
    const myListGrid = document.getElementById('myListGrid');
    const myListEmptyMessage = document.getElementById('myListEmptyMessage');
    const userIdToggleButton = document.getElementById('userIdToggleButton');
    const userIdTooltip = document.getElementById('userIdTooltip');
    const cryptoOptionsContainer = document.getElementById('cryptoOptionsContainer');
    const movieInfoModal = document.getElementById('movieInfoModal');
    const movieInfoTitle = document.getElementById('movieInfoTitle');
    const movieInfoDescription = document.getElementById('movieInfoDescription');
    const movieInfoImage = document.getElementById('movieInfoImage');
    const movieInfoLanguage = document.getElementById('movieInfoLanguage');
    const movieInfoWatchButton = document.getElementById('movieInfoWatchButton');
    const movieInfoYear = document.getElementById('movieInfoYear');
    const movieInfoGenre = document.getElementById('movieInfoGenre');
    const movieInfoRating = document.getElementById('movieInfoRating');
    const movieInfoCast = document.getElementById('movieInfoCast');
    const movieInfoRuntime = document.getElementById('movieInfoRuntime');
    const movieCastRow = document.getElementById('movieCastRow');
    const movieRuntimeRow = document.getElementById('movieRuntimeRow');
    const movieInfoMyListButton = document.getElementById('movieInfoMyListButton');


    // Carousel elements
    const heroCarousel = document.getElementById('heroCarousel');
    let carouselItems = []; // Will be populated dynamically
    const prevButton = document.querySelector('.carousel-control.prev');
    const nextButton = document.querySelector('.carousel-control.next');
    const carouselIndicators = document.querySelector('.carousel-indicators');

    let currentSlide = 0;
    let carouselInterval;
    let currentModalMovieId = null;

    /**
     * Monetag Smart Link Integration
     * intelligently triggers on the first "Play/Watch" interaction per session.
     */
    /**
     * Monetag Smart Link - Hybrid Logic
     * 1. Active Session: Shows ads every 10 mins (Monetize long users).
     * 2. New Session: Shows ads immediately (Monetize "drop & return" users).
     * 3. Safety: 60s global lock prevents ban from multi-tab spam.
     */
    function initSmartLink() {
        const SMART_LINK_URL = "https://otieu.com/4/10442977";
        const LOCAL_STORAGE_KEY = "monetag_last_ad_time";    // Global across all tabs
        const SESSION_STORAGE_KEY = "monetag_session_active"; // Specific to this tab

        const LONG_COOLDOWN = 10 * 60 * 1000; // 10 Minutes (For same session re-clicks)
        const SHORT_COOLDOWN = 60 * 1000;     // 1 Minute (Spam protection for new sessions)

        document.addEventListener('click', function (e) {
            const target = e.target.closest('.watch-button, .play-button, .episode-item, .my-list-button');
            if (!target) return;

            const now = Date.now();
            const lastShownGlobal = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || 0);
            const isSessionActive = sessionStorage.getItem(SESSION_STORAGE_KEY);

            // Determine which timer to use
            let cooldownToUse;
            if (isSessionActive) {
                // User is in a long session. Wait 10 mins between ads.
                cooldownToUse = LONG_COOLDOWN;
            } else {
                // User just arrived (New Tab or Restarted Browser).
                // Use short 60s lock to prevent multi-tab spam, but capture "Came Back" users.
                cooldownToUse = SHORT_COOLDOWN;
            }

            // Check if we are inside the restricted window
            if (now - lastShownGlobal < cooldownToUse) {
                // Protection active: Allow normal click (Go to Facebook/Movie)
                return;
            }

            // --- Trigger Ad ---
            e.preventDefault();
            e.stopPropagation();
            window.open(SMART_LINK_URL, '_blank');

            // Update State
            localStorage.setItem(LOCAL_STORAGE_KEY, now.toString()); // Set global timer
            sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');     // Mark this session as "Ad Shown"

            console.log(`Smart Link Triggered. Mode: ${isSessionActive ? 'Repeat Session (10m)' : 'New Session (Instant)'}`);

        }, true);
    }

    initSmartLink();

    /**
     * Initialize hero movies data from config
     * Resolves movie references from allMoviesData
     */
    function initializeHeroMovies() {
        heroMoviesData = heroMoviesConfig.map(config => {
            if (config.isCustom) {
                // Return custom slide as-is
                return config;
            } else {
                const movie = allMoviesData.find(m => m.id === config.movieId);
                if (movie) {
                    return movie;
                } else {
                    console.warn(`Hero carousel: Movie with ID "${config.movieId}" not found in allMoviesData`);
                    return null;
                }
            }
        }).filter(movie => movie !== null); // Remove any null entries

        console.log(`Hero carousel initialized with ${heroMoviesData.length} movies`);
    }

    /**
     * Filters the hero movies based on the current view (Movies vs Series).
     * @param {string} view - 'home', 'movies', 'series'
     * @returns {Array} Filtered hero movies
     */
    function getFilteredHeroMovies(view) {
        if (view === 'series') {
            // Only show Series in hero
            return heroMoviesData.filter(m => m.type === 'series');
        } else if (view === 'movies') {
            // Show only movies (keep welcome slide if type is undefined/custom, but welcome slide has no type usually)
            // Let's assume custom slides like Welcome slide should appear in Home and Movies, but not Series if we want strict Series hero
            return heroMoviesData.filter(m => m.type !== 'series');
        }
        return heroMoviesData;
    }

    // Initialize hero movies
    initializeHeroMovies();

    /**
     * Generates JSON-LD Structured Data for SEO
     * Helps search engines understand that these are Movies and TV Series.
     */
    function generateStructuredData() {
        const schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": allMoviesData.map((movie, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": movie.type === 'series' ? "TVSeries" : "Movie",
                    "name": movie.title,
                    "description": movie.description,
                    "image": `https://doraemonhub.netlify.app/${movie.imageUrl}`, // Ensure absolute URL
                    "url": `https://doraemonhub.netlify.app/${movie.type === 'series' ? 'series.html?id=' + movie.id : '#'}`
                }
            }))
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(schemaData);
        document.head.appendChild(script);
        console.log("SEO: Structured Data injected.");
    }

    // Call it immediately
    generateStructuredData();

    /**
     * Shows the movie info modal with all details populated
     * @param {Object} movie - The movie object with all details
     */
    function showMovieModal(movie) {
        currentModalMovieId = movie.id;

        // Basic info
        movieInfoTitle.textContent = movie.title;
        movieInfoDescription.textContent = movie.description;
        movieInfoImage.src = movie.imageUrl;
        movieInfoImage.alt = movie.title + " Poster";

        // Logic for Series vs Movie
        if (movie.type === 'series') {
            // Change button to "View Series" and redirect to series page
            movieInfoWatchButton.textContent = 'View Series';
            movieInfoWatchButton.href = `series.html?id=${movie.id}`;
            movieInfoWatchButton.target = '_self'; // Open in same tab
            movieInfoWatchButton.style.display = 'flex';

            // Hide series UI if exists
            const seriesContainer = document.getElementById('seriesUIContainer');
            if (seriesContainer) seriesContainer.style.display = 'none';
        } else {
            // Regular movie - show Watch button
            movieInfoWatchButton.textContent = 'Watch Now';
            movieInfoWatchButton.href = movie.videoUrl;
            movieInfoWatchButton.target = '_blank'; // Open in new tab
            movieInfoWatchButton.style.display = 'flex';

            // Hide series UI if exists
            const seriesContainer = document.getElementById('seriesUIContainer');
            if (seriesContainer) seriesContainer.style.display = 'none';
        }

        // Language
        if (movie.language) {
            movieInfoLanguage.textContent = movie.language;
            movieInfoLanguage.style.display = 'inline-flex';
        } else {
            movieInfoLanguage.style.display = 'none';
        }

        // Year - extract from title if present
        const yearMatch = movie.title.match(/\((\d{4})\)/);
        if (yearMatch) {
            movieInfoYear.textContent = yearMatch[1];
            movieInfoYear.style.display = 'inline-flex';
        } else {
            movieInfoYear.style.display = 'none';
        }

        // Genre - derive from category
        if (movie.category && movie.category.length > 0) {
            const genreMap = {
                'latestReleases': 'Latest',
                'doraemonClassics': 'Doraemon',
                'otherAnimeMovies': 'Anime'
            };
            const genres = movie.category.map(cat => genreMap[cat] || cat).filter(Boolean);
            if (genres.length > 0) {
                movieInfoGenre.textContent = genres.join(', ');
                movieInfoGenre.style.display = 'inline-flex';
            } else {
                movieInfoGenre.style.display = 'none';
            }
        } else {
            movieInfoGenre.style.display = 'none';
        }

        // Rating - show a default rating or hide if not available
        if (movie.rating) {
            movieInfoRating.textContent = movie.rating;
            movieInfoRating.style.display = 'inline-flex';
        } else {
            // Default rating for display purposes
            movieInfoRating.textContent = 'All Ages';
            movieInfoRating.style.display = 'inline-flex';
        }

        // Cast - hide for now as data doesn't include it
        if (movie.cast) {
            movieInfoCast.textContent = movie.cast;
            movieCastRow.style.display = 'flex';
        } else {
            movieCastRow.style.display = 'none';
        }

        // Runtime - hide for now as data doesn't include it
        if (movie.runtime) {
            movieInfoRuntime.textContent = movie.runtime;
            movieRuntimeRow.style.display = 'flex';
        } else {
            movieRuntimeRow.style.display = 'none';
        }

        // Update My List button state
        if (movieInfoMyListButton) {
            const isInList = userMyList.has(movie.id);
            if (isInList) {
                movieInfoMyListButton.classList.add('added');
                movieInfoMyListButton.querySelector('.my-list-text').textContent = 'Remove from List';
                movieInfoMyListButton.querySelector('.list-icon path').setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');
            } else {
                movieInfoMyListButton.classList.remove('added');
                movieInfoMyListButton.querySelector('.my-list-text').textContent = 'My List';
                movieInfoMyListButton.querySelector('.list-icon path').setAttribute('d', 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z');
            }
        }

        // Show modal with animation
        movieInfoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Log analytics if available
        if (analytics) {
            logEvent(analytics, 'view_movie_info', {
                movie_id: movie.id,
                movie_title: movie.title
            });
        }
    }

    /**
     * Renders the Season Selector and Episode List for a Series
     * @param {Object} movie - The series object
     */
    function renderSeriesUI(movie) {
        // 1. Setup Watch Button for Series (Netflix style)
        if (movie.seasons && movie.seasons.length > 0 && movie.seasons[0].episodes && movie.seasons[0].episodes.length > 0) {
            movieInfoWatchButton.href = movie.seasons[0].episodes[0].videoUrl;
            movieInfoWatchButton.style.display = 'flex';
        } else {
            movieInfoWatchButton.style.display = 'none';
        }

        // 2. Container for Series UI
        let seriesContainer = document.getElementById('seriesUIContainer');
        if (!seriesContainer) {
            seriesContainer = document.createElement('div');
            seriesContainer.id = 'seriesUIContainer';
            // Insert after description or before action buttons
            // Let's insert before action buttons so My List is at bottom
            const actionButtons = document.querySelector('.modal-action-buttons');
            actionButtons.parentNode.insertBefore(seriesContainer, actionButtons);
        }
        seriesContainer.innerHTML = ''; // Reset
        seriesContainer.style.display = 'block';

        // 3. Render Season Selector (if > 1 season)
        let currentSeasonIndex = 0;
        const seasons = movie.seasons || [];

        if (seasons.length > 1) {
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'season-selector-container';

            const selector = document.createElement('select');
            selector.className = 'season-selector';

            seasons.forEach((season, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = season.title ? `Season ${season.seasonNumber}: ${season.title}` : `Season ${season.seasonNumber}`;
                selector.appendChild(option);
            });

            selector.addEventListener('change', (e) => {
                currentSeasonIndex = parseInt(e.target.value);
                renderEpisodes(seasons[currentSeasonIndex].episodes, seriesContainer);
            });

            selectorContainer.appendChild(selector);
            seriesContainer.appendChild(selectorContainer);
        }

        // 4. Render Episodes
        if (seasons.length > 0) {
            renderEpisodes(seasons[0].episodes, seriesContainer);
        } else {
            seriesContainer.innerHTML += '<p class="text-gray-400">No episodes available.</p>';
        }
    }

    /**
     * Renders the list of episodes
     * @param {Array} episodes - Array of episode objects
     * @param {HTMLElement} container - Container to append to
     */
    function renderEpisodes(episodes, container) {
        // Remove existing list if any
        const existingList = container.querySelector('.episodes-container');
        if (existingList) existingList.remove();

        const episodesWrapper = document.createElement('div');
        episodesWrapper.className = 'episodes-container';

        const list = document.createElement('div');
        list.className = 'episode-list';

        episodes.forEach(ep => {
            const item = document.createElement('a');
            item.className = 'episode-item';
            item.href = ep.videoUrl;
            item.target = '_blank';

            item.innerHTML = `
                <div class="episode-number">${ep.episodeNumber}</div>
                <div class="episode-info">
                    <div class="episode-title">
                        ${ep.title}
                        <svg class="play-icon-mini" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                    </div>
                    <div class="episode-description">${ep.description || ''}</div>
                </div>
            `;

            // Analytics for episode click
            item.addEventListener('click', () => {
                if (analytics) {
                    logEvent(analytics, 'play_episode', {
                        series_title: movieInfoTitle.textContent,
                        episode_title: ep.title,
                        season_number: ep.seasonNumber // Note: pass this if needed, or derived
                    });
                }
            });

            list.appendChild(item);
        });

        episodesWrapper.appendChild(list);
        container.appendChild(episodesWrapper);
    }

    /**
     * Closes the movie info modal and resets its state
     */
    function closeMovieModal() {
        movieInfoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentModalMovieId = null;

        // Clean up Series UI
        const seriesContainer = document.getElementById('seriesUIContainer');
        if (seriesContainer) {
            seriesContainer.style.display = 'none';
        }
        // Restore Watch Button
        movieInfoWatchButton.style.display = 'flex';
    }

    /**
     * Displays the carousel slide at the given index.
     * Handles wrapping around to the beginning or end of the carousel.
     * @param {number} index The index of the slide to show.
     */
    function showSlide(index) {
        if (heroCarousel && carouselItems.length > 0) {
            // Handle index wrapping
            if (index >= carouselItems.length) {
                currentSlide = 0;
            } else if (index < 0) {
                currentSlide = carouselItems.length - 1;
            } else {
                currentSlide = index;
            }

            // CSS Fade Transition Logic: Toggle .active class on items
            carouselItems.forEach((item, idx) => {
                if (idx === currentSlide) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Update dots
            updateIndicators();
        }
    }

    /**
     * Advances the carousel to the next slide.
     */
    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    /**
     * Moves the carousel to the previous slide.
     */
    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    /**
     * Starts the automatic scrolling of the carousel.
     * Clears any existing interval before starting a new one.
     */
    function startAutoScroll() {
        stopAutoScroll(); // Clear any existing interval
        carouselInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    /**
     * Stops the automatic scrolling of the carousel.
     */
    function stopAutoScroll() {
        clearInterval(carouselInterval);
    }

    /**
     * Creates the indicator dots for the carousel based on the number of hero movies.
     * Attaches click listeners to each dot to navigate to the corresponding slide.
     */
    function createIndicators() {
        if (carouselIndicators) {
            carouselIndicators.innerHTML = '';
            heroMoviesData.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.classList.add('indicator-dot');
                if (index === currentSlide) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    stopAutoScroll();
                    showSlide(index);
                    startAutoScroll(); // Restart auto-scroll after manual interaction
                });
                carouselIndicators.appendChild(dot);
            });
        }
    }

    /**
     * Updates the active state of the carousel indicator dots.
     */
    function updateIndicators() {
        if (carouselIndicators) {
            const dots = carouselIndicators.querySelectorAll('.indicator-dot');
            dots.forEach((dot, index) => {
                if (index === currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    // Event listener for the previous button
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            stopAutoScroll();
            prevSlide();
            startAutoScroll(); // Restart auto-scroll after manual interaction
        });
    }

    // Event listener for the next button
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            stopAutoScroll();
            nextSlide();
            startAutoScroll(); // Restart auto-scroll after manual interaction
        });
    }

    // Touch Swipe Functionality for Carousel
    let touchStartX = 0;
    let touchEndX = 0;

    if (heroCarousel) {
        heroCarousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoScroll();
        }, { passive: true });

        heroCarousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoScroll();
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped Left -> Next Slide
                nextSlide();
            } else {
                // Swiped Right -> Prev Slide
                prevSlide();
            }
        }
    }

    // Auto-scroll on hover functionality
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopAutoScroll);
        heroSection.addEventListener('mouseleave', startAutoScroll);
    }

    /**
     * Renders the hero carousel dynamically based on the heroMoviesData array.
     * Creates carousel items, attaches content, and sets up event listeners for play buttons.
     * @param {Array} moviesToRender - Optional filtered list of movies to render. Defaults to all heroMoviesData.
     */
    function renderHeroCarousel(moviesToRender = null) {
        if (!heroCarousel) return;

        const data = moviesToRender || heroMoviesData; // Use passed data or default

        // If no data for this view (e.g. no series in hero config), fallback to default to avoid empty carousel
        const finalData = data.length > 0 ? data : heroMoviesData;

        heroCarousel.innerHTML = ''; // Clear existing items
        carouselItems = []; // Reset carouselItems array

        finalData.forEach((movie, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.classList.add('carousel-item');
            if (index === 0) {
                carouselItem.classList.add('active');
            }
            carouselItem.style.backgroundImage = `url('${movie.imageUrl}')`;
            const isWelcomeSlide = movie.title === "Welcome to Dorahub";

            let watchLink = movie.videoUrl || '#';
            let targetAttr = '_blank';

            if (movie.type === 'series') {
                watchLink = `series.html?id=${movie.id}`;
                targetAttr = '_self'; // Open series page in same tab
            } else if (movie.seasons && movie.seasons.length > 0 && movie.seasons[0].episodes && movie.seasons[0].episodes.length > 0) {
                // Fallback for weird data structures or if we revert
                watchLink = movie.seasons[0].episodes[0].videoUrl;
            }

            const buttonHtml = isWelcomeSlide ?
                `<a href="#latestReleases" class="play-button explore-button" style="text-decoration:none;">Explore Movies</a>` :
                `<a href="${watchLink}" target="${targetAttr}" class="play-button" data-movie-title="${movie.title}">
                    <svg viewBox="0 0 24 24" width="24" height="24" class="mr-2" fill="currentColor">
                        <path d="M8 5v14l11-7z"></path>
                    </svg>
                    Play
                 </a>
                 <button class="info-button">
                    <svg viewBox="0 0 24 24" width="24" height="24" class="mr-2" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                    </svg>
                    More Info
                 </button>`;

            carouselItem.innerHTML = `
                <div class="hero-content">
                    <h1>${movie.title}</h1>
                    <p>${movie.description}</p>
                    <div class="hero-buttons">
                        ${buttonHtml}
                    </div>
                </div>
            `;
            heroCarousel.appendChild(carouselItem);
            carouselItems.push(carouselItem);

            const playButton = carouselItem.querySelector('.play-button');
            if (playButton) {
                playButton.addEventListener('click', (e) => {
                    if (playButton.classList.contains('explore-button')) {
                        e.preventDefault();
                        const targetSection = document.getElementById('latestReleases');
                        if (targetSection) {
                            targetSection.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            // Fallback to scrolling to main content if specific section is missing
                            const mainContent = document.querySelector('main.content-sections');
                            if (mainContent) mainContent.scrollIntoView({ behavior: 'smooth' });
                        }
                        return;
                    }

                    if (analytics) {
                        logEvent(analytics, 'play_video', {
                            movie_title: playButton.dataset.movieTitle
                        });
                    }
                });
            }

            const infoButton = carouselItem.querySelector('.info-button');
            if (infoButton) {
                // Capture the movie object in the closure by using a data attribute
                infoButton.setAttribute('data-movie-id', movie.id);
                infoButton.addEventListener('click', () => {
                    // Find the movie from the data
                    const movieId = infoButton.getAttribute('data-movie-id');
                    const movieData = heroMoviesData.find(m => m.id === movieId);
                    if (movieData) {
                        showMovieModal(movieData);
                    }
                });
            }
        });

        createIndicators();
        showSlide(currentSlide);
        startAutoScroll(); // Start auto-scroll after initial render
    }

    // Initial render of the carousel
    renderHeroCarousel();

    let isSearchActive = false;
    let userMyList = new Set();

    // --- Firebase Initialization ---
    async function initializeFirebase() {
        const appId = typeof __app_id !== 'undefined' ? __app_id : LOCAL_APP_ID;
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : LOCAL_FIREBASE_CONFIG;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? initialAuthToken : null;

        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.error("Firebase config is missing or empty, or using placeholder values. Cannot connect to a real Firebase project for persistence.");
            document.getElementById('userIdTooltip').textContent = "Firebase (Local Mode)";
            document.getElementById('userIdTooltip').classList.add('show');
            setTimeout(() => {
                document.getElementById('userIdTooltip').classList.remove('show');
            }, 3000);
            const myListSection = document.getElementById('myListSection');
            if (myListSection) myListSection.style.display = 'none';
            renderAllMovies(new Set());
            return;
        }

        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            console.log("Firebase app initialized.");

            if (firebaseConfig.measurementId) {
                analytics = getAnalytics(app);
                console.log("Firebase Analytics initialized.");
            }

            await new Promise(resolve => {
                onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        console.log("No user found. Attempting sign-in...");
                        if (initialAuthToken) {
                            try {
                                await signInWithCustomToken(auth, initialAuthToken);
                                console.log("Signed in with custom token.");
                            } catch (error) {
                                console.error("Error signing in with custom token:", error);
                                await signInAnonymously(auth);
                                console.log("Signed in anonymously as custom token failed.");
                            }
                        } else {
                            await signInAnonymously(auth);
                            console.log("Signed in anonymously (no custom token provided).");
                        }
                    } else {
                        console.log("User already authenticated.");
                    }
                    resolve();
                });
            });

            currentUserId = auth.currentUser?.uid;
            if (currentUserId) {
                document.getElementById('userIdTooltip').textContent = `User ID: ${currentUserId}`;
                myListCollectionRef = collection(db, `artifacts/${appId}/users/${currentUserId}/myList`);
                console.log(`Firebase User ID: ${currentUserId}`);
                console.log("Firestore MyList collection reference set up.");

                onSnapshot(doc(myListCollectionRef, 'items'), (docSnapshot) => {
                    console.log("My List snapshot listener triggered.");
                    if (docSnapshot.exists()) {
                        const data = docSnapshot.data();
                        const movieIds = new Set(data.movieIds || []);
                        userMyList = movieIds;
                        console.log("My List data updated:", Array.from(userMyList));
                    } else {
                        userMyList = new Set();
                        console.log("My List document does not exist, initializing empty list.");
                        setDoc(doc(myListCollectionRef, 'items'), { movieIds: [] }, { merge: true }).catch(e => {
                            console.error("Error creating initial My List document:", e);
                        });
                    }
                    renderMyList(userMyList);
                    // If we are currently viewing Home/Series/Movies, re-render to update the checkmarks
                    if (currentView !== 'myList') {
                        renderAllMovies(userMyList, currentView);
                    } else {
                        // If we are in My List view, renderAllMovies('myList') handles showing the list section
                        renderAllMovies(userMyList, 'myList');
                    }
                    console.log("My List and All Movies rendered based on snapshot.");
                }, (error) => {
                    console.error("Error listening to My List:", error);
                    document.getElementById('myListEmptyMessage').textContent = "Error loading your list.";
                    myListEmptyMessage.style.display = 'block';
                    myListSection.style.display = 'block';
                    renderAllMovies(userMyList, currentView);
                    console.log("Rendering all movies due to My List listener error.");
                });

            } else {
                document.getElementById('userIdTooltip').textContent = `Error: User ID Not Available`;
                console.error("Firebase Auth: User ID not available after authentication attempt.");
                const myListSection = document.getElementById('myListSection');
                if (myListSection) myListSection.style.display = 'none';
                renderAllMovies(new Set());
                console.log("Rendering all movies (User ID not available).");
            }

        } catch (error) {
            console.error("Fatal Error during Firebase initialization or sign-in:", error);
            document.getElementById('userIdTooltip').textContent = `Error: ${error.message}`;
            const myListSection = document.getElementById('myListSection');
            if (myListSection) myListSection.style.display = 'none';
            renderAllMovies(new Set());
            console.log("Rendering all movies (Firebase initialization failed).");
        }
    }

    async function addMovieToMyList(movieId) {
        try {
            const docRef = doc(myListCollectionRef, 'items');
            await setDoc(docRef, {
                movieIds: arrayUnion(movieId)
            }, { merge: true });
            console.log(`Movie ${movieId} added to My List in Firestore.`);
        }
        catch (e) {
            console.error("Error adding document to My List: ", e);
        }
    }

    async function removeMovieFromMyList(movieId) {
        try {
            const docRef = doc(myListCollectionRef, 'items');
            await updateDoc(docRef, {
                movieIds: arrayRemove(movieId)
            });
            console.log(`Movie ${movieId} removed from My List in Firestore.`);
        }
        catch (e) {
            console.error("Error removing document from My List: ", e);
        }
    }

    function createMovieCard(movie, isInMyList = false) {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.setAttribute('data-movie-id', movie.id);

        const language = movie.language ? movie.language : '';

        // For series, use series page link instead of direct video
        const watchLink = movie.type === 'series' ? `series.html?id=${movie.id}` : movie.videoUrl;
        const watchTarget = movie.type === 'series' ? '_self' : '_blank';

        movieCard.innerHTML = `
            <img src="${movie.imageUrl}" onerror="this.src='https://placehold.co/400x260/f0f0f0/888888?text=Poster+Missing';" alt="${movie.title} Poster">
            <div class="movie-card-overlay">
                ${movie.type === 'series' ? '<span class="series-badge">Series</span>' : ''}
                <h2 class="movie-title">${movie.title}</h2>
                <span class="movie-rating">${language}</span>
                <div class="flex gap-2 mt-3">
                    <a href="${watchLink}" target="${watchTarget}" class="watch-button text-xs px-3 py-2">
                        <svg class="watch-icon w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                        ${movie.type === 'series' ? 'View Series' : 'Watch'}
                    </a>
                    <button class="my-list-button ${isInMyList ? 'added' : ''} text-white hover:text-yellow-400" data-movie-id="${movie.id}">
                        ${isInMyList ?
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' :
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
            }
                    </button>
                    <button class="more-info-button" data-movie-id="${movie.id}" title="More Info">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        const watchButton = movieCard.querySelector('.watch-button');
        if (watchButton) {
            watchButton.addEventListener('click', () => {
                if (analytics) {
                    logEvent(analytics, movie.type === 'series' ? 'view_series' : 'play_video', {
                        movie_title: movie.title
                    });
                }
            });
        }

        const myListBtn = movieCard.querySelector('.my-list-button');
        if (myListBtn) {
            myListBtn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const movieId = event.currentTarget.dataset.movieId;
                if (currentUserId) {
                    if (userMyList.has(movieId)) {
                        await removeMovieFromMyList(movieId);
                    } else {
                        await addMovieToMyList(movieId);
                        if (analytics) {
                            logEvent(analytics, 'add_to_my_list', {
                                movie_id: movie.id,
                                movie_title: movie.title
                            });
                        }
                    }
                } else {
                    console.warn("User not authenticated. Cannot add/remove from My List.");
                    console.error("Please ensure Firebase is configured or you're signed in to use My List.");
                }
            });
        }

        // More Info Button Handler
        const moreInfoBtn = movieCard.querySelector('.more-info-button');
        if (moreInfoBtn) {
            moreInfoBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                // Always show modal for More Info button (both movies and series)
                showMovieModal(movie);
            });
        }

        // Full card click for mobile usability (Netflix style)
        movieCard.addEventListener('click', (event) => {
            if (!event.target.closest('button') && !event.target.closest('a')) {
                // Always show modal on card click (both movies and series)
                showMovieModal(movie);
            }
        });

        return movieCard;
    }

    function renderAllMovies(myListIds, view = 'home') {
        console.log(`renderAllMovies called with view: ${view}`);
        const mainContent = document.querySelector('main.content-sections');
        document.querySelectorAll('.category-section:not(#searchResultsSection):not(#myListSection):not(#supportSection)').forEach(section => section.remove());

        // Handle My List View
        if (view === 'myList') {
            myListSection.style.display = 'block';
            const supportSection = document.getElementById('supportSection');
            if (supportSection) supportSection.style.display = 'none';
            renderMyList(myListIds);
            if (typeof heroSection !== 'undefined') heroSection.style.display = 'none';
            // Add padding when hero is hidden
            mainContent.classList.add('no-hero');
            document.querySelector('header')?.classList.remove('transparent-mode'); // Reset header
            return;
        }

        // Handle Support View
        else if (view === 'support') {
            myListSection.style.display = 'none';
            if (typeof heroSection !== 'undefined') heroSection.style.display = 'none';
            mainContent.classList.add('no-hero');
            document.querySelector('header')?.classList.remove('transparent-mode');

            // Show Support Section specifically
            const supportSection = document.getElementById('supportSection');
            if (supportSection) {
                supportSection.style.display = 'block';
                // Inject options if empty
                const grid = document.getElementById('supportOptionsGrid');
                if (grid) {
                    grid.innerHTML = '';
                    supportData.forEach(item => {
                        const card = document.createElement('div');
                        card.className = 'crypto-option';

                        let addressHtml = '';
                        if (item.address) {
                            // Unique ID for copy functionality
                            const addressId = `addr_${item.name.replace(/\s+/g, '')}`;
                            addressHtml = `
                                <div class="crypto-container">
                                    <input type="text" class="crypto-address" value="${item.address}" readonly id="${addressId}">
                                    <button class="copy-button" onclick="copyToClipboard('${addressId}', this)">Copy</button>
                                </div>
                            `;
                        } else {
                            addressHtml = `<p class="text-sm text-gray-500 mt-2">Scan QR in App</p>`;
                        }

                        const logoHtml = item.logo ? `<img src="${item.logo}" class="brand-mini-logo" alt="logo" style="width: 24px; height: 24px; margin-right: 8px; vertical-align: middle;">` : '';
                        const qrHtml = item.qrCode ? `<div class="crypto-logo-wrapper" style="display: flex; justify-content: center;"><img src="${item.qrCode}" alt="${item.name}" class="crypto-logo" style="width: 150px; height: 150px; object-fit: contain;"></div>` : '';

                        card.innerHTML = `
                            <div>
                                <h3 class="crypto-name" style="display: flex; align-items: center; justify-content: center;">${logoHtml}${item.name}</h3>
                                ${qrHtml}
                                ${!item.address ? addressHtml : ''}
                            </div>
                            <div class="crypto-container-wrapper">
                                ${item.address ? addressHtml : ''}
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                }
            }
            return;
        } else {
            const supportSection = document.getElementById('supportSection');
            if (supportSection) supportSection.style.display = 'none';
            myListSection.style.display = 'none';

            // Only show Hero on Home view
            if (view === 'home') {
                if (typeof heroSection !== 'undefined') {
                    heroSection.style.display = 'block';
                    mainContent.classList.remove('no-hero'); // Remove padding
                    // Update Hero content based on view (just home now)
                    const filteredHeroes = getFilteredHeroMovies(view);
                    renderHeroCarousel(filteredHeroes);
                    // Enable Transparent Header for Immersive Home
                    document.querySelector('header')?.classList.add('transparent-mode');
                }
            } else {
                // Hide hero for Series and Movies views
                if (typeof heroSection !== 'undefined') heroSection.style.display = 'none';
                mainContent.classList.add('no-hero'); // Add padding
                document.querySelector('header')?.classList.remove('transparent-mode'); // Reset header
            }
        }

        // 1. Render TV Series Section First (or wherever preferred, let's put it at top)
        if (view === 'home' || view === 'series') {
            const seriesData = allMoviesData.filter(m => m.type === 'series');
            if (seriesData.length > 0) {
                const section = document.createElement('section');
                section.className = 'category-section';
                section.id = 'tvSeries';
                section.innerHTML = `<h2 class="category-title">TV Series</h2><div class="movie-row"></div>`;

                const movieRowDiv = section.querySelector('.movie-row');
                seriesData.forEach(movie => {
                    const isInList = myListIds.has(movie.id);
                    movieRowDiv.appendChild(createMovieCard(movie, isInList));
                });
                mainContent.insertBefore(section, searchResultsSection);
                console.log(`Category "TV Series" rendered with ${seriesData.length} items.`);
            }
        }

        // 2. Render Standard Categories (Movies Only)
        if (view === 'home' || view === 'movies') {
            const categoryOrder = ['latestReleases', 'doraemonClassics', 'otherAnimeMovies'];

            categoryOrder.forEach(categoryKey => {
                // Filter by category AND ensure it's NOT a series (to avoid duplication/blending)
                const categoryMovies = allMoviesData.filter(movie =>
                    movie.category.includes(categoryKey) && movie.type !== 'series'
                );

                if (categoryMovies && categoryMovies.length > 0) {
                    const section = document.createElement('section');
                    section.className = 'category-section';
                    section.id = categoryKey;
                    const formattedTitle = categoryKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                    section.innerHTML = `<h2 class="category-title">${formattedTitle}</h2><div class="movie-row"></div>`;

                    const movieRowDiv = section.querySelector('.movie-row');
                    categoryMovies.forEach(movie => {
                        const isInList = myListIds.has(movie.id);
                        movieRowDiv.appendChild(createMovieCard(movie, isInList));
                    });
                    mainContent.insertBefore(section, searchResultsSection);
                    console.log(`Category "${formattedTitle}" rendered with ${categoryMovies.length} movies.`);
                } else {
                    console.log(`Category "${categoryKey}" has no movies to render.`);
                }
            });
        }
    }

    function renderMyList(myListIds) {
        console.log("renderMyList called.");
        myListGrid.innerHTML = '';
        if (myListIds.size > 0) {
            myListEmptyMessage.style.display = 'none';
            myListSection.style.display = 'block';
            const moviesInMyList = allMoviesData.filter(movie => myListIds.has(movie.id));
            moviesInMyList.forEach(movie => {
                myListGrid.appendChild(createMovieCard(movie, true));
            });
            console.log(`My List rendered with ${moviesInMyList.length} movies.`);
        }
        else {
            myListEmptyMessage.style.display = 'block';
            myListSection.style.display = 'block';
            console.log("My List is empty.");
        }
    }

    function displayMovies(moviesToDisplay) {
        console.log("displayMovies (search results) called.");
        searchResultsGrid.innerHTML = '';

        if (moviesToDisplay.length > 0) {
            noResultsMessage.style.display = 'none';
            moviesToDisplay.forEach(movie => {
                searchResultsGrid.appendChild(createMovieCard(movie, userMyList.has(movie.id)));
            });
            searchResultsSection.style.display = 'block';
            console.log(`Search results displayed: ${moviesToDisplay.length} movies.`);
        } else {
            searchResultsSection.style.display = 'block';
            noResultsMessage.style.display = 'block';
            console.log("No search results found.");
        }
    }

    renderAllMovies(new Set());
    console.log("Initial rendering of all movies completed.");

    function toggleOriginalCategoriesAndHero(show) {
        const supportSection = document.getElementById('supportSection');

        if (show) {
            // Restore ONLY based on currentView
            if (currentView === 'home') {
                if (heroSection) {
                    heroSection.style.display = 'block';
                    heroSection.classList.remove('hidden-by-search');
                }
                document.querySelector('header')?.classList.add('transparent-mode');
                // Show dynamic category rows only
                document.querySelectorAll('.category-section:not(#searchResultsSection):not(#myListSection):not(#supportSection)').forEach(section => {
                    section.style.display = 'block';
                });
                if (myListSection) myListSection.style.display = 'none';
                if (supportSection) supportSection.style.display = 'none';
            } else if (currentView === 'myList') {
                if (heroSection) heroSection.style.display = 'none';
                document.querySelector('header')?.classList.remove('transparent-mode');
                if (myListSection) myListSection.style.display = 'block';
                // Hide ALL others
                document.querySelectorAll('.category-section:not(#myListSection)').forEach(section => section.style.display = 'none');
            } else if (currentView === 'support') {
                if (heroSection) heroSection.style.display = 'none';
                document.querySelector('header')?.classList.remove('transparent-mode');
                if (supportSection) supportSection.style.display = 'block';
                // Hide ALL others
                document.querySelectorAll('.category-section:not(#supportSection)').forEach(section => section.style.display = 'none');
            } else {
                // series, movies category view
                if (heroSection) heroSection.style.display = 'none';
                document.querySelector('header')?.classList.remove('transparent-mode');
                document.querySelectorAll('.category-section:not(#searchResultsSection):not(#myListSection):not(#supportSection)').forEach(section => {
                    section.style.display = 'block';
                });
                if (myListSection) myListSection.style.display = 'none';
                if (supportSection) supportSection.style.display = 'none';
            }
        } else {
            // Hiding for search
            if (heroSection) {
                heroSection.style.display = 'none';
                heroSection.classList.add('hidden-by-search');
            }
            document.querySelector('header')?.classList.remove('transparent-mode');
            document.querySelectorAll('.category-section:not(#searchResultsSection)').forEach(section => {
                section.style.display = 'none';
            });
        }
    }

    // Global Key Listener for robustness
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSearchActive) {
            deactivateSearch();
        }
    });

    function activateSearch() {
        isSearchActive = true;
        if (searchToggleButton) searchToggleButton.classList.add('active');
        if (movieSearchInput) {
            movieSearchInput.classList.add('active');
            movieSearchInput.focus();
        }

        // Hide other controls if they exist
        const donateNav = document.getElementById('donateNavButton');
        if (donateNav) donateNav.classList.add('hidden');
        if (donateButton) donateButton.classList.add('hidden');
        if (userIdToggleButton) userIdToggleButton.classList.add('hidden');
        if (userIdTooltip) userIdTooltip.classList.remove('show');

        // Hide hero and categories
        toggleOriginalCategoriesAndHero(false);

        // Show search results section with active class for overlay effect
        if (searchResultsSection) {
            searchResultsSection.style.display = 'block';
            searchResultsSection.classList.add('active');
        }
        document.body.style.overflow = 'auto'; // Enable scrolling for search results

        displayMovies([]);
    }

    function deactivateSearch() {
        isSearchActive = false;
        if (searchToggleButton) searchToggleButton.classList.remove('active');
        if (movieSearchInput) {
            movieSearchInput.classList.remove('active');
            movieSearchInput.value = '';
        }

        // Show other controls
        const donateNav = document.getElementById('donateNavButton');
        if (donateNav) donateNav.classList.remove('hidden');
        if (donateButton) donateButton.classList.remove('hidden');
        if (userIdToggleButton) userIdToggleButton.classList.remove('hidden');

        // Hide search results
        if (searchResultsSection) {
            searchResultsSection.style.display = 'none';
            searchResultsSection.classList.remove('active');
        }
        if (noResultsMessage) noResultsMessage.style.display = 'none';

        // Restore hero and categories
        toggleOriginalCategoriesAndHero(true);
    }

    if (searchToggleButton) {
        searchToggleButton.addEventListener('click', function () {
            if (isSearchActive) {
                deactivateSearch();
            }
            else {
                activateSearch();
            }
        });
    }

    if (movieSearchInput) {
        movieSearchInput.addEventListener('keyup', function (event) {
            if (event.key === 'Escape') {
                deactivateSearch();
                return;
            }

            const searchTerm = movieSearchInput.value.toLowerCase().trim();

            if (searchTerm.length > 0) {
                const filteredMovies = allMoviesData.filter(movie =>
                    movie.title.toLowerCase().includes(searchTerm) || movie.description.toLowerCase().includes(searchTerm)
                );
                displayMovies(filteredMovies);
            }
            else {
                displayMovies([]);
            }
        });
    }

    var infoModal = document.getElementById("movieInfoModal");
    var span = document.getElementsByClassName("close-button");

    // Old donate logic removed.
    // The "Support Us" button (donateNavButton) now routes to the Support view via navigation logic.

    for (let i = 0; i < span.length; i++) {
        span[i].onclick = function () {
            if (infoModal) {
                infoModal.style.display = "none";
            }
            document.body.style.overflow = "auto";
            if (copiedMessageElement) {
                copiedMessageElement.classList.remove('show');
            }
        }
    }

    window.onclick = function (event) {
        if (event.target == infoModal) {
            closeMovieModal();
        }
        if (userIdTooltip.classList.contains('show') && !userIdTooltip.contains(event.target) && event.target !== userIdToggleButton && !userIdToggleButton.contains(event.target)) {
            userIdTooltip.classList.remove('show');
        }
    }

    // My List Button in Modal Handler
    if (movieInfoMyListButton) {
        movieInfoMyListButton.addEventListener('click', async () => {
            if (!currentModalMovieId || !currentUserId) {
                console.warn("Cannot add/remove from list: No movie selected or user not authenticated");
                return;
            }

            const isInList = userMyList.has(currentModalMovieId);

            if (isInList) {
                await removeMovieFromMyList(currentModalMovieId);
                movieInfoMyListButton.classList.remove('added');
                movieInfoMyListButton.querySelector('.my-list-text').textContent = 'My List';
                movieInfoMyListButton.querySelector('.list-icon path').setAttribute('d', 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z');
            } else {
                await addMovieToMyList(currentModalMovieId);
                movieInfoMyListButton.classList.add('added');
                movieInfoMyListButton.querySelector('.my-list-text').textContent = 'Remove from List';
                movieInfoMyListButton.querySelector('.list-icon path').setAttribute('d', 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z');

                if (analytics) {
                    logEvent(analytics, 'add_to_my_list_modal', {
                        movie_id: currentModalMovieId
                    });
                }
            }
        });
    }


    function copyToClipboard(elementId, btnElement) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Error: Element with ID '${elementId}' not found for copy function.`);
            return;
        }
        const textToCopy = element.innerText.split(' ')[0];

        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;
        document.body.appendChild(tempTextArea);

        tempTextArea.select();
        document.execCommand('copy');

        document.body.removeChild(tempTextArea);

        // Button Feedback
        if (btnElement) {
            const originalText = btnElement.innerText;
            btnElement.innerText = 'Copied!';
            btnElement.style.background = '#10b981'; // Green feedback

            setTimeout(() => {
                btnElement.innerText = originalText;
                btnElement.style.background = ''; // Reset to CSS default
            }, 2000);
        }

        // Global Toast (Optional)
        if (copiedMessageElement) {
            copiedMessageElement.classList.add('show');
            setTimeout(() => {
                if (copiedMessageElement) {
                    copiedMessageElement.classList.remove('show');
                }
            }, 2000);
        }
    }

    window.copyToClipboard = copyToClipboard;

    let userIdTooltipTimeout;

    if (userIdToggleButton && userIdTooltip) {
        userIdToggleButton.addEventListener('click', function (event) {
            event.stopPropagation();
            userIdTooltip.classList.toggle('show');
            clearTimeout(userIdTooltipTimeout);
            if (userIdTooltip.classList.contains('show')) {
                userIdTooltipTimeout = setTimeout(() => {
                    userIdTooltip.classList.remove('show');
                }, 3000);
            }
        });
    }

    // Mobile Menu Logic
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNavSidebar = document.getElementById('mobileNavSidebar');
    const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
    const closeMobileNav = document.querySelector('.close-mobile-nav');
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

    function openMobileMenu() {
        if (mobileNavSidebar) {
            mobileNavSidebar.classList.add('active');
            if (mobileNavBackdrop) mobileNavBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeMobileMenu() {
        if (mobileNavSidebar) {
            mobileNavSidebar.classList.remove('active');
            if (mobileNavBackdrop) mobileNavBackdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', openMobileMenu);
    }

    if (closeMobileNav) {
        closeMobileNav.addEventListener('click', closeMobileMenu);
    }

    if (mobileNavBackdrop) {
        mobileNavBackdrop.addEventListener('click', closeMobileMenu);
    }

    mobileNavItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update Active State
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Close Menu
            closeMobileMenu();

            // Navigation Logic (Similar to main nav)
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const category = item.getAttribute('data-category');
            if (category === 'support') {
                currentView = 'support';
                renderAllMovies(null, 'support');
                document.querySelector('main.content-sections').classList.add('no-hero');
                document.querySelector('header')?.classList.remove('transparent-mode');
                if (isSearchActive) deactivateSearch();

                // Sync desktop nav
                navItems.forEach(nav => nav.classList.remove('active'));
                const donateNav = document.getElementById('donateNavButton');
                if (donateNav) donateNav.classList.add('active');
                return;
            }

            if (!category) return;

            currentView = category;

            if (isSearchActive) deactivateSearch();

            if (category === 'myList') {
                renderAllMovies(userMyList, 'myList');
                document.querySelector('main.content-sections').classList.add('no-hero');
            } else {
                renderAllMovies(userMyList, category);
                const mainContent = document.querySelector('main.content-sections');
                if (category === 'home') {
                    mainContent.classList.remove('no-hero');
                } else {
                    mainContent.classList.add('no-hero');
                }
            }

            // Sync Main Nav
            navItems.forEach(nav => {
                if (nav.getAttribute('data-category') === category || (category === 'support' && nav.id === 'donateNavButton')) {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });
        });
    });

    // Scroll to top button functionality
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");

    window.onscroll = function () {
        // Scroll to top button logic
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }

        // Header scroll effect
        const header = document.querySelector('header');
        if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    scrollToTopBtn.addEventListener('click', function () {
        document.body.scrollTop = 0; // For Safari
        document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    });

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    let currentView = 'home';

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Update View
            // Start view update
            const category = item.getAttribute('data-category');
            if (item.id === 'donateNavButton' || category === 'support') {
                currentView = 'support';
                // Trigger render with 'support' which handles the new section
                renderAllMovies(null, 'support');
                document.querySelector('main.content-sections').classList.add('no-hero');
                document.querySelector('header')?.classList.remove('transparent-mode');
                if (isSearchActive) deactivateSearch();
                return;
            }

            if (!category) return; // Safety

            currentView = category;

            if (category === 'myList' && !currentUserId) {
                // If user tries to access My List without auth (fallback)
                // We'll still show the empty state or local list if we supported it
            }

            // Close Search if open
            if (isSearchActive) deactivateSearch();

            // Re-render
            if (category === 'myList') {
                renderAllMovies(userMyList, 'myList');
                // Ensure padding is added for My List too if hero is hidden (it is)
                document.querySelector('main.content-sections').classList.add('no-hero');
            } else {
                renderAllMovies(userMyList, category);
                // Explicitly handle class here for immediate feedback, though renderAllMovies does it too
                const mainContent = document.querySelector('main.content-sections');
                if (category === 'home') {
                    mainContent.classList.remove('no-hero');
                } else {
                    mainContent.classList.add('no-hero');
                }
            }
        });
    });

    // Logo Click Handler
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
        headerLogo.addEventListener('click', () => {
            currentView = 'home';

            // Reset Nav Active State
            navItems.forEach(nav => {
                if (nav.getAttribute('data-category') === 'home') {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });

            // Scroll to Top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Close Search if open
            if (isSearchActive) deactivateSearch();

            // Render Home View
            renderAllMovies(userMyList, 'home');
            document.querySelector('main.content-sections').classList.remove('no-hero');
        });
    }

    // Handle Link Navigation (Hash-based)
    function handleHashNavigation() {
        const hash = window.location.hash.substring(1); // Remove '#'
        if (!hash) return false;

        console.log(`Handling hash navigation: ${hash}`);

        // Map hash to category/view
        let targetCategory = '';
        if (hash === 'series') targetCategory = 'series';
        else if (hash === 'movies') targetCategory = 'movies';
        else if (hash === 'myList') targetCategory = 'myList';
        else if (hash === 'support') targetCategory = 'support';

        if (targetCategory) {
            currentView = targetCategory;

            // Update Nav Active State
            navItems.forEach(nav => {
                const navCat = nav.getAttribute('data-category');
                if (navCat === targetCategory || (targetCategory === 'support' && nav.id === 'donateNavButton')) {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });

            // Specific View Logic
            if (targetCategory === 'support') {
                renderAllMovies(null, 'support');
                document.querySelector('main.content-sections').classList.add('no-hero');
                document.querySelector('header')?.classList.remove('transparent-mode');
            } else if (targetCategory === 'myList') {
                renderAllMovies(userMyList, 'myList');
                document.querySelector('main.content-sections').classList.add('no-hero');
            } else {
                renderAllMovies(userMyList, targetCategory);
                const mainContent = document.querySelector('main.content-sections');
                if (targetCategory === 'home') {
                    mainContent.classList.remove('no-hero');
                } else {
                    mainContent.classList.add('no-hero');
                }
            }
            return true;
        }
        return false;
    }

    // Attempt hash nav, if unrelated or empty, default to home is already handled roughly by initial variable state, 
    // BUT we executed renderAllMovies(new Set()) earlier. We might need to override it.
    if (handleHashNavigation()) {
        console.log("Navigated via hash.");
    }

    // Listen for hash changes (if user clicks hash links while on the page)
    window.addEventListener('hashchange', () => {
        handleHashNavigation();
    });

    initializeFirebase();
});