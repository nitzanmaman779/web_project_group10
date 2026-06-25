document.addEventListener('DOMContentLoaded', async () => {

    // שליפת פרטי המשתמש המחובר מהדפדפן
    const currentUser = localStorage.getItem('currentUser');
    const firstName = localStorage.getItem('firstName');

    // אם אין משתמש מחובר, מחזירים אותו לעמוד ההתחברות
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    // שליפת האלמנטים המרכזיים בעמוד המרתף
    const gridEl = document.getElementById('cellar-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const titleEl = document.getElementById('cellar-title');

    // התאמת כותרת המרתף לפי שם המשתמש
    if (firstName) {
        titleEl.textContent = `${firstName}'s Cellar`;
    } else {
        const namePart = currentUser.split('@')[0];
        const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        titleEl.textContent = `${capitalizedName}'s Cellar`;
    }

    // כל היינות של המשתמש נשמרים כאן אחרי השליפה מהשרת
    let myCellar = [];

    // מצב הסינון הנוכחי של המרתף
    let currentState = {
        searchText: '',
        activeTypes: ['red', 'white', 'rose'],
        filterYear: 'all',
        filterWinery: 'all'
    };

    // מחלקות העיצוב של הדרגות, כדי לעדכן צבע אחרי שינוי בדרגה
    const levelClassNames = [
        'level-casual-sipper',
        'level-curious-taster',
        'level-wine-lover',
        'level-vintage-expert',
        'level-master-of-wine'
    ];

    // חישוב דרגת המשתמש לפי כמות הנקודות
    const calculateLevel = (points) => {
        if (points >= 500) return 'Master of Wine';
        if (points >= 300) return 'Vintage Expert';
        if (points >= 170) return 'Wine Lover';
        if (points >= 100) return 'Curious Taster';
        return 'Casual Sipper';
    };

    // יצירת שם מחלקת CSS לפי שם הדרגה
    const getLevelClass = (level) => {
        return 'level-' + String(level || 'Casual Sipper')
            .toLowerCase()
            .replaceAll(' ', '-');
    };

    // החלת עיצוב הדרגה בתפריט העליון
    const applyLevelStyle = (levelEl, level) => {
        if (window.applyWinederLevelStyle) {
            window.applyWinederLevelStyle(levelEl, level);
            return;
        }

        if (!levelEl) return;

        levelEl.classList.add('level-badge');
        levelEl.classList.remove(...levelClassNames);
        levelEl.classList.add(getLevelClass(level));
    };

    // הצגת אנימציה קטנה של תוספת נקודות בתפריט
    const showPointsPop = (amount) => {
        const pointsEl = document.getElementById('nav-points');
        if (!pointsEl || !pointsEl.parentElement) return;

        pointsEl.parentElement.style.position = 'relative';

        const pop = document.createElement('span');
        pop.className = 'points-pop';
        pop.textContent = `+${amount}`;
        pointsEl.parentElement.appendChild(pop);

        setTimeout(() => pop.remove(), 1200);
    };

    // הצגת הודעת מערכת קצרה, למשל על עליית דרגה
    const showGameToast = (title, message, className = '') => {
        const toast = document.createElement('div');
        toast.className = `game-toast ${className}`;

        toast.innerHTML = `
            <button class="game-toast-close" type="button" aria-label="Close">×</button>
            <div class="game-toast-title">${title}</div>
            <div class="game-toast-message">${message}</div>
        `;

        document.body.appendChild(toast);

        toast.querySelector('.game-toast-close').addEventListener('click', () => toast.remove());
        setTimeout(() => toast.classList.add('show'), 20);
        setTimeout(() => toast.remove(), 4500);
    };

    // הודעה ייעודית למצב שבו המשתמש עלה דרגה
    const showLevelUpMessage = (newLevel) => {
        showGameToast(
            'Level Up!',
            `You advanced to ${newLevel} 🏆`,
            'level-up-toast'
        );
    };

    // שליפת המרתף של המשתמש מהשרת והצגת הכרטיסים במסך
    const loadCellarFromServer = async () => {
        try {
            const response = await fetch(`/cellar/${encodeURIComponent(currentUser)}`);
            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Could not load cellar.");
                return;
            }

            myCellar = data;
            populateFilters(myCellar);
            renderCellar();

        } catch (error) {
            console.log("Error loading cellar:", error);
            alert("Something went wrong while loading your cellar.");
        }
    };

    // בניית אפשרויות הסינון לפי היינות שקיימים בפועל במרתף
    const populateFilters = (cellarWines) => {
        const yearList = document.getElementById('yearDropdown');
        const wineryList = document.getElementById('wineryDropdown');

        // איפוס הרשימות לפני בנייה מחדש
        yearList.innerHTML = '<li><a class="dropdown-item" href="#" data-value="all">All Years</a></li>';
        wineryList.innerHTML = '<li><a class="dropdown-item" href="#" data-value="all">All Wineries</a></li>';

        // יצירת רשימת שנים ייחודיות מתוך היינות במרתף
        [...new Set(cellarWines.map(w => w.year).filter(Boolean))]
            .sort((a, b) => b - a)
            .forEach(y => {
                yearList.innerHTML += `<li><a class="dropdown-item" href="#" data-value="${y}">${y}</a></li>`;
            });

        // יצירת רשימת יקבים ייחודיים מתוך היינות במרתף
        [...new Set(cellarWines.map(w => w.winery).filter(Boolean))]
            .sort()
            .forEach(w => {
                wineryList.innerHTML += `<li><a class="dropdown-item" href="#" data-value="${w}">${w}</a></li>`;
            });

        // חיבור אפשרויות הסינון לאירועי לחיצה
        document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                const selectedValue = e.target.getAttribute('data-value');
                const parentUl = e.target.closest('ul');

                if (parentUl.id === 'yearDropdown') {
                    currentState.filterYear = selectedValue;
                    document.getElementById('yearBtn').textContent =
                        selectedValue === 'all' ? 'Year' : `Year: ${selectedValue}`;
                } else {
                    currentState.filterWinery = selectedValue;
                    document.getElementById('wineryBtn').textContent =
                        selectedValue === 'all' ? 'Winery' : `Winery: ${selectedValue}`;
                }

                renderCellar();
            });
        });
    };

    // הצגת כרטיסי היין לאחר חיפוש וסינון
    const renderCellar = () => {
        // סינון היינות לפי חיפוש, סוג, שנה ויקב
        let filteredWines = myCellar.filter(wine => {
            const matchesSearch = wine.name.toLowerCase().includes(currentState.searchText.toLowerCase());
            const normalizedWineType = (wine.type || '').toLowerCase().replace('é', 'e');
            const matchesType = currentState.activeTypes.includes(normalizedWineType);
            const matchesYear = currentState.filterYear === 'all' || String(wine.year) === currentState.filterYear;
            const matchesWinery = currentState.filterWinery === 'all' || wine.winery === currentState.filterWinery;

            return matchesSearch && matchesType && matchesYear && matchesWinery;
        });

        // מיון היינות לפי שם וניקוי התצוגה הקודמת
        filteredWines.sort((a, b) => a.name.localeCompare(b.name));
        gridEl.innerHTML = '';

        // אם אין תוצאות, מציגים מצב ריק רק אם המרתף באמת ריק
        if (filteredWines.length === 0) {
            gridEl.style.display = 'none';

            if (myCellar.length === 0) {
                emptyStateEl.style.display = 'block';
            } else {
                emptyStateEl.style.display = 'none';
            }

            return;
        }

        emptyStateEl.style.display = 'none';
        gridEl.style.display = 'grid';

        // יצירת כרטיס יין עבור כל יין שעבר את הסינון
        filteredWines.forEach(wine => {
            const card = document.createElement('div');
            card.classList.add('mini-wine-card');

            card.innerHTML = `
                <button class="btn-remove" data-id="${wine.id}" data-source="${wine.source}" title="Remove from cellar">🗑️</button>
                <img src="${wine.image || '../images/wine_images/default-wine.png'}" alt="${wine.name}" class="mini-wine-img" onerror="this.onerror=null; this.src='../images/wine_images/default-wine.png';">
                <div class="mini-wine-info">
                    <h3 class="mini-wine-name">${wine.name}</h3>
                    <p class="mini-wine-winery">${wine.winery} | ${wine.year || ''}</p>
                </div>
            `;

            gridEl.appendChild(card);
        });

        attachRemoveListeners();
    };

    // מחיקת יין רגיל או יין אישי לפי המקור שלו
    const removeWine = async (wineId, source) => {
        try {
            let url = '/cellar';

            // יין אישי נמחק מנתיב שונה מיין רגיל
            if (source === 'custom') url = '/custom-wine';

            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: currentUser, wineId: wineId })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Could not remove wine.");
                return;
            }

            // מחיקה מקומית מהמערך כדי לעדכן את התצוגה בלי רענון מלא
            myCellar = myCellar.filter(wine => {
                return !(String(wine.id) === String(wineId) && wine.source === source);
            });

            populateFilters(myCellar);
            renderCellar();

        } catch (error) {
            console.log("Error removing wine:", error);
            alert("Something went wrong while removing the wine.");
        }
    };

    // חיבור כפתורי המחיקה של כרטיסי היין לפונקציית המחיקה
    const attachRemoveListeners = () => {
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wineId = e.currentTarget.getAttribute('data-id');
                const source = e.currentTarget.getAttribute('data-source');

                removeWine(wineId, source);
            });
        });
    };

    // חיבור שדה החיפוש וכפתורי הסינון לפעולות המשתמש
    const attachFiltersEvents = () => {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            currentState.searchText = e.target.value;
            renderCellar();
        });

        document.querySelectorAll('.chip[data-type]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const selectedType = e.target.getAttribute('data-type');

                // אם הסוג כבר פעיל, מכבים אותו — אבל לא מאפשרים לכבות את כל הסוגים יחד
                if (currentState.activeTypes.includes(selectedType)) {
                    if (currentState.activeTypes.length === 1) {
                        return;
                    }

                    currentState.activeTypes = currentState.activeTypes.filter(type => type !== selectedType);
                    e.target.classList.remove('active');

                } else {
                    // אם הסוג לא פעיל, מוסיפים אותו לסינון
                    currentState.activeTypes.push(selectedType);
                    e.target.classList.add('active');
                }

                renderCellar();
            });
        });
    };

    // פתיחת חלון הוספת יין אישי
    window.showAddWineModal = () => {
        document.getElementById('addWineForm').reset();
        document.getElementById('addWineModal').style.display = 'flex';
    };

    // סגירת חלון הוספת יין אישי
    window.closeAddWineModal = () => {
        document.getElementById('addWineModal').style.display = 'none';
    };

    // שמירת יין אישי חדש, כולל בדיקות תקינות ועדכון ניקוד
    window.saveNewWine = async (event) => {
        event.preventDefault();

        const name = document.getElementById('newWineName').value.trim();
        const winery = document.getElementById('newWineWinery').value.trim();
        const year = parseInt(document.getElementById('newWineYear').value);
        const type = document.getElementById('newWineType').value;
        const inputImage = document.getElementById('newWineImage').value.trim();

        // הגבלת שם היין והיקב לתווים באנגלית כדי לשמור על אחידות בתצוגה
        const englishRegex = /^[A-Za-z0-9\s\-,.'&]+$/;

        if (!englishRegex.test(name) || !englishRegex.test(winery)) {
            alert("Please use English characters only for Name and Winery.");
            return;
        }

        // בדיקה ששנת היין בטווח הגיוני
        const currentYear = new Date().getFullYear();

        if (year < 1800 || year > currentYear + 1) {
            alert(`Please enter a valid year (1800 - ${currentYear + 1}).`);
            return;
        }

        // אם המשתמש לא הזין תמונה, משתמשים בתמונת ברירת מחדל
        const finalImage = inputImage || '../images/wine_images/default-wine.png';

        try {
            // שליחת היין החדש לשרת
            const response = await fetch('/custom-wine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: currentUser, name, winery, year, type, image: finalImage })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Could not add custom wine.");
                return;
            }

            // עדכון הניקוד והדרגה לאחר שהשרת אישר שהיין נוסף
            const oldLevel = localStorage.getItem('level') || 'Casual Sipper';

            let updatedPoints;
            let updatedLevel;
            let levelUp = false;

            if (data.stats) {
                updatedPoints = data.stats.points;
                updatedLevel = data.stats.level;
                levelUp = Boolean(data.stats.levelUp);
            } else {
                // גיבוי למקרה שהשרת לא מחזיר נתוני ניקוד
                updatedPoints = parseInt(localStorage.getItem('points') || 0) + 50;
                updatedLevel = calculateLevel(updatedPoints);
                levelUp = oldLevel !== updatedLevel;
            }

            // שמירת הניקוד והדרגה המעודכנים בדפדפן
            localStorage.setItem('points', updatedPoints);
            localStorage.setItem('level', updatedLevel);

            const navPointsEl = document.getElementById('nav-points');
            const navLevelEl = document.getElementById('nav-level');

            // עדכון התצוגה בתפריט העליון בלי לרענן את העמוד
            if (navPointsEl) navPointsEl.textContent = updatedPoints;
            if (window.updateWinederLevelProgress) window.updateWinederLevelProgress(updatedPoints);

            if (navLevelEl) {
                navLevelEl.textContent = updatedLevel;
                applyLevelStyle(navLevelEl, updatedLevel);
            }

            showPointsPop(data.stats?.pointsDelta || 50);

            if (levelUp) {
                showLevelUpMessage(updatedLevel);
            }

            closeAddWineModal();
            await loadCellarFromServer();

        } catch (error) {
            console.log("Error adding custom wine:", error);
            alert("Something went wrong while adding the wine.");
        }
    };

    // חיבור אירועי הסינון וטעינת המרתף מהשרת בתחילת העמוד
    attachFiltersEvents();
    await loadCellarFromServer();
});