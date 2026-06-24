document.addEventListener('DOMContentLoaded', async () => {

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    let winesToShow = [];
    let currentIndex = 0;

    const cardElement = document.getElementById('wine-card');
    const imgEl = document.getElementById('wine-img');
    const nameEl = document.getElementById('wine-name');
    const wineryYearEl = document.getElementById('wine-winery-year');
    const descEl = document.getElementById('wine-desc');
    const tagsEl = document.getElementById('wine-tags');

    const btnLike = document.getElementById('btn-like');
    const btnDislike = document.getElementById('btn-dislike');
    const cardArea = document.getElementById('card-area');
    const emptyState = document.getElementById('empty-state');

    // פונקציית עדכון ה-UI של המשחוק בזמן אמת
    const updateGamificationUI = (stats) => {
        const pointsEl = document.getElementById('nav-points');
        const streakEl = document.getElementById('nav-streak');
        const levelEl = document.getElementById('nav-level');
        const countEl = document.getElementById('daily-swipes-count');
        const progressEl = document.getElementById('daily-progress-bar');

        if (pointsEl) pointsEl.textContent = stats.points;
        if (streakEl) streakEl.textContent = stats.streak;
        if (levelEl) levelEl.textContent = stats.level;
        if (countEl) countEl.textContent = stats.dailySwipesCount;
        
        if (progressEl) {
            let percent = (stats.dailySwipesCount / 5) * 100;
            if (percent > 100) percent = 100;
            progressEl.style.width = percent + '%';
        }
        
        localStorage.setItem('points', stats.points);
        localStorage.setItem('level', stats.level);
        localStorage.setItem('streak', stats.streak);
        localStorage.setItem('dailySwipesCount', stats.dailySwipesCount);
    };

    updateGamificationUI({
        points: localStorage.getItem('points') || 0,
        streak: localStorage.getItem('streak') || 0,
        level: localStorage.getItem('level') || 'Casual Sipper',
        dailySwipesCount: localStorage.getItem('dailySwipesCount') || 0
    });

    const reportSwipe = async () => {
        try {
            const res = await fetch('/swipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: currentUser })
            });
            if (res.ok) {
                const newStats = await res.json();
                updateGamificationUI(newStats); 
            }
        } catch(e) { console.log("Error reporting swipe", e); }
    };

    const loadWinesFromServer = async () => {
        try {
            const response = await fetch('/wines');
            const wines = await response.json();
            if (!response.ok) return;

            winesToShow = wines;
            winesToShow.sort(() => Math.random() - 0.5);
            renderWine();
        } catch (error) { console.log("Error loading wines:", error); }
    };

    const renderWine = () => {
        if (currentIndex >= winesToShow.length) {
            cardArea.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        const wine = winesToShow[currentIndex];
        imgEl.src = wine.image || '../images/wine_images/default-wine.png';
        imgEl.onerror = function () { this.onerror = null; this.src = '../images/wine_images/default-wine.png'; };
        nameEl.textContent = wine.name;
        wineryYearEl.textContent = `${wine.winery} | ${wine.year || ''}`;
        descEl.textContent = wine.desc || "A selected wine from the Wineder collection.";
        tagsEl.innerHTML = `<span class="tag">${wine.type || 'Wine'}</span>`;
    };

    const saveToCellar = async (wine) => {
        try {
            await fetch('/cellar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: currentUser, wineId: wine.id })
            });
        } catch (error) { console.log("Error saving wine", error); }
    };

    const handleSwipe = async (direction) => {
        const currentWine = winesToShow[currentIndex];
        if (!currentWine) return;

        if (direction === 'like') {
            cardElement.classList.add('swipe-right');
            await saveToCellar(currentWine);
        } else {
            cardElement.classList.add('swipe-left');
        }

        // שידור ההחלקה כדי לקבל נקודות
        reportSwipe();

        setTimeout(() => {
            currentIndex++;
            cardElement.classList.remove('swipe-right', 'swipe-left');
            renderWine();
        }, 400);
    };

    btnLike.addEventListener('click', () => handleSwipe('like'));
    btnDislike.addEventListener('click', () => handleSwipe('dislike'));

    await loadWinesFromServer();
});