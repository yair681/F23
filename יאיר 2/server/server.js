import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// === File-based Database Setup ===
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  classes: path.join(DATA_DIR, 'classes.json'),
  announcements: path.join(DATA_DIR, 'announcements.json'),
  assignments: path.join(DATA_DIR, 'assignments.json'),
  events: path.join(DATA_DIR, 'events.json'),
  media: path.join(DATA_DIR, 'media.json')
};

// Create data directory and initialize files
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('✅ Created data directory');
}

// Initialize empty data files if they don't exist
Object.entries(DB_FILES).forEach(([key, filePath]) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
    console.log(`✅ Created ${key}.json`);
  }
});

// Database helper functions
const db = {
  read(collection) {
    try {
      const data = fs.readFileSync(DB_FILES[collection], 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return [];
    }
  },
  
  write(collection, data) {
    try {
      fs.writeFileSync(DB_FILES[collection], JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing ${collection}:`, error);
      return false;
    }
  },
  
  findOne(collection, query) {
    const data = this.read(collection);
    return data.find(item => {
      return Object.keys(query).every(key => {
        if (key === '_id' || key === 'email') return item[key] === query[key];
        return item[key] === query[key];
      });
    });
  },
  
  find(collection, query = {}) {
    const data = this.read(collection);
    if (Object.keys(query).length === 0) return data;
    
    return data.filter(item => {
      return Object.keys(query).every(key => {
        if (key === '$or') {
          return query[key].some(orCondition => {
            return Object.keys(orCondition).every(orKey => {
              if (orKey === 'students' || orKey === 'teachers') {
                return item[orKey] && item[orKey].includes(orCondition[orKey]);
              }
              return item[orKey] === orCondition[orKey];
            });
          });
        }
        if (key === 'students' || key === 'teachers') {
          return item[key] && item[key].includes(query[key]);
        }
        if (key === 'class' && query[key].$in) {
          return query[key].$in.includes(item.class);
        }
        return item[key] === query[key];
      });
    });
  },
  
  insert(collection, item) {
    const data = this.read(collection);
    const newItem = { 
      ...item, 
      _id: item._id || uuidv4(),
      createdAt: item.createdAt || new Date().toISOString()
    };
    data.push(newItem);
    this.write(collection, data);
    return newItem;
  },
  
  update(collection, id, updates) {
    const data = this.read(collection);
    const index = data.findIndex(item => item._id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates };
    this.write(collection, data);
    return data[index];
  },
  
  delete(collection, id) {
    const data = this.read(collection);
    const filtered = data.filter(item => item._id !== id);
    this.write(collection, filtered);
    return filtered.length < data.length;
  },
  
  // Helper for populating references
  populate(item, refs) {
    if (!item) return null;
    const populated = { ...item };
    
    refs.forEach(ref => {
      if (Array.isArray(populated[ref.field])) {
        populated[ref.field] = populated[ref.field].map(id => {
          const refItem = this.findOne(ref.collection, { _id: id });
          if (!refItem) return id;
          if (ref.select) {
            const selected = {};
            ref.select.split(' ').forEach(field => {
              if (field !== '-password') selected[field] = refItem[field];
            });
            return selected;
          }
          const { password, ...rest } = refItem;
          return rest;
        });
      } else if (populated[ref.field]) {
        const refItem = this.findOne(ref.collection, { _id: populated[ref.field] });
        if (refItem) {
          if (ref.select) {
            const selected = {};
            ref.select.split(' ').forEach(field => {
              if (field !== '-password') selected[field] = refItem[field];
            });
            populated[ref.field] = selected;
          } else {
            const { password, ...rest } = refItem;
            populated[ref.field] = rest;
          }
        }
      }
    });
    
    return populated;
  }
};

// הגדרת העלאת קבצים (Multer)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.א-ת\-\_]/g, '_');
        cb(null, uniqueSuffix + '-' + cleanName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

// חשיפת קבצים סטטיים
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/css', express.static(path.join(__dirname, '..', 'client', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'client', 'js')));
app.use('/uploads', express.static(uploadDir));

// יצירת משתמש מנהל ברירת מחדל
async function createDefaultUsers() {
  try {
    const existingAdmin = db.findOne('users', { email: 'yairfrish2@gmail.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('yair12345', 10);
      db.insert('users', {
        name: 'יאיר פריש',
        email: 'yairfrish2@gmail.com',
        password: hashedPassword,
        role: 'admin',
        classes: []
      });
      console.log('✅ Default admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default users:', error);
  }
}

// Initialize database
createDefaultUsers();
console.log('✅ File-based database initialized');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findOne('users', { _id: decoded.userId });
    if (!user) return res.status(403).json({ error: 'User not found' });

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// --- Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running with file-based storage' });
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = db.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = db.insert('users', { 
      name, 
      email, 
      password: hashedPassword, 
      role, 
      classes: [] 
    });

    const token = jwt.sign({ 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    }, JWT_SECRET);

    res.json({ 
      message: 'User created', 
      token, 
      user: { id: user._id, name, email, role } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.findOne('users', { email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!user.password) {
      return res.status(500).json({ error: 'User data corrupted' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    }, JWT_SECRET);

    res.json({ 
      message: 'Login successful', 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });

  } catch (error) {
    console.error('🔥 Login Critical Error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

app.get('/api/validate-token', authenticateToken, async (req, res) => {
  try {
    const user = db.findOne('users', { _id: req.user.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.update('users', req.user.userId, { password: hashedPassword });
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
});

// Users
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const users = db.read('users').map(({ password, ...user }) => user);
    res.json(users);
});

app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = db.insert('users', { 
          name, 
          email, 
          password: hashedPassword, 
          role, 
          classes: [] 
        });
        res.json({ message: 'User created' });
    } catch (e) { 
      res.status(500).json({ error: e.message }); 
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
        const { name, email, role, password } = req.body;
        const updateData = { name, email, role };
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }
        
        const user = db.update('users', req.params.id, updateData);
        res.json({ message: 'User updated', user });
    } catch (e) { 
      res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    db.delete('users', req.params.id);
    res.json({ message: 'User deleted' });
});

// Classes
app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        let query = {};
        
        if (req.user.role === 'student') {
            query = { students: req.user.userId };
        } else if (req.user.role === 'teacher') {
            query = { teachers: req.user.userId };
        }
        
        const classes = db.find('classes', query);
        const populated = classes.map(cls => db.populate(cls, [
          { field: 'teacher', collection: 'users', select: 'name email' },
          { field: 'teachers', collection: 'users', select: 'name email' },
          { field: 'students', collection: 'users', select: 'name email' }
        ]));
        
        res.json(populated);
    } catch (error) {
        console.error('❌ Error fetching classes:', error);
        res.status(500).json({ error: 'Failed to fetch classes', message: error.message });
    }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { name, teachers } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Class name is required' });
        }
        
        const newClass = db.insert('classes', {
            name,
            teacher: req.user.userId,
            teachers: [req.user.userId, ...(teachers || [])],
            students: []
        });
        
        const populated = db.populate(newClass, [
          { field: 'teacher', collection: 'users', select: 'name email' },
          { field: 'teachers', collection: 'users', select: 'name email' },
          { field: 'students', collection: 'users', select: 'name email' }
        ]);
        
        res.json(populated);
    } catch (error) {
        console.error('❌ Error creating class:', error);
        res.status(500).json({ error: 'Failed to create class', message: error.message });
    }
});

app.put('/api/classes/:id', authenticateToken, async (req, res) => {
    try {
        const classToUpdate = db.findOne('classes', { _id: req.params.id });
        if (!classToUpdate) {
          return res.status(404).json({ error: 'Class not found' });
        }

        const isClassTeacher = req.user.role === 'teacher' && (
            classToUpdate.teacher === req.user.userId || 
            classToUpdate.teachers.includes(req.user.userId)
        );

        if (req.user.role !== 'admin' && !isClassTeacher) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { name, teachers, students } = req.body;
        const updates = {};
        
        if (name) updates.name = name;
        if (teachers) updates.teachers = teachers;
        if (students) updates.students = students;

        const updated = db.update('classes', req.params.id, updates);
        
        const populated = db.populate(updated, [
          { field: 'teacher', collection: 'users', select: 'name email' },
          { field: 'teachers', collection: 'users', select: 'name email' },
          { field: 'students', collection: 'users', select: 'name email' }
        ]);

        res.json(populated);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/classes/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.delete('classes', req.params.id);
    res.json({ message: 'Class deleted' });
});

// Class specific data
app.get('/api/classes/:id/assignments', authenticateToken, async (req, res) => {
    const assignments = db.find('assignments', { class: req.params.id });
    const populated = assignments.map(a => db.populate(a, [
      { field: 'class', collection: 'classes', select: 'name' },
      { field: 'teacher', collection: 'users', select: 'name' }
    ]));
    res.json(populated);
});

app.get('/api/classes/:id/announcements', authenticateToken, async (req, res) => {
    const allAnnouncements = db.read('announcements');
    const filtered = allAnnouncements.filter(a => 
      a.class === req.params.id || a.isGlobal === true
    );
    const populated = filtered.map(a => db.populate(a, [
      { field: 'author', collection: 'users', select: 'name' },
      { field: 'class', collection: 'classes', select: 'name' }
    ]));
    populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(populated);
});

// Announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        let filteredAnnouncements = db.find('announcements', { isGlobal: true });

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const userId = decoded.userId;
                const userClasses = db.find('classes', {
                    $or: [
                      { students: userId }, 
                      { teachers: userId }, 
                      { teacher: userId }
                    ]
                });
                const classIds = userClasses.map(c => c._id);
                
                const allAnnouncements = db.read('announcements');
                filteredAnnouncements = allAnnouncements.filter(a => 
                  a.isGlobal === true || classIds.includes(a.class)
                );
            } catch (e) {
              // Token invalid, just show global announcements
            }
        }

        const populated = filteredAnnouncements.map(a => db.populate(a, [
          { field: 'author', collection: 'users', select: 'name' },
          { field: 'class', collection: 'classes', select: 'name' }
        ]));
        populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(populated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/announcements', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { title, content, isGlobal, classId } = req.body;
    const announcement = db.insert('announcements', {
        title, 
        content, 
        author: req.user.userId, 
        isGlobal: isGlobal || false, 
        class: classId || null
    });
    res.json(announcement);
});

app.delete('/api/announcements/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.delete('announcements', req.params.id);
    res.json({ message: 'Deleted' });
});

// Assignments
app.get('/api/assignments', authenticateToken, async (req, res) => {
    try {
        let assignments;
        if (req.user.role === 'student') {
            const studentClasses = db.find('classes', { students: req.user.userId });
            const classIds = studentClasses.map(c => c._id);
            if (classIds.length === 0) {
              assignments = [];
            } else {
              const allAssignments = db.read('assignments');
              assignments = allAssignments.filter(a => classIds.includes(a.class));
            }
        } else {
            assignments = db.read('assignments');
        }
        
        const populated = assignments.map(a => db.populate(a, [
          { field: 'class', collection: 'classes', select: 'name' },
          { field: 'teacher', collection: 'users', select: 'name' }
        ]));
        populated.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        res.json(populated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { title, description, classId, dueDate } = req.body;
    const assignment = db.insert('assignments', {
        title, 
        description, 
        class: classId, 
        teacher: req.user.userId, 
        dueDate, 
        submissions: []
    });
    res.json(assignment);
});

app.post('/api/assignments/submit', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { assignmentId, submission } = req.body;
        const assignment = db.findOne('assignments', { _id: assignmentId });
        if (!assignment) {
          return res.status(404).json({ error: 'Assignment not found' });
        }

        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
        }

        const existingSubIndex = assignment.submissions.findIndex(
          s => s.student === req.user.userId
        );
        
        const newSubmission = {
            student: req.user.userId,
            submission: submission || '',
            fileUrl: fileUrl, 
            submittedAt: new Date().toISOString()
        };

        if (existingSubIndex > -1) {
            if (!fileUrl && assignment.submissions[existingSubIndex].fileUrl) {
                newSubmission.fileUrl = assignment.submissions[existingSubIndex].fileUrl;
            }
            assignment.submissions[existingSubIndex] = { 
              ...assignment.submissions[existingSubIndex], 
              ...newSubmission 
            };
        } else {
            assignment.submissions.push(newSubmission);
        }

        db.update('assignments', assignmentId, { submissions: assignment.submissions });
        res.json({ message: 'Submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting assignment' });
    }
});

app.put('/api/assignments/:id', authenticateToken, async (req, res) => {
    const { title, description, dueDate } = req.body;
    const assignment = db.findOne('assignments', { _id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (req.user.role !== 'admin' && assignment.teacher !== req.user.userId) {
      return res.status(403).json({ error: 'Denied' });
    }
    
    const updated = db.update('assignments', req.params.id, { 
      title, 
      description, 
      dueDate 
    });
    res.json(updated);
});

app.delete('/api/assignments/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.delete('assignments', req.params.id);
    res.json({ message: 'Deleted' });
});

app.get('/api/assignments/:id/submissions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const assignment = db.findOne('assignments', { _id: req.params.id });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const populatedSubmissions = assignment.submissions.map(sub => {
      const student = db.findOne('users', { _id: sub.student });
      return {
        ...sub,
        student: student ? { 
          _id: student._id, 
          name: student.name, 
          email: student.email 
        } : null
      };
    });
    
    res.json(populatedSubmissions);
});

app.post('/api/assignments/grade', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { assignmentId, studentId, grade } = req.body;
    const assignment = db.findOne('assignments', { _id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const sub = assignment.submissions.find(s => s.student === studentId);
    if (sub) {
        sub.grade = grade;
        db.update('assignments', assignmentId, { submissions: assignment.submissions });
        res.json({ message: 'Graded' });
    } else {
        res.status(404).json({ error: 'Submission not found' });
    }
});

// Events
app.get('/api/events', async (req, res) => {
    const events = db.read('events');
    const populated = events.map(e => db.populate(e, [
      { field: 'author', collection: 'users', select: 'name' }
    ]));
    populated.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(populated);
});

app.post('/api/events', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { title, description, date } = req.body;
    const event = db.insert('events', { 
      title, 
      description, 
      date, 
      author: req.user.userId 
    });
    res.json(event);
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    db.delete('events', req.params.id);
    res.json({ message: 'Deleted' });
});

// Media
app.get('/api/media', async (req, res) => {
    const media = db.read('media');
    const populated = media.map(m => db.populate(m, [
      { field: 'author', collection: 'users', select: 'name' }
    ]));
    populated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(populated);
});

app.post('/api/media', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, type, date } = req.body;
        const fileUrl = `/uploads/${req.file.filename}`;
        const mediaDate = date || new Date().toISOString();

        const media = db.insert('media', { 
            title: title || 'ללא כותרת', 
            type: type || 'file', 
            url: fileUrl, 
            date: mediaDate, 
            author: req.user.userId 
        });
        
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: 'Error uploading media: ' + error.message });
    }
});

app.delete('/api/media/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    db.delete('media', req.params.id);
    res.json({ message: 'Deleted' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('🔥 Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Data stored in: ${DATA_DIR}`);
});
