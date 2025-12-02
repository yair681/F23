# שינויים שבוצעו במערכת - ניהול כיתות ותלמידים

## תאריך: 23 בנובמבר 2025

---

## 🎯 סיכום השינויים

### 1. **ביטול שיוך אוטומטי לכיתה**
   - **בעבר**: כאשר נוצר משתמש חדש (תלמיד) או כיתה חדשה, היה שיוך אוטומטי ביניהם
   - **עכשיו**: 
     - משתמש חדש נוצר **ללא כל כיתות** (רשימת כיתות ריקה)
     - כיתה חדשה נוצרת **ללא תלמידים** (רשימת תלמידים ריקה)
     - המורים והמנהלים צריכים לשייך תלמידים ידנית לכיתות

### 2. **אופציה להסרת תלמידים מכיתה**
   - מורים ומנהלי מערכת יכולים להסיר תלמידים מהכיתה
   - כפתור "הסר תלמיד" (X) ליד שם כל תלמיד בממשק ניהול הכיתה
   - אישור למחיקה לפני הסרת התלמיד

### 3. **אופציה לשיוך תלמידים לכיתה**
   - מורים ומנהלי מערכת יכולים להוסיף תלמידים לכיתה
   - כפתור "הוסף תלמיד" בממשק ניהול הכיתה
   - רשימה נפתחת מציגה רק תלמידים שעדיין לא בכיתה

---

## 📝 פירוט השינויים בקוד

### **קובץ: server.js**

#### 1. ביטול שיוך אוטומטי ב-`/api/register`
```javascript
// לפני:
const user = new User({ name, email, password: hashedPassword, role });

// אחרי:
// ✅ ביטול שיוך אוטומטי לכיתה - משתמש חדש נוצר ללא כיתות
const user = new User({ name, email, password: hashedPassword, role, classes: [] });
```

#### 2. ביטול שיוך אוטומטי ב-`/api/users` (יצירת משתמש על ידי אדמין)
```javascript
// לפני:
const user = new User({ name, email, password: hashedPassword, role });

// אחרי:
// ✅ ביטול שיוך אוטומטי לכיתה - משתמש חדש נוצר ללא כיתות
const user = new User({ name, email, password: hashedPassword, role, classes: [] });
```

#### 3. ביטול שיוך אוטומטי ב-`/api/classes` (יצירת כיתה)
```javascript
// לפני:
const newClass = new Class({
    name,
    teacher: req.user.userId,
    teachers: [req.user.userId, ...(teachers || [])],
    students: []
});

// אחרי:
// ✅ ביטול שיוך אוטומטי - כיתה חדשה נוצרת ללא תלמידים
const newClass = new Class({
    name,
    teacher: req.user.userId,
    teachers: [req.user.userId, ...(teachers || [])],
    students: [] // רשימה ריקה, המורים יוכלו להוסיף תלמידים ידנית
});
```

#### 4. מורים יכולים לערוך כיתות (ב-`/api/classes/:id` PUT)
```javascript
// מאפשר למורה של הכיתה לערוך אותה (להוסיף/להסיר תלמידים)
const isClassTeacher = req.user.role === 'teacher' && (
    classToUpdate.teacher.toString() === req.user.userId || 
    classToUpdate.teachers.map(t => t.toString()).includes(req.user.userId)
);

if (req.user.role !== 'admin' && !isClassTeacher) {
    return res.status(403).json({ error: 'Access denied' });
}
```

---

### **קובץ: ui.js**

#### 1. הודעות למשתמש על השינויים
```javascript
// בפתיחת מודל יצירת משתמש
this.showNotification('המשתמש יווצר ללא שיוך לכיתות. ניתן לשייך אותו לכיתות דרך ניהול הכיתה', 'info');

// בפתיחת מודל יצירת כיתה
this.showNotification('הכיתה תיווצר ללא תלמידים. תוכל להוסיף תלמידים לאחר מכן דרך ניהול הכיתה', 'info');
```

#### 2. ממשק ניהול כיתה משופר
```javascript
async manageClass(classId) {
    // מציג:
    // - רשימת מורים בכיתה
    // - רשימת תלמידים בכיתה
    // - כפתור "הוסף תלמיד"
    // - כפתור "הסר תלמיד" (X) ליד כל תלמיד
}
```

#### 3. הוספת תלמיד לכיתה
```javascript
async openAddStudentToClassModal(classId) {
    // מציג רק תלמידים שעדיין לא שייכים לכיתה הנוכחית
    const availableStudents = users.filter(u => 
        u.role === 'student' && !existingStudentIds.includes(u._id)
    );
}

async handleAddStudentToClass(e) {
    // מעדכן את רשימת התלמידים בכיתה באמצעות PUT request
    const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify({
            teachers: teacherIds,
            students: studentIds // רשימת התלמידים המעודכנת
        })
    });
}
```

#### 4. הסרת תלמיד מכיתה
```javascript
async removeStudentFromClass(classId, studentId) {
    // מסנן את התלמיד מרשימת התלמידים ומעדכן את הכיתה
    const studentIds = currentClass.students
        .map(s => s._id)
        .filter(id => id !== studentId);
    
    const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify({
            teachers: teacherIds,
            students: studentIds
        })
    });
}
```

---

### **קובץ: database.js**

#### 1. מורים יכולים לקבל רשימת משתמשים
```javascript
async getUsers() {
    // מאפשר גם למורים (isTeacher) לקבל את רשימת המשתמשים
    if (!authManager || !authManager.isAuthenticated()) {
        return [];
    }
    
    // אם המשתמש הוא לא אדמין וגם לא מורה - חוסמים אותו
    if (!authManager.isAdmin() && !authManager.isTeacher()) {
        return [];
    }

    return this.makeRequest('/users');
}
```

#### 2. פונקציה כללית לעדכון כיתה
```javascript
// ✅ NEW: פונקציה כללית לעדכון כיתה (לשיוך/הסרת תלמידים ועוד)
async updateClass(classId, updateData) {
    if (!authManager || !authManager.isAuthenticated() || !authManager.isTeacher()) {
        throw new Error('Teacher or admin access required');
    }
    return this.makeRequest(`/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
    });
}
```

---

### **קובץ: index.html**

#### מודל הוספת תלמיד לכיתה
```html
<div id="add-student-to-class-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>הוספת תלמיד לכיתה</h2>
            <button class="close-modal">&times;</button>
        </div>
        
        <form id="add-student-to-class-form">
            <input type="hidden" id="add-student-class-id">
            
            <div class="form-group">
                <label for="student-select">בחר תלמיד להוספה</label>
                <select id="student-select" required></select>
                <small>רשימה זו מציגה תלמידים שעדיין לא נמצאים בכיתה</small>
            </div>
            
            <button type="submit" class="btn">הוסף תלמיד</button>
        </form>
    </div>
</div>
```

---

## 🎓 איך להשתמש בתכונות החדשות

### יצירת משתמש חדש (תלמיד)
1. התחבר כמנהל מערכת
2. עבור לעמוד "ניהול" → "משתמשים"
3. לחץ על "הוספת משתמש"
4. מלא את הפרטים ובחר תפקיד "תלמיד"
5. המשתמש ייווצר **ללא כיתות**
6. תקבל הודעה: "המשתמש יווצר ללא שיוך לכיתות. ניתן לשייך אותו לכיתות דרך ניהול הכיתה"

### יצירת כיתה חדשה
1. התחבר כמורה או מנהל
2. עבור לעמוד "כיתות"
3. לחץ על "יצירת כיתה"
4. הזן שם לכיתה ובחר מורים נוספים (אופציונלי)
5. הכיתה תיווצר **ללא תלמידים**
6. תקבל הודעה: "הכיתה תיווצר ללא תלמידים. תוכל להוסיף תלמידים לאחר מכן דרך ניהול הכיתה"

### הוספת תלמיד לכיתה
1. עבור לעמוד "כיתות"
2. בחר כיתה ולחץ על "ניהול כיתה"
3. לחץ על כפתור "הוסף תלמיד"
4. בחר תלמיד מהרשימה (רואים רק תלמידים שעדיין לא בכיתה)
5. לחץ "הוסף תלמיד"
6. התלמיד יתווסף לכיתה

### הסרת תלמיד מכיתה
1. עבור לעמוד "כיתות"
2. בחר כיתה ולחץ על "ניהול כיתה"
3. ברשימת התלמידים, לחץ על כפתור "X" ליד שם התלמיד
4. אשר את ההסרה
5. התלמיד יוסר מהכיתה

---

## 🔐 הרשאות

### מי יכול לשייך/להסיר תלמידים?
- **מנהלי מערכת** - יכולים לשייך/להסיר תלמידים מכל כיתה
- **מורים** - יכולים לשייך/להסיר תלמידים רק מהכיתות שלהם
- **תלמידים** - לא יכולים לשייך/להסיר תלמידים

### מי יכול לראות רשימת משתמשים?
- **מנהלי מערכת** - רואים את כל המשתמשים
- **מורים** - רואים את כל המשתמשים (כדי לבחור תלמידים להוספה לכיתה)
- **תלמידים** - לא רואים רשימת משתמשים

---

## 🧪 בדיקות שבוצעו

- ✅ יצירת משתמש חדש ללא כיתות
- ✅ יצירת כיתה חדשה ללא תלמידים
- ✅ הוספת תלמיד לכיתה
- ✅ הסרת תלמיד מכיתה
- ✅ הרשאות מורים ומנהלים
- ✅ הודעות למשתמש על השינויים
- ✅ רשימת תלמידים זמינים (רק תלמידים שלא בכיתה)

---

## 📌 הערות חשובות

1. **גיבוי**: מומלץ לגבות את המסד נתונים לפני שימוש במערכת המעודכנת
2. **משתמשים קיימים**: משתמשים וכיתות שנוצרו לפני השינוי יישארו כמו שהם
3. **תאימות**: השינויים תואמים לגרסאות קודמות של המערכת
4. **ביצועים**: השינויים לא משפיעים על ביצועי המערכת

---

## 🆘 פתרון בעיות נפוצות

### בעיה: לא רואה את כפתור "הוסף תלמיד"
**פתרון**: ודא שאתה מחובר כמורה או מנהל מערכת

### בעיה: הרשימה של תלמידים זמינים ריקה
**פתרון**: יכול להיות שכל התלמידים כבר משוייכים לכיתה. צור תלמידים חדשים או הסר תלמידים מכיתות אחרות

### בעיה: לא מצליח להסיר תלמיד
**פתרון**: ודא שאתה מורה של הכיתה או מנהל מערכת

---

## 📧 צור קשר

לשאלות, בעיות או הצעות לשיפור:
- אימייל: yairfrish2@gmail.com
- או דרך מערכת המשוב באתר

---

**תאריך עדכון אחרון**: 23 בנובמבר 2025
**גרסה**: 2.0.0
