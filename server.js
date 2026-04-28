require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'ecs_super_secret_change_me';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecs_db';

const roles = ['admin', 'faculty', 'student'];

const userSchema = new mongoose.Schema(
  {
    uid: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: roles, required: true }
  },
  { timestamps: true }
);

const classroomSchema = new mongoose.Schema(
  {
    room_id: { type: Number, unique: true },
    room_number: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    projector: { type: String, enum: ['Yes', 'No'], default: 'No' },
    facilities: { type: [String], default: [] }
  },
  { timestamps: true }
);

const timetableSchema = new mongoose.Schema(
  {
    room_id: { type: Number, required: true },
    day: { type: String, required: true },
    time_slot: { type: String, required: true },
    subject: { type: String, required: true }
  },
  { timestamps: true }
);
timetableSchema.index({ room_id: 1, day: 1, time_slot: 1 }, { unique: true });

const bookingSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    room_id: { type: Number, required: true },
    date: { type: String, required: true },
    time_slot: { type: String, required: true },
    purpose: { type: String, default: 'Extra class' },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' }
  },
  { timestamps: true }
);
bookingSchema.index({ room_id: 1, date: 1, time_slot: 1, status: 1 });

const complaintSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    room_id: { type: Number, required: true },
    issue_type: {
      type: String,
      enum: ['Projector', 'AC', 'Furniture', 'Locked Room'],
      required: true
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
const Classroom = mongoose.model('Classroom', classroomSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const allowedSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00'];

function getDayFromDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return days[d.getDay()];
}

function tokenForUser(user) {
  return jwt.sign(
    { id: user._id.toString(), uid: user.uid, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function auth(req, res, next) {
  const bearer = req.headers.authorization || '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function permit(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }
    return next();
  };
}

async function checkOccupancy(room_id, date, time_slot) {
  const day = getDayFromDate(date);
  if (!day) return { occupied: true, reason: 'Invalid date' };

  const timetableHit = await Timetable.findOne({ room_id, day, time_slot }).lean();
  if (timetableHit) {
    return { occupied: true, reason: `Occupied by timetable (${timetableHit.subject})` };
  }

  const bookingHit = await Booking.findOne({ room_id, date, time_slot, status: 'active' }).lean();
  if (bookingHit) {
    return { occupied: true, reason: 'Already booked' };
  }

  return { occupied: false, reason: 'Available' };
}

const seed = {
  classrooms: [
    { room_id: 1, room_number: 'A101', capacity: 40, projector: 'Yes', facilities: ['AC', 'Whiteboard'] },
    { room_id: 2, room_number: 'A102', capacity: 35, projector: 'No', facilities: ['Whiteboard'] },
    { room_id: 3, room_number: 'B201', capacity: 50, projector: 'Yes', facilities: ['AC', 'Smart Board'] },
    { room_id: 4, room_number: 'B202', capacity: 45, projector: 'Yes', facilities: ['AC'] },
    { room_id: 5, room_number: 'C301', capacity: 60, projector: 'No', facilities: ['Lab Setup'] }
  ],
  timetable: [
    { room_id: 1, day: 'Monday', time_slot: '08:00-09:00', subject: 'DB' },
    { room_id: 2, day: 'Monday', time_slot: '09:00-10:00', subject: 'OS' },
    { room_id: 3, day: 'Monday', time_slot: '10:00-11:00', subject: 'CN' },
    { room_id: 4, day: 'Monday', time_slot: '11:00-12:00', subject: 'AI' },

    { room_id: 1, day: 'Tuesday', time_slot: '09:00-10:00', subject: 'SE' },
    { room_id: 3, day: 'Tuesday', time_slot: '08:00-09:00', subject: 'ML' },
    { room_id: 5, day: 'Tuesday', time_slot: '10:00-11:00', subject: 'DB' },

    { room_id: 2, day: 'Wednesday', time_slot: '08:00-09:00', subject: 'CN' },
    { room_id: 4, day: 'Wednesday', time_slot: '09:00-10:00', subject: 'OS' },
    { room_id: 5, day: 'Wednesday', time_slot: '11:00-12:00', subject: 'AI' },

    { room_id: 1, day: 'Thursday', time_slot: '10:00-11:00', subject: 'ML' },
    { room_id: 3, day: 'Thursday', time_slot: '11:00-12:00', subject: 'SE' },
    { room_id: 4, day: 'Thursday', time_slot: '08:00-09:00', subject: 'DB' },

    { room_id: 2, day: 'Friday', time_slot: '10:00-11:00', subject: 'AI' },
    { room_id: 3, day: 'Friday', time_slot: '09:00-10:00', subject: 'CN' },
    { room_id: 5, day: 'Friday', time_slot: '08:00-09:00', subject: 'OS' }
  ],
  users: [
    { uid: 1, name: 'Admin User', email: 'admin@ecs.edu', password: 'admin123', role: 'admin' },
    { uid: 2, name: 'Dr. Meera', email: 'meera@ecs.edu', password: 'faculty123', role: 'faculty' },
    { uid: 3, name: 'Prof. Arun', email: 'arun@ecs.edu', password: 'faculty123', role: 'faculty' },
    { uid: 4, name: 'Riya Sharma', email: 'riya@ecs.edu', password: 'student123', role: 'student' },
    { uid: 5, name: 'Karan Patel', email: 'karan@ecs.edu', password: 'student123', role: 'student' },
    { uid: 6, name: 'Nisha Verma', email: 'nisha@ecs.edu', password: 'student123', role: 'student' }
  ],
  bookings: [
    { user_id: 2, room_id: 4, date: '2026-04-14', time_slot: '10:00-11:00', purpose: 'Guest lecture', status: 'active' },
    { user_id: 3, room_id: 2, date: '2026-04-16', time_slot: '11:00-12:00', purpose: 'Remedial class', status: 'active' },
    { user_id: 2, room_id: 5, date: '2026-04-17', time_slot: '09:00-10:00', purpose: 'Workshop', status: 'active' }
  ],
  complaints: [
    { user_id: 4, room_id: 1, issue_type: 'Projector', description: 'Projector not turning on in A101.', status: 'Pending' },
    { user_id: 5, room_id: 3, issue_type: 'AC', description: 'AC cooling is weak in B201.', status: 'Resolved' },
    { user_id: 6, room_id: 5, issue_type: 'Furniture', description: 'Two broken chairs found in C301.', status: 'Pending' }
  ]
};

async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const hashedUsers = await Promise.all(
    seed.users.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
  );

  await User.insertMany(hashedUsers);
  await Classroom.insertMany(seed.classrooms);
  await Timetable.insertMany(seed.timetable);
  await Booking.insertMany(seed.bookings);
  await Complaint.insertMany(seed.complaints);

  console.log('Seed data inserted.');
}

app.get('/api/health', (_, res) => res.json({ ok: true, app: 'ECS' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, role are required' });
    }
    if (!roles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    const last = await User.findOne().sort({ uid: -1 }).lean();
    const uid = last ? last.uid + 1 : 1;

    const user = await User.create({
      uid,
      name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role
    });

    const token = tokenForUser(user);
    return res.status(201).json({ token, user: { uid: user.uid, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = tokenForUser(user);
    return res.json({ token, user: { uid: user.uid, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/classrooms', auth, async (req, res) => {
  try {
    const { room_number, capacity, date, time_slot } = req.query;
    const query = {};
    if (room_number) query.room_number = new RegExp(room_number, 'i');
    if (capacity) query.capacity = { $gte: Number(capacity) };

    const rooms = await Classroom.find(query).sort({ room_id: 1 }).lean();
    if (!date || !time_slot) return res.json(rooms);

    const withStatus = await Promise.all(
      rooms.map(async (r) => {
        const state = await checkOccupancy(r.room_id, date, time_slot);
        return { ...r, status: state.occupied ? 'Occupied' : 'Available', reason: state.reason };
      })
    );

    return res.json(withStatus);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/availability', auth, async (req, res) => {
  try {
    const { date, time_slot } = req.query;
    if (!date || !time_slot) return res.status(400).json({ message: 'date and time_slot are required' });
    if (!allowedSlots.includes(time_slot)) {
      return res.status(400).json({ message: 'Invalid time_slot' });
    }

    const rooms = await Classroom.find().sort({ room_id: 1 }).lean();
    const result = await Promise.all(
      rooms.map(async (r) => {
        const state = await checkOccupancy(r.room_id, date, time_slot);
        return {
          room_id: r.room_id,
          room_number: r.room_number,
          capacity: r.capacity,
          projector: r.projector,
          status: state.occupied ? 'Occupied' : 'Available',
          reason: state.reason
        };
      })
    );

    return res.json({ date, day: getDayFromDate(date), time_slot, classrooms: result });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/timetable', auth, async (_, res) => {
  try {
    const data = await Timetable.find().sort({ day: 1, time_slot: 1, room_id: 1 }).lean();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/bookings', auth, permit('faculty'), async (req, res) => {
  try {
    const { room_id, date, time_slot, purpose } = req.body;
    if (!room_id || !date || !time_slot) {
      return res.status(400).json({ message: 'room_id, date, time_slot are required' });
    }
    if (!allowedSlots.includes(time_slot)) {
      return res.status(400).json({ message: 'Invalid time_slot' });
    }

    const room = await Classroom.findOne({ room_id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const occupancy = await checkOccupancy(room_id, date, time_slot);
    if (occupancy.occupied) {
      return res.status(409).json({ message: `Cannot book room: ${occupancy.reason}` });
    }

    const booking = await Booking.create({
      user_id: req.user.uid,
      room_id,
      date,
      time_slot,
      purpose: purpose || 'Extra class'
    });

    return res.status(201).json(booking);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/bookings', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'faculty' ? { user_id: req.user.uid } : {};
    const data = await Booking.find(filter).sort({ date: 1, time_slot: 1 }).lean();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.patch('/api/bookings/:id/cancel', auth, permit('faculty'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.uid) return res.status(403).json({ message: 'Can cancel only own bookings' });

    booking.status = 'cancelled';
    await booking.save();
    return res.json({ message: 'Booking cancelled', booking });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/complaints', auth, permit('faculty', 'student'), async (req, res) => {
  try {
    const { room_id, issue_type, description } = req.body;
    if (!room_id || !issue_type || !description) {
      return res.status(400).json({ message: 'room_id, issue_type, description are required' });
    }

    const room = await Classroom.findOne({ room_id });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const complaint = await Complaint.create({
      user_id: req.user.uid,
      room_id,
      issue_type,
      description
    });

    return res.status(201).json(complaint);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/complaints', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user_id: req.user.uid };
    const data = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.patch('/api/complaints/:id/status', auth, permit('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Complaint not found' });

    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/admin/users', auth, permit('admin'), async (_, res) => {
  const users = await User.find({}, { password: 0, _id: 0, __v: 0 }).sort({ uid: 1 }).lean();
  return res.json(users);
});

app.post('/api/admin/classrooms', auth, permit('admin'), async (req, res) => {
  try {
    const { room_number, capacity, projector, facilities } = req.body;
    if (!room_number || !capacity) return res.status(400).json({ message: 'room_number and capacity are required' });

    const last = await Classroom.findOne().sort({ room_id: -1 }).lean();
    const room_id = last ? last.room_id + 1 : 1;

    const room = await Classroom.create({
      room_id,
      room_number,
      capacity,
      projector: projector || 'No',
      facilities: facilities || []
    });

    return res.status(201).json(room);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.put('/api/admin/classrooms/:roomId', auth, permit('admin'), async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const updated = await Classroom.findOneAndUpdate({ room_id: roomId }, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Room not found' });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/admin/timetable', auth, permit('admin'), async (req, res) => {
  try {
    const { room_id, day, time_slot, subject } = req.body;
    if (!room_id || !day || !time_slot || !subject) {
      return res.status(400).json({ message: 'room_id, day, time_slot, subject are required' });
    }

    const row = await Timetable.create({ room_id, day, time_slot, subject });
    return res.status(201).json(row);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Duplicate timetable entry for room+day+time slot' });
    }
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/admin/timetable/bulk', auth, permit('admin'), async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ message: 'entries must be an array' });
    const inserted = await Timetable.insertMany(entries, { ordered: false });
    return res.status(201).json({ inserted: inserted.length });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get('/api/analytics', auth, permit('admin'), async (_, res) => {
  try {
    const rooms = await Classroom.find().lean();
    const tt = await Timetable.find().lean();
    const b = await Booking.find({ status: 'active' }).lean();

    const usageByRoom = {};
    const usageBySlot = {};

    for (const r of rooms) usageByRoom[r.room_number] = 0;

    for (const t of tt) {
      const room = rooms.find((r) => r.room_id === t.room_id);
      if (room) usageByRoom[room.room_number] += 1;
      usageBySlot[t.time_slot] = (usageBySlot[t.time_slot] || 0) + 1;
    }

    for (const bk of b) {
      const room = rooms.find((r) => r.room_id === bk.room_id);
      if (room) usageByRoom[room.room_number] += 1;
      usageBySlot[bk.time_slot] = (usageBySlot[bk.time_slot] || 0) + 1;
    }

    const sortedRooms = Object.entries(usageByRoom).sort((a, c) => c[1] - a[1]);

    return res.json({
      usageByRoom,
      usageBySlot,
      mostUsedClassrooms: sortedRooms.slice(0, 3),
      leastUsedClassrooms: sortedRooms.slice(-3).reverse(),
      peakUsageTime: Object.entries(usageBySlot).sort((a, c) => c[1] - a[1])[0] || null
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/recommend-room', auth, permit('faculty'), async (req, res) => {
  try {
    const { date, time_slot, min_capacity = 1, need_projector = false } = req.body;
    if (!date || !time_slot) return res.status(400).json({ message: 'date and time_slot are required' });

    const candidates = await Classroom.find({ capacity: { $gte: Number(min_capacity) } }).lean();
    const scored = [];

    for (const room of candidates) {
      const state = await checkOccupancy(room.room_id, date, time_slot);
      if (!state.occupied) {
        let score = room.capacity;
        if (need_projector && room.projector === 'No') score -= 20;
        if (need_projector && room.projector === 'Yes') score += 20;
        scored.push({ ...room, score });
      }
    }

    scored.sort((a, b2) => b2.score - a.score);
    return res.json({ recommended: scored[0] || null, alternatives: scored.slice(1, 3) });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post('/api/chatbot', auth, async (req, res) => {
  try {
    const { message = '' } = req.body;
    const text = message.toLowerCase();

    if (text.includes('available') && text.includes('room')) {
      return res.json({ reply: 'Use the Dashboard filters with date + time slot. Green badge means available.' });
    }
    if (text.includes('book')) {
      return res.json({ reply: 'Faculty can book from the Booking tab after selecting date, time slot, and room.' });
    }
    if (text.includes('complaint')) {
      return res.json({ reply: 'Students and faculty can submit room issues from the Complaints tab.' });
    }

    return res.json({ reply: 'Try asking: "Which rooms are available?", "How to book a room?", or "How to raise complaint?"' });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await seedIfEmpty();
    app.listen(PORT, () => {
      console.log(`ECS server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
