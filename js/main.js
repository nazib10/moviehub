// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

import { allMoviesData } from '/js/data.js';

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

// Hero Carousel Movie Data
const heroMoviesData = [
    {
        title: "Death Note: Visions of God",
        description: "A thrilling psychological thriller where a brilliant student discovers a supernatural notebook that allows him to kill anyone whose name he writes in it.",
        imageUrl: "images/death-note-relight.jpg", // Updated with actual image
        videoUrl: "https://www.facebook.com/nazibul.haque.958129/videos/1266322374949691/" // Placeholder for video URL
    },
    {
        title: "Doraemon: Sky Utopia",
        description: "Join Nobita and Doraemon in a grand adventure to find the perfect sky utopia, where dreams take flight and new friendships are forged!",
        imageUrl: "images/doraemon-sky-utopia.jpg", // Updated with actual image
        videoUrl: "https://www.facebook.com/nazibul.haque.955129/videos/3932224157088366/"
    },
    {
        title: "Doraemon: Nobita's Great Adventure in the South Seas",
        description: "Doraemon and Nobita embark on a thrilling journey to the South Seas, encountering pirates and hidden treasures.",
        imageUrl: "images/doraemon-treasure-island.jpg", // Updated with actual image
        videoUrl: "https://www.facebook.com/nazibul.haque.958129/videos/640454295760593/" // Placeholder for video URL
    },
    {
        title: "Shinchan: The Adult Empire Strikes Back",
        description: "Shinchan and his family must save the world from adults who want to revert to their childhood.",
        imageUrl: "images/shinchan-adult-empire.jpg", // Updated with actual image
        videoUrl: "https://www.facebook.com/nazibul.haque.958129/videos/1802085427401967/" // Placeholder for video URL
    }
];

document.addEventListener('DOMContentLoaded', async function() {
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

    // Carousel elements
    const heroCarousel = document.getElementById('heroCarousel');
    let carouselItems = []; // Will be populated dynamically
    const prevButton = document.querySelector('.carousel-control.prev');
    const nextButton = document.querySelector('.carousel-control.next');
    const carouselIndicators = document.querySelector('.carousel-indicators');

    let currentSlide = 0;
    let carouselInterval;

    /**
     * Displays the carousel slide at the given index.
     * Handles wrapping around to the beginning or end of the carousel.
     * @param {number} index The index of the slide to show.
     */
    function showSlide(index) {
        if (heroCarousel && carouselItems.length > 0) {
            if (index >= carouselItems.length) {
                currentSlide = 0;
            } else if (index < 0) {
                currentSlide = carouselItems.length - 1;
            } else {
                currentSlide = index;
            }
            // Apply a CSS transform to shift the carousel horizontally
            heroCarousel.style.transform = `translateX(${-currentSlide * 100}%)`;
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

    // Auto-scroll on hover functionality
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopAutoScroll);
        heroSection.addEventListener('mouseleave', startAutoScroll);
    }

    /**
     * Renders the hero carousel dynamically based on the heroMoviesData array.
     * Creates carousel items, attaches content, and sets up event listeners for play buttons.
     */
    function renderHeroCarousel() {
        if (!heroCarousel) return;

        heroCarousel.innerHTML = ''; // Clear existing items
        carouselItems = []; // Reset carouselItems array

        heroMoviesData.forEach((movie, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.classList.add('carousel-item');
            if (index === 0) {
                carouselItem.classList.add('active');
            }
            carouselItem.style.backgroundImage = `url('${movie.imageUrl}')`;
            carouselItem.innerHTML = `
                <div class="hero-content">
                    <h1>${movie.title}</h1>
                    <p>${movie.description}</p>
                    <div class="hero-buttons">
                        <a href="${movie.videoUrl}" target="_blank" class="play-button" data-movie-title="${movie.title}">
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
                        </button>
                    </div>
                </div>
            `;
            heroCarousel.appendChild(carouselItem);
            carouselItems.push(carouselItem);

            // Attach event listener to the play button of the newly created carousel item
            const playButton = carouselItem.querySelector('.play-button');
            if (playButton) {
                playButton.addEventListener('click', () => {
                    if (analytics) {
                        logEvent(analytics, 'play_video', {
                            movie_title: playButton.dataset.movieTitle
                        });
                    }
                });
            }

            const infoButton = carouselItem.querySelector('.info-button');
            if (infoButton) {
                infoButton.addEventListener('click', () => {
                    movieInfoTitle.textContent = movie.title;
                    movieInfoDescription.textContent = movie.description;
                    movieInfoImage.src = movie.imageUrl;
                    movieInfoLanguage.textContent = movie.language || '';
                    movieInfoWatchButton.href = movie.videoUrl;
                    movieInfoModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
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
                    renderAllMovies(userMyList);
                    console.log("My List and All Movies rendered based on snapshot.");
                }, (error) => {
                    console.error("Error listening to My List:", error);
                    document.getElementById('myListEmptyMessage').textContent = "Error loading your list.";
                    myListEmptyMessage.style.display = 'block';
                    myListSection.style.display = 'block';
                    renderAllMovies(userMyList);
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

        movieCard.innerHTML = `
            <div class="aspect-16-9">
                <img src="${movie.imageUrl}" onerror="this.src='https://placehold.co/400x260/f0f0f0/888888?text=Poster+Missing';" alt="${movie.title} Poster">
            </div>
            <div class="movie-card-content">
                <h2 class="movie-card-title">${movie.title}</h2>
                <p class="movie-card-description">${movie.description}</p>
                <span class="movie-language">${language}</span>
                <a href="${movie.videoUrl}" target="_blank" class="watch-button">
                    <svg class="watch-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                    Watch Now
                </a>
                <button class="my-list-button ${isInMyList ? 'added' : ''}" data-movie-id="${movie.id}">
                    ${isInMyList ?
                        '<svg viewBox="0 0 24 24" fill="currentColor" class="mr-1"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Added to My List' :
                        '<svg viewBox="0 0 24 24" fill="currentColor" class="mr-1"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add to My List'
                    }
                </button>
            </div>
        `;

        const watchButton = movieCard.querySelector('.watch-button');
        if (watchButton) {
            watchButton.addEventListener('click', () => {
                if (analytics) {
                    logEvent(analytics, 'play_video', {
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
        return movieCard;
    }

    function renderAllMovies(myListIds) {
        console.log("renderAllMovies called.");
        const mainContent = document.querySelector('main.content-sections');
        document.querySelectorAll('.category-section:not(#searchResultsSection):not(#myListSection)').forEach(section => section.remove());

        const categorizedMovies = allMoviesData.reduce((acc, movie) => {
            if (!acc[movie.category]) {
                acc[movie.category] = [];
            }
            acc[movie.category].push(movie);
            return acc;
        }, {});

        const categoryOrder = ['latestReleases', 'doraemonClassics', 'otherAnimeMovies'];

        categoryOrder.forEach(categoryKey => {
            const categoryMovies = categorizedMovies[categoryKey];
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
        heroSection.classList.toggle('hidden-by-search', !show);
        document.querySelectorAll('.category-section:not(#searchResultsSection):not(#myListSection)').forEach(section => {
            section.style.display = show ? 'block' : 'none';
        });
        if (currentUserId) {
            myListSection.style.display = show ? 'block' : 'none';
        }
    }

    function activateSearch() {
        isSearchActive = true;
        searchToggleButton.classList.add('active');
        movieSearchInput.classList.add('active');
        movieSearchInput.focus();
        donateButton.classList.add('hidden');
        userIdToggleButton.classList.add('hidden');
        userIdTooltip.classList.remove('show');
        toggleOriginalCategoriesAndHero(false);
        displayMovies([]);
    }

    function deactivateSearch() {
        isSearchActive = false;
        searchToggleButton.classList.remove('active');
        movieSearchInput.classList.remove('active');
        movieSearchInput.value = '';
        donateButton.classList.remove('hidden');
        userIdToggleButton.classList.remove('hidden');
        searchResultsSection.style.display = 'none';
        noResultsMessage.style.display = 'none';
        toggleOriginalCategoriesAndHero(true);
    }

    if (searchToggleButton) {
        searchToggleButton.addEventListener('click', function() {
            if (isSearchActive) {
                deactivateSearch();
            }
            else {
                activateSearch();
            }
        });
    }

    if (movieSearchInput) {
        movieSearchInput.addEventListener('keyup', function(event) {
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
    var donateModal = document.getElementById("donateModal");
    var btn = document.getElementById("donateButton");
    var span = document.getElementsByClassName("close-button");

    // Function to render crypto options
    function renderCryptoOptions() {
        if (!cryptoOptionsContainer) return;

        cryptoOptionsContainer.innerHTML = ''; // Clear previous options if any

        const btcAddress = "bc1qh7zwujd45n0wv3k0drc6sjd7n0wv3k0drc6sjd7nzzv3";
        const usdtAddress = "TSFxpiF47okoMTSTJWq8hpZ9Py4qRgJ1NG";

        // Binance Pay
        const binancePayOption = document.createElement('div');
        binancePayOption.className = 'crypto-option';
        binancePayOption.innerHTML = `
            <img src="assets/images/binancepay.png" alt="Binance Pay Logo" class="crypto-logo">
            <p class="crypto-name">Binance Pay</p>
            <p class="crypto-note">Scan QR code in Binance app</p>
        `;
        cryptoOptionsContainer.appendChild(binancePayOption);

        // Bitcoin (BTC)
        const btcOption = document.createElement('div');
        btcOption.className = 'crypto-option';
        btcOption.innerHTML = `
            <img src="assets/images/btc.jpg" alt="Bitcoin Logo" class="crypto-logo">
            <p class="crypto-name">Bitcoin (BTC)</p>
            <div class="crypto-address-container">
                <span id="btcAddressDisplay" class="crypto-address">${btcAddress}</span>
                <button class="copy-button" onclick="copyToClipboard('btcAddressDisplay')">Copy</button>
            </div>
        `;
        cryptoOptionsContainer.appendChild(btcOption);

        // USDT (TRC20)
        const usdtOption = document.createElement('div');
        usdtOption.className = 'crypto-option';
        usdtOption.innerHTML = `
            <img src="assets/images/usdt.jpg" alt="USDT Logo" class="crypto-logo">
            <p class="crypto-name">USDT (TRC20)</p>
            <div class="crypto-address-container">
                <span id="usdtAddressDisplay" class="crypto-address">${usdtAddress}</span>
                <button class="copy-button" onclick="copyToClipboard('usdtAddressDisplay')">Copy</button>
            </div>
        `;
        cryptoOptionsContainer.appendChild(usdtOption);
    }

    if (btn) {
        btn.onclick = function() {
            if (donateModal) {
                donateModal.style.display = "flex";
                document.body.style.overflow = "hidden";
                userIdTooltip.classList.remove('show');
                renderCryptoOptions(); // Call this function when modal opens
            }
        }
    }

    for (let i = 0; i < span.length; i++) {
        span[i].onclick = function() {
            if (infoModal) {
                infoModal.style.display = "none";
            }
            if (donateModal) {
                donateModal.style.display = "none";
            }
            document.body.style.overflow = "auto";
            if (copiedMessageElement) {
                copiedMessageElement.classList.remove('show');
            }
        }
    }

    window.onclick = function(event) {
        if (event.target == donateModal) {
            donateModal.style.display = "none";
            document.body.style.overflow = "auto";
            if (copiedMessageElement) {
                copiedMessageElement.classList.remove('show');
            }
        }
        if (event.target == infoModal) {
            infoModal.style.display = "none";
            document.body.style.overflow = "auto";
        }
        if (userIdTooltip.classList.contains('show') && !userIdTooltip.contains(event.target) && event.target !== userIdToggleButton && !userIdToggleButton.contains(event.target)) {
            userIdTooltip.classList.remove('show');
        }
    }

    function copyToClipboard(elementId) {
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
        userIdToggleButton.addEventListener('click', function(event) {
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

    initializeFirebase();
});