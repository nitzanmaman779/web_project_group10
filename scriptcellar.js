document.addEventListener('DOMContentLoaded', () => {
    
    const currentUser = localStorage.getItem('currentUser');
    const storageKey = `cellar_${currentUser}`;
    const gridEl = document.getElementById('cellar-grid');
    const emptyStateEl = document.getElementById('empty-state');
    const titleEl = document.getElementById('cellar-title');
    
    if (currentUser) {
        const namePart = currentUser.split('@')[0];
        const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        titleEl.textContent = `${capitalizedName}'s Cellar`;
    }

    // הסטייט שלנו - הסרנו את אלמנט המיון הישן
    let currentState = {
        searchText: '',
        activeType: 'all',
        filterYear: 'all',
        filterWinery: 'all'
    };

    // פונקציה למילוי אוטומטי של תפריטי השנים והיקבים לפי מה שיש במרתף
    const populateFilters = (myCellar) => {
        const yearList = document.getElementById('yearDropdown');
        const wineryList = document.getElementById('wineryDropdown');
        
        // ניקוי רשימות (חוץ מה-All הראשון)
        yearList.innerHTML = '<li><a class="dropdown-item" href="#" data-value="all">All Years</a></li>';
        wineryList.innerHTML = '<li><a class="dropdown-item" href="#" data-value="all">All Wineries</a></li>';

        // מילוי השנים
        [...new Set(myCellar.map(w => w.year))].sort((a,b) => b-a).forEach(y => {
            yearList.innerHTML += `<li><a class="dropdown-item" href="#" data-value="${y}">${y}</a></li>`;
        });

        // מילוי היקבים
        [...new Set(myCellar.map(w => w.winery))].sort().forEach(w => {
            wineryList.innerHTML += `<li><a class="dropdown-item" href="#" data-value="${w}">${w}</a></li>`;
        });

        // מאזינים לבחירה מהתפריט המותאם שלנו
        document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedValue = e.target.getAttribute('data-value');
                const parentUl = e.target.closest('ul');
                
                if (parentUl.id === 'yearDropdown') {
                    currentState.filterYear = selectedValue;
                    // עדכון הטקסט על הכפתור
                    document.getElementById('yearBtn').textContent = selectedValue === 'all' ? 'Year' : `Year: ${selectedValue}`;
                } else {
                    currentState.filterWinery = selectedValue;
                    // עדכון הטקסט על הכפתור
                    document.getElementById('wineryBtn').textContent = selectedValue === 'all' ? 'Winery' : `Winery: ${selectedValue}`;
                }
                
                renderCellar();
            });
        });
    };

    const renderCellar = () => {
        let myCellar = JSON.parse(localStorage.getItem(storageKey)) || [];

        // סינון משולב (AND - כל התנאים חייבים להתקיים)
        let filteredWines = myCellar.filter(wine => {
            const matchesSearch = wine.name.toLowerCase().includes(currentState.searchText.toLowerCase());
            const normalizedWineType = wine.type.toLowerCase().replace('é', 'e');
            const matchesType = currentState.activeType === 'all' || normalizedWineType === currentState.activeType;
            const matchesYear = currentState.filterYear === 'all' || wine.year.toString() === currentState.filterYear;
            const matchesWinery = currentState.filterWinery === 'all' || wine.winery === currentState.filterWinery;
            
            return matchesSearch && matchesType && matchesYear && matchesWinery;
        });

        // מיון ברירת מחדל לפי שם היין (מכיוון שהורדנו את תיבת המיון ב-HTML)
        filteredWines.sort((a, b) => a.name.localeCompare(b.name));

        // תצוגה
        gridEl.innerHTML = '';

        if (filteredWines.length === 0) {
            gridEl.style.display = 'none';
            if (myCellar.length === 0) {
                 emptyStateEl.style.display = 'block';
            }
            return;
        }

        emptyStateEl.style.display = 'none';
        gridEl.style.display = 'grid';

        filteredWines.forEach(wine => {
            const card = document.createElement('div');
            card.classList.add('mini-wine-card');
            
            card.innerHTML = `
                <button class="btn-remove" data-id="${wine.id}" title="Remove from cellar">🗑️</button>
                <img src="${wine.image}" alt="${wine.name}" class="mini-wine-img">
                <div class="mini-wine-info">
                    <h3 class="mini-wine-name">${wine.name}</h3>
                    <p class="mini-wine-winery">${wine.winery} | ${wine.year}</p>
                </div>
            `;
            gridEl.appendChild(card);
        });

        attachRemoveListeners();
    };

    // מחיקת יין
    const removeWine = (wineId) => {
        let myCellar = JSON.parse(localStorage.getItem(storageKey)) || [];
        myCellar = myCellar.filter(wine => wine.id != wineId);
        localStorage.setItem(storageKey, JSON.stringify(myCellar));
        // חשוב לעדכן גם את התפריטים אם נמחק היין האחרון מיקב מסוים!
        populateFilters(myCellar);
        renderCellar();
    };

    const attachRemoveListeners = () => {
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeWine(e.target.getAttribute('data-id'));
            });
        });
    };

    // חיבור כל המאזינים (Events) המעודכנים!
    const attachFiltersEvents = () => {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            currentState.searchText = e.target.value;
            renderCellar();
        });

        // מאזינים רק ללחיצות על תגיות מסוג היין
        document.querySelectorAll('.chip[data-type]').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelector('.chip.active').classList.remove('active');
                e.target.classList.add('active');
                currentState.activeType = e.target.getAttribute('data-type');
                renderCellar();
            });
        });
    };

    // הפעלה ראשונה כשנכנסים לדף
    let initialCellar = JSON.parse(localStorage.getItem(storageKey)) || [];
    populateFilters(initialCellar);
    attachFiltersEvents();
    renderCellar();
});