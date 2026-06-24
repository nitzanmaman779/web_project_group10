// מוודא שכל העמוד סיים להיטען לפני שהקוד מתחיל לרוץ, כדי למנוע שגיאות בזיהוי אלמנטים.
document.addEventListener('DOMContentLoaded', () => {
    
    // === 1. קוד חדש: ניהול אזור משתמש (תצוגת פרופיל מחובר / כפתור התחברות) ===
    const userArea = document.getElementById('userArea');
    const firstName = localStorage.getItem('firstName');

    if (userArea) {
        if (firstName) {
            // משיכת נתוני המשחוק מהאחסון המקומי
            const points = localStorage.getItem('points') || 0;
            const streak = localStorage.getItem('streak') || 0;
            const level = localStorage.getItem('level') || 'Casual Sipper';

            // אם המשתמש מחובר - נציג את הסטטיסטיקות שלו, את שמו, אייקון הגדרות לעריכה וכפתור התנתקות
            userArea.innerHTML = `
                <div class="d-none d-md-flex align-items-center me-3 px-4 py-2 shadow-sm" style="background: rgba(183, 110, 121, 0.08); border-radius: 25px; font-size: 1.1rem; border: 1px solid rgba(198, 142, 88, 0.2);">
                    <span class="me-4" title="Points">
                        <i class="fas fa-star fa-lg me-1" style="color: #C68E58;"></i> 
                        <span style="font-size: 0.85rem; color:#888; font-weight: 600; text-transform: uppercase;">Points:</span> 
                        <span id="nav-points" class="fw-bold fs-5" style="color: #333;">${points}</span>
                    </span>
                    <span class="me-4" title="Daily Streak">
                        <i class="fas fa-fire fa-lg me-1" style="color: #ff4b4b;"></i> 
                        <span style="font-size: 0.85rem; color:#888; font-weight: 600; text-transform: uppercase;">Streak:</span> 
                        <span id="nav-streak" class="fw-bold fs-5" style="color: #333;">${streak}</span>
                    </span>
                    <span class="fw-bold fs-5" style="color: #B76E79;" title="Level">
                        <i class="fas fa-award fa-lg me-1"></i> <span id="nav-level">${level}</span>
                    </span>
                </div>

                <span class="me-3 fw-bold fs-5" style="color: #B76E79;">Hi, ${firstName}</span>
                <a href="/edit-profile" class="text-secondary me-3" title="Edit Profile">
                    <i class="fas fa-cog fa-2x"></i>
                </a>
                <button class="btn btn-outline-danger" onclick="logout()">Logout</button>
            `;
        } else {
            // אם המשתמש לא מחובר - נציג כפתור התחברות
            userArea.innerHTML = `
                <a href="/login" class="btn btn-rose btn-sm shadow-sm">Login / Sign Up</a>
            `;
        }
    }

    // === 2. קוד קיים: טיפול בטופס ההרשמה המהיר מה-Hero ===
    const emailForm = document.getElementById('hero-email-form');
    const emailInput = document.getElementById('hero-email');
    const feedback = document.getElementById('email-feedback');

    if (emailForm) {
        emailForm.addEventListener('submit', (e) => {
            e.preventDefault(); 

            const emailValue = emailInput.value;
            
            if (validateEmail(emailValue)) {
                feedback.classList.add('d-none');
                window.location.href = `/login?email=${encodeURIComponent(emailValue)}`;
            } else {
                feedback.classList.remove('d-none');
                emailInput.classList.add('is-invalid');
            }
        });

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                emailInput.classList.remove('is-invalid');
                feedback.classList.add('d-none');
            });
        }
    }

    // פונקציית עזר לבדיקת פורמט אימייל
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
});