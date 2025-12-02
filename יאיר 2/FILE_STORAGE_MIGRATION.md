# 🔄 מעבר לשמירת נתונים בקבצים

## מה השתנה?

המערכת עברה משימוש ב-**MongoDB** לשימוש ב-**קבצי JSON** לשמירת נתונים.

---

## ✅ יתרונות

1. **אין צורך ב-MongoDB** - לא צריך להתקין או להפעיל מסד נתונים נפרד
2. **פשוט יותר** - כל הנתונים בקבצים ברורים שאפשר לקרוא
3. **גיבוי קל** - פשוט להעתיק את תיקיית `data/`
4. **נייד** - אפשר להעביר את המערכת בקלות בין מחשבים
5. **שקיפות** - אפשר לראות בדיוק מה שמור

---

## 📁 מבנה הקבצים

```
server/
├── data/                    # ← כל הנתונים כאן!
│   ├── users.json          # משתמשים
│   ├── classes.json        # כיתות
│   ├── announcements.json  # הודעות
│   ├── assignments.json    # משימות
│   ├── events.json         # אירועים
│   └── media.json          # מדיה
├── uploads/                # קבצים שהועלו
└── server.js              # הקוד המעודכן
```

---

## 🚀 התקנה והפעלה

### 1. התקנת תלויות
```bash
cd server
npm install
```

התלויות שהתעדכנו:
- ✅ הוסף: `uuid` (ליצירת ID ייחודי)
- ❌ הוסר: `mongoose` (לא נדרש יותר)

### 2. הפעלת השרת
```bash
npm start
```

השרת יבצע אוטומטית:
- ✅ יצור תיקיית `data/` אם לא קיימת
- ✅ יצור את כל קבצי ה-JSON הריקים
- ✅ יצור משתמש מנהל ברירת מחדל

### 3. כניסה למערכת
- **אימייל**: `yairfrish2@gmail.com`
- **סיסמה**: `yair12345`

---

## 🔧 שינויים טכניים

### במקום MongoDB:
```javascript
// ישן (MongoDB)
const User = mongoose.model('User', userSchema);
const user = await User.findOne({ email });
```

### עכשיו (File System):
```javascript
// חדש (קבצים)
const user = db.findOne('users', { email });
```

### פונקציות ה-DB:
- `db.read(collection)` - קריאת כל הנתונים
- `db.write(collection, data)` - כתיבה לקובץ
- `db.findOne(collection, query)` - מציאת פריט אחד
- `db.find(collection, query)` - מציאת פריטים
- `db.insert(collection, item)` - הוספת פריט חדש
- `db.update(collection, id, updates)` - עדכון פריט
- `db.delete(collection, id)` - מחיקת פריט
- `db.populate(item, refs)` - טעינת יחסים

---

## 🔄 העברת נתונים קיימים

אם יש לך נתונים ב-MongoDB שאתה רוצה להעביר:

### 1. ייצוא מ-MongoDB
```bash
# ייצוא users
mongoexport --uri="YOUR_MONGODB_URI" --collection=users --out=users.json

# ייצוא classes
mongoexport --uri="YOUR_MONGODB_URI" --collection=classes --out=classes.json

# וכן הלאה לכל קולקשן...
```

### 2. העתקה לתיקיית data
```bash
# העתק את הקבצים שיצרת לתיקייה
cp users.json server/data/
cp classes.json server/data/
# ... וכן הלאה
```

### 3. הפעלת השרת
```bash
npm start
```

---

## 💾 גיבוי ושחזור

### גיבוי:
```bash
# פשוט העתק את תיקיית data
cp -r server/data server/data_backup_2025_12_02
```

### שחזור:
```bash
# החזר את הנתונים
cp -r server/data_backup_2025_12_02/* server/data/
```

---

## ⚠️ הערות חשובות

### 1. ביצועים
- ✅ **מעולה** למערכות קטנות-בינוניות (עד מאות משתמשים)
- ⚠️ **לא מומלץ** למערכות גדולות מאוד (אלפי משתמשים עם פעילות גבוהה)

### 2. גישה בו-זמנית
- המערכת מטפלת בקריאות וכתיבות בצורה סדרתית
- עבור שימוש רגיל זה מספיק

### 3. שגיאות
- אם קובץ JSON פגום, המערכת תחזיר מערך ריק
- כדאי לעשות גיבויים תקופתיים

### 4. ID ייחודי
- במקום ObjectId של MongoDB, משתמשים ב-UUID v4
- לדוגמה: `"_id": "550e8400-e29b-41d4-a716-446655440000"`

---

## 🐛 פתרון בעיות

### השרת לא עולה?
```bash
# בדוק אם הפורט תפוס
netstat -an | findstr :10000

# הפעל מחדש
npm start
```

### אין נתונים?
```bash
# בדוק שהתיקייה קיימת
ls server/data

# אם לא, הפעל את השרת - הוא יצור אותה אוטומטית
npm start
```

### שכחת סיסמה?
```bash
# מחק את קובץ המשתמשים והפעל מחדש
rm server/data/users.json
npm start
# משתמש מנהל ברירת מחדל ייווצר מחדש
```

---

## 📊 דוגמת קובץ JSON

### users.json
```json
[
  {
    "_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "יאיר פריש",
    "email": "yairfrish2@gmail.com",
    "password": "$2a$10$...",
    "role": "admin",
    "classes": [],
    "createdAt": "2025-12-02T10:30:00.000Z"
  }
]
```

### classes.json
```json
[
  {
    "_id": "660f9511-f3ac-52e5-b827-557766551111",
    "name": "כיתה ז'1",
    "teacher": "550e8400-e29b-41d4-a716-446655440000",
    "teachers": ["550e8400-e29b-41d4-a716-446655440000"],
    "students": [],
    "createdAt": "2025-12-02T10:35:00.000Z"
  }
]
```

---

## ✨ סיכום

המערכת עכשיו:
- ✅ עצמאית לחלוטין - לא תלויה בשירותים חיצוניים
- ✅ פשוטה לניהול - כל הנתונים בקבצים
- ✅ קלה לגיבוי - פשוט להעתיק תיקייה
- ✅ שקופה - אפשר לראות בדיוק מה קורה

**כל ה-API נשאר זהה** - הקוד של ה-client לא צריך שינוי! 🎉
