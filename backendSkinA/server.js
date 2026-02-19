require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const cors = require('cors')
const validator = require('validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs');
const {Xendit} = require('xendit-node')
// const socketIo = require('socket.io');


const User = require('./models/User')
const Qna = require('./models/Qna')
const Skincare = require('./models/Skincare')
const questions = require('./data/questions')
const Reservasi = require('./models/Reservasi')
const Treatment = require('./models/Treatment')
const Artikel = require('./models/Artikel')
const Banner = require('./models/Banner')
const Dokter = require('./models/Dokter')
const req = require('express/lib/request')

// const io = socketIo(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// // Store room connections
// const rooms = new Map();

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   // Join room berdasarkan reservationId
//   socket.on('join_room', (data) => {
//     const { reservationId, userId } = data;
//     socket.join(reservationId);
//     rooms.set(socket.id, reservationId);
//     console.log(`User ${userId} joined room: ${reservationId}`);
//   });

//   // Handle text messages
//   socket.on('send_message', (data) => {
//     const { reservationId, text, senderType, timestamp } = data;
//     socket.to(reservationId).emit('receive_message', {
//       text,
//       senderType,
//       timestamp
//     });
//   });

//   // Handle image messages
//   socket.on('send_image', (data) => {
//     const { reservationId, imageUrl, senderType, timestamp } = data;
//     socket.to(reservationId).emit('receive_image', {
//       imageUrl,
//       senderType,
//       timestamp
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//     rooms.delete(socket.id);
//   });
// });

// // Configure multer for image uploads
// const storagee = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/chat/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const uploadd = multer({ storagee: storagee });

// // Get chat history
// app.get('/api/chat/:reservationId', async (req, res) => {
//   try {
//     // Implementasi untuk mendapatkan riwayat chat dari database
//     const messages = await Chat.find({ reservationId: req.params.reservationId })
//       .sort({ timestamp: 1 });
//     res.json({ messages });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Send text message
// app.post('/api/chat/send', async (req, res) => {
//   try {
//     const { reservationId, text, senderType, timestamp } = req.body;
    
//     const message = new Chat({
//       reservationId,
//       text,
//       senderType,
//       timestamp: new Date(timestamp)
//     });

//     await message.save();
//     res.status(200).json({ message: 'Message sent successfully' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Upload image
// app.post('/api/chat/upload-image', upload.single('image'), async (req, res) => {
//   try {
//     const { reservationId, senderType, timestamp } = req.body;
    
//     const message = new Chat({
//       reservationId,
//       image: `/uploads/chat/${req.file.filename}`,
//       senderType,
//       timestamp: new Date(timestamp)
//     });

//     await message.save();
//     res.status(200).json({ 
//       message: 'Image sent successfully',
//       imageUrl: `/uploads/chat/${req.file.filename}`
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

const app = express();
const port = 3000;

app.use(cors({
  origin: '*', // Izinkan semua domain (sementara untuk testing)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Set content type berdasarkan extension file
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.setHeader('Content-Type', 'image/jpeg');
        break;
      case '.png':
        res.setHeader('Content-Type', 'image/png');
        break;
      case '.gif':
        res.setHeader('Content-Type', 'image/gif');
        break;
      case '.webp':
        res.setHeader('Content-Type', 'image/webp');
        break;
      default:
        res.setHeader('Content-Type', 'application/octet-stream');
    }
  }
}));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err))

// KONFIGURASI XENDIT
const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});
const {Invoice} = xendit;

const createToken = (userId, role) => {
    return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });
};

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Ambil token setelah 'Bearer '
  
  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Akses admin ditolak' });
  }
  next();
};

const checkExistingReservation = async (userId, tanggalReservasi, waktuReservasi) => {
  // Query langsung dengan string format "dd/mm/yyyy"
  const existing = await Reservasi.findOne({
    userId,
    tanggalReservasi: tanggalReservasi, // Gunakan string langsung
    waktuReservasi
  });
  
  return !!existing;
};

// Tambahkan di awal server.js untuk memastikan folder uploads ada
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// CONFIGURE MULTER FOR FILE UPLOAD
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Pastikan folder uploads ada
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Nama file unik dengan timestamp dan pertahankan extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

const fileFilter = function (req, file, cb) {
  console.log('Uploading file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/octet-stream'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan. Type: ' + file.mimetype), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// // Store active connections
// const activeConnections = new Map();

// wss.on('connection', function connection(ws, req) {
//   console.log('New WebSocket connection');
  
//   // Extract reservation ID from URL
//   const url = new URL(req.url, `http://${req.headers.host}`);
//   const reservationId = url.searchParams.get('reservationId');
//   const userType = url.searchParams.get('userType'); // 'doctor' or 'user'
//   const userId = url.searchParams.get('userId');
  
//   if (!reservationId || !userType || !userId) {
//     ws.close(1008, 'Missing parameters');
//     return;
//   }
  
//   // Store connection
//   const connectionKey = `${reservationId}_${userType}_${userId}`;
//   activeConnections.set(connectionKey, ws);
  
//   console.log(`Connection established for reservation: ${reservationId}, user: ${userId}, type: ${userType}`);
  
//   // Handle messages
//   ws.on('message', function incoming(data) {
//     try {
//       const message = JSON.parse(data);
//       console.log('Received message:', message);
      
//       // Broadcast to the other participant
//       const targetUserType = userType === 'doctor' ? 'user' : 'doctor';
//       const targetConnectionKey = `${reservationId}_${targetUserType}_${userId}`;
//       const targetWs = activeConnections.get(targetConnectionKey);
      
//       if (targetWs && targetWs.readyState === WebSocket.OPEN) {
//         targetWs.send(JSON.stringify({
//           type: 'message',
//           text: message.text,
//           image: message.image,
//           time: new Date().toISOString(),
//           isUser: userType === 'user'
//         }));
//       }
      
//       // Save to database (optional)
//       saveMessageToDatabase(reservationId, message, userType);
      
//     } catch (error) {
//       console.error('Error processing message:', error);
//     }
//   });
  
//   // Handle connection close
//   ws.on('close', function() {
//     activeConnections.delete(connectionKey);
//     console.log(`Connection closed for: ${connectionKey}`);
//   });
  
//   // Handle errors
//   ws.on('error', function(error) {
//     console.error('WebSocket error:', error);
//     activeConnections.delete(connectionKey);
//   });
// });

// // Function to save message to database
// async function saveMessageToDatabase(reservationId, message, userType) {
//   try {
//     // Implement your database saving logic here
//     // You might want to create a new collection for chat messages
//     const ChatMessage = require('./models/ChatMessage');
    
//     await ChatMessage.create({
//       reservationId,
//       text: message.text,
//       image: message.image,
//       isUser: userType === 'user',
//       timestamp: new Date()
//     });
    
//   } catch (error) {
//     console.error('Error saving message to database:', error);
//   }
// }

// console.log('WebSocket server running on port 8080');

// AUTH
app.get('/api/auth/verify', authenticateUser, (req, res) => {
  res.status(200).json({ valid: true });
});

// BUAT HASH PASSWORD

// const saltRounds = 10;
// bcrypt.hash('terapis1', saltRounds, function(err, hash) {
//   console.log('Hashed password terapis:', hash);
// });

// bcrypt.hash('dokter1', saltRounds, function(err, hash) {
//   console.log('Hashed password dokter:', hash);
// });

// LOGIN
app.post('/api/login', async (req, res) => {
  console.log('Data diterima dari frontend: ', req.body)
    try{
        const {email, password} = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password harus diisi'})
        }
        
        const user = await User.findOne({ email })
        if(!user) {
            return res.status(401).json({ message: 'Akun tidak ada'})
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ message: 'Password salah' });
        }

        const token = createToken(user._id, user.role);

        let doctorData = {};
        if (user.role === 'dokter') {
          const dokter = await Dokter.findOne({ nama: user.nama });
          if (dokter) {
            doctorData = {
              doctorId: dokter._id.toString(),
              doctorName: dokter.nama,
              spesialis: dokter.spesialis
            };
          }
        }

        const responseData = {
            token,
            user: {
                id: user._id,
                nama: user.nama,
                email: user.email,
                tanggalLahir: user.tanggalLahir,
                alamat: user.alamat,
                noHandphone: user.noHandphone,
                role: user.role,
                hasCompletedQna: user.hasCompletedQna,
                favoriteDoctors: user.favoriteDoctors || []
            },
             ...doctorData,
           message: user.role === 'admin' ? 'Login admin berhasil' : 'Login berhasil'
        }

        res.status(200).json(responseData);
    }catch (err){
        console.error(err);
        res.status(500).json({ message: 'Login gagal' })
    }
});

// REGISTER
app.post('/api/register', async (req, res) => {
  console.log('Data diterima dari frontend: ', req.body)
    try{
        const {nama, email, tanggalLahir, noHandphone, alamat, password, konfirmPassword} = req.body;

        if (!nama || !email || !tanggalLahir || !noHandphone || !alamat || !password || !konfirmPassword) {
            return res.status(400).json({ message: 'Semua field harus diisi' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Format email tidak valid' });
        }
          
        if(password !== konfirmPassword) {
            return res.status(400).json({ message: 'Password tidak sama'})
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password minimal 8 karakter' });
        }

        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(tanggalLahir)) {
            return res.status(400).json({ message: 'Format tanggal lahir harus dd/mm/yyyy' });
        }
      
        if (!/^(\+62|0)[0-9]{9,12}$/.test(noHandphone)) {
            return res.status(400).json({ message: 'Format nomor handphone tidak valid' });
        }

        // Hash password dengan salt rounds 10
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            nama,
            email,
            tanggalLahir,
            noHandphone,
            alamat,
            password: hashedPassword,
            role: 'user' // Default role
        });

        const token = createToken(user._id, user.role);

        res.status(201).json({
        token,
        user: {
            id: user._id,
            nama: user.nama,
            email: user.email,
            role: user.role
        },
        message: 'Registrasi berhasil'
        });
    }catch (err){
        if(err.code === 11000) {
            return res.status(400).json({ message: 'Akun sudah terdaftar' })
        }
        console.log(err.message)
        res.status(500).json({ message: 'Register gagal. Coba Lagi'})
    }
});

// GET TOTAL USERS
app.get('/api/users/total', authenticateUser, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    res.json({
      success: true,
      total: totalUsers
    });
  } catch (err) {
    console.error('Error getting total users:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil total pengguna',
      error: err.message
    });
  }
});

// GET TOTAL TRANSACTIONS (Paid Reservations)
app.get('/api/reservations/total-transactions', authenticateUser, adminAuth, async (req, res) => {
  try {
    const totalTransactions = await Reservasi.countDocuments({ 
      paymentStatus: 'paid' 
    });
    
    res.json({
      success: true,
      total: totalTransactions
    });
  } catch (err) {
    console.error('Error getting total transactions:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil total transaksi',
      error: err.message
    });
  }
});

// ALL QNA
app.get('/api/qna/questions', authenticateUser, (req, res) => {
    res.json(questions);
});
  
// QNA SUBMIT - DIPERBAIKI
app.post('/api/qna/submit', authenticateUser, async (req, res) => {
    console.log('Received QnA submission:', req.body);
    try {
        const { responses } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(responses)) {
            return res.status(400).json({ message: 'Responses harus berupa array' });
        }

        // Process each response
        const processedResponses = responses.map(res => {
            // Cari pertanyaan yang sesuai dari array questions
            const question = questions.find(q => q.id.toString() === res.questionId.toString());
            
            if (!question) {
                return {
                    questionId: res.questionId,
                    questionText: 'Pertanyaan tidak ditemukan',
                    questionImage: null,
                    answerIndex: res.answerIndex,
                    answerText: 'Jawaban tidak valid',
                    answerImage: null,
                    answerType: 'text'
                };
            }

            // Pastikan answerIndex valid
            const answerIndex = parseInt(res.answerIndex);
            if (isNaN(answerIndex) || answerIndex < 0 || answerIndex >= question.answers.length) {
                return {
                    questionId: res.questionId,
                    questionText: question.question || 'Unknown',
                    questionImage: question.image || null,
                    answerIndex: res.answerIndex,
                    answerText: 'Index jawaban tidak valid',
                    answerImage: null,
                    answerType: 'text'
                };
            }

            const answer = question.answers[answerIndex];
            
            return {
                questionId: res.questionId,
                questionText: question.question || 'Unknown',
                questionImage: question.image || null,
                answerIndex: answerIndex,
                answerText: answer.text || 'Unknown',
                answerImage: answer.content || null,
                answerType: answer.type || 'text'
            };
        });

        const qnaData = {
            userId,
            responses: processedResponses,
            completedAt: new Date()
        };

        const qnaResponse = await Qna.create(qnaData);
        
        // Update user status
        await User.findByIdAndUpdate(userId, { 
            $set: { 
                hasCompletedQna: true,
                qnaCompletedAt: new Date()
            } 
        });

        res.json({
            success: true,
            data: qnaResponse,
            message: 'QnA berhasil disimpan dengan lengkap'
        });

    } catch (err) {
        console.error('Error saving QnA:', err);
        res.status(500).json({ 
            success: false,
            message: 'Gagal menyimpan responses',
            error: err.message 
        });
    } 
});

// GET USER QNA HISTORY
app.get('/api/qna/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const userQna = await Qna.findOne({ userId })
            .sort({ completedAt: -1 }); // Urutkan dari yang terbaru

        if (!userQna) {
            return res.json({
                success: true,
                data: null,
                message: 'Belum mengisi QnA'
            });
        }

        res.json({
            success: true,
            data: {
                completedAt: userQna.completedAt,
                responses: userQna.responses
            }
        });

    } catch (err) {
        console.error('Error getting QnA history:', err);
        res.status(500).json({ 
            success: false,
            message: 'Gagal mengambil history QnA',
            error: err.message 
        });
    }
});

// EDIT PROFIL
app.put('/api/user/update', authenticateUser, async (req,res) => {
  console.log('Update profile:', req.body);
  try {
    const { nama, email, alamat, tanggalLahir, noHandphone } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!nama || !email || !alamat || !tanggalLahir || !noHandphone) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(tanggalLahir)) {
      return res.status(400).json({ message: 'Format tanggal lahir harus dd/mm/yyyy' });
    }

    if (!/^(\+62|0)[0-9]{9,12}$/.test(noHandphone)) {
      return res.status(400).json({ message: 'Format nomor handphone tidak valid' });
    }

    // Check if email is being changed to one that already exists
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah digunakan oleh akun lain' });
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        nama,
        email,
        alamat,
        tanggalLahir,
        noHandphone
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Return updated user data (excluding sensitive fields)
    const userResponse = {
      id: updatedUser._id,
      nama: updatedUser.nama,
      email: updatedUser.email,
      tanggalLahir: updatedUser.tanggalLahir,
      alamat: updatedUser.alamat,
      noHandphone: updatedUser.noHandphone,
      role: updatedUser.role,
      hasCompletedQna: updatedUser.hasCompletedQna
    };

    res.json({
      success: true,
      user: userResponse,
      message: 'Profil berhasil diperbarui'
    });

  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui profil',
      error: err.message 
    });
  }
})

// ADD SKINCARE
app.post('/api/addSkincare', authenticateUser, async (req, res) => {
  try {
    const { products } = req.body;
    const userId = req.user.id;

    console.log('Received products:', products); // Debug log

    // Validate input
    if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Produk skincare harus diisi' });
    }

    // Validate each product
    for (const product of products) {
        if (!product.name || !product.type || !product.ingredients) {
            return res.status(400).json({ message: 'Semua field produk harus diisi' });
        }
        if (product.ingredients.length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'Setiap produk harus memiliki minimal 1 ingredient' 
          });
      }
    }

    // Find or create skincare document for user
    let skincare = await Skincare.findOneAndUpdate(
      { userId },
      {
        $set: { userId },
        $push: { 
          products: { 
            $each: products.map(p => ({
              name: p.name,
              type: p.type,
              ingredients: p.ingredients
            }))
          }
        }
      },
      { 
        new: true,
        upsert: true 
      }
    );

    res.json({
        success: true,
        message: 'Skincare berhasil disimpan',
        data: skincare
    });

  } catch (err) {
      console.error('Error saving skincare:', err);
      res.status(500).json({ 
          success: false,
          message: 'Gagal menyimpan skincare',
          error: err.message 
      });
  }
})

// ALL SKINCARE
app.get('/api/skincare', authenticateUser, async (req, res) => {
  try {
      const userId = req.user.id;
      const skincare = await Skincare.findOne({ userId });

      if (!skincare) {
          return res.json({
              success: true,
              data: { products: [] }
          });
      }

      res.json({
          success: true,
          data: skincare
      });

  } catch (err) {
      console.error('Error fetching skincare:', err);
      res.status(500).json({ 
          success: false,
          message: 'Gagal mengambil data skincare',
          error: err.message 
      });
  }
});

// GET USER SKINCARE
app.get('/api/user/skincare', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Cari data skincare user
    const skincare = await Skincare.findOne({ userId });
    
    if (!skincare) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Format response sesuai kebutuhan frontend
    const skincareData = skincare.products.map(product => ({
      name: product.name,
      type: product.type,
      ingredients: product.ingredients
    }));

    res.json({
      success: true,
      data: skincareData
    });

  } catch (err) {
    console.error('Error getting user skincare:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data skincare user',
      error: err.message 
    });
  }
});

// UPDATE RUTINITAS HARIAN
app.put('/api/user/rutinitas', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rutinitasHarian, skincareRutinitas } = req.body;

    const updateData = {};
    
    if (rutinitasHarian !== undefined) {
      updateData.rutinitasHarian = rutinitasHarian;
    }
    
    if (skincareRutinitas) {
      updateData.skincareRutinitas = skincareRutinitas;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: 'Rutinitas harian berhasil diperbarui',
      data: {
        rutinitasHarian: updatedUser.rutinitasHarian,
        skincareRutinitas: updatedUser.skincareRutinitas
      }
    });

  } catch (err) {
    console.error('Error updating rutinitas:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui rutinitas harian',
      error: err.message 
    });
  }
});

// GET USER RUTINITAS
app.get('/api/user/rutinitas', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('rutinitasHarian skincareRutinitas');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        rutinitasHarian: user.rutinitasHarian || 0,
        skincareRutinitas: user.skincareRutinitas || {
          pagi: [],
          malam: []
        }
      }
    });

  } catch (err) {
    console.error('Error getting user rutinitas:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data rutinitas',
      error: err.message 
    });
  }
});

//FAVORITE DOKTER
app.post('/api/favoriteDoctor', authenticateUser, async (req, res) => {
  try {
    const { doctorId, doctorName, isFavorite } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if doctor already exists in favorites
    const existingIndex = user.favoriteDoctors.findIndex(
      doc => doc.doctorId === doctorId
    );

    if (isFavorite) {
      // Add to favorites if not already there
      if (existingIndex === -1) {
        user.favoriteDoctors.push({ doctorId, doctorName, isFavorite: true });
      } else {
        user.favoriteDoctors[existingIndex].isFavorite = true;
      }
    } else {
      // Remove from favorites if exists
      if (existingIndex !== -1) {
        user.favoriteDoctors.splice(existingIndex, 1);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: isFavorite ? 'Doctor added to favorites' : 'Doctor removed from favorites',
      favoriteDoctors: user.favoriteDoctors
    });

  } catch (err) {
    console.error('Error updating favorites:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update favorites',
      error: err.message 
    });
  }
});

// ALL FAVORITE DOKTER
app.get('/api/favoriteDoctors', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('favoriteDoctors');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      favoriteDoctors: user.favoriteDoctors || []
    });

  } catch (err) {
    console.error('Error getting favorites:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get favorites',
      error: err.message 
    });
  }
});

// RESERVASI
app.post('/api/reservasi', authenticateUser, async (req, res) => {
  try {
    const {
      tipe,
      treatment,
      dokter,
      pic,
      waktuReservasi,
      tanggalReservasi,
      catatanTambahan
    } = req.body;

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validasi input
    if (tipe === 'NON_MEDIS' && !treatment) {
      return res.status(400).json({ message: 'Treatment harus diisi untuk reservasi non medis' });
    }

    if ((tipe === 'MEDIS' || tipe === 'KONSULTASI') && !dokter) {
      return res.status(400).json({ message: 'Dokter harus dipilih untuk reservasi ini' });
    }

    if (!waktuReservasi || !tanggalReservasi) {
      return res.status(400).json({ message: 'Waktu dan tanggal reservasi harus diisi' });
    }

    // Validasi format tanggal "dd/mm/yyyy"
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(tanggalReservasi)) {
      return res.status(400).json({ message: 'Format tanggal harus dd/mm/yyyy' });
    }

    // Generate custom ID
    const [day, month, year] = tanggalReservasi.split('/');
    
    const sameDayReservations = await Reservasi.find({
      tanggalReservasi: tanggalReservasi
    }).sort({ createdAt: 1 });
    
    const sequenceNumber = (sameDayReservations.length + 1).toString().padStart(2, '0');
    const customId = `CT${day}${month}${sequenceNumber}`;

    // Get user's skincare products if available
    let produkSkincare = [];
    try {
      const skincare = await Skincare.findOne({ userId: userId });
      if (skincare && skincare.products) {
        produkSkincare = skincare.products.map(product => ({
          name: product.name,
          productType: product.type
        }));
      }
    } catch (err) {
      console.error('Error fetching skincare products:', err);
    }

    // Tentukan PIC berdasarkan tipe reservasi
    let picValue;
    if (tipe === 'NON_MEDIS') {
      picValue = 'terapis'; // Auto set to 'terapis' for non-medis
    } else {
      picValue = dokter; // Use selected doctor for medis/konsultasi
    }

    // Validasi bahwa picValue tidak null/undefined
    if (!picValue) {
      return res.status(400).json({ 
        message: 'PIC harus diisi untuk reservasi ini' 
      });
    }

    // Create new reservation
    const newReservasi = await Reservasi.create({
      userId,
      id: customId,
      tipe,
      treatment: tipe === 'NON_MEDIS' ? treatment : null,
      pic: picValue, // Gunakan nilai yang sudah ditentukan
      jamReservasi: waktuReservasi,
      tanggalReservasi: tanggalReservasi,
      namaPasien: user.nama,
      status: 'menunggu',
      laporanRutinitas: user.rutinitasHarian ? `Rutinitas harian: ${user.rutinitasHarian}%` : null,
      produkSkincare: produkSkincare,
      tipeKulit: null
    });

    // Add reservation to user's reservations array
    user.reservasi.push(newReservasi._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Reservasi berhasil dibuat',
      data: newReservasi
    });

  } catch (err) {
    console.error('Error creating reservation:', err);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({ 
        success: false,
        message: 'Validasi gagal',
        errors: errors 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat reservasi',
      error: err.message 
    });
  }
});

// GET waktu tersedia berdasarkan dokter dan tanggal
app.get('/api/reservasi/waktuTersedia', authenticateUser, async (req, res) => {
  try {
    const { tanggalReservasi, doctorId } = req.query;

    if (!tanggalReservasi) {
      return res.status(400).json({ message: 'Parameter tanggalReservasi diperlukan' });
    }

    // Validasi format tanggal "dd/mm/yyyy"
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(tanggalReservasi)) {
      return res.status(400).json({ message: 'Format tanggal harus dd/mm/yyyy' });
    }

    // Cari waktu yang sudah dipesan di tanggal tersebut - GUNAKAN STRING LANGSUNG
    const existingReservations = await Reservasi.find({
      tanggalReservasi: tanggalReservasi, // Query dengan string langsung
      ...(doctorId && { dokter: doctorId }) // Field name 'dokter' sesuai schema
    });

    let availableTimeSlots = [];

    // Jika ada doctorId, cari jadwal dokter untuk hari tersebut
    if (doctorId) {
      const dokter = await Dokter.findById(doctorId);
      if (dokter && dokter.jadwalPraktik) {
        // Dapatkan hari dari tanggal
        const [day, month, year] = tanggalReservasi.split('/');
        const dateObj = new Date(`${year}-${month}-${day}`);
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[dateObj.getDay()];
        
        // Cari jadwal untuk hari tersebut
        const jadwalHariIni = dokter.jadwalPraktik.find(j => j.hari === dayName);
        
        if (jadwalHariIni && jadwalHariIni.jamPraktik) {
          // Format jam praktik menjadi pilihan waktu
          availableTimeSlots = jadwalHariIni.jamPraktik.map(jam => 
            `${jam.jamMulai} - ${jam.jamAkhir}`
          );
        }
      }
    }

    // Jika tidak ada jadwal dokter atau tidak ada doctorId, gunakan waktu default
    if (availableTimeSlots.length === 0) {
      // Kembalikan waktu default jika tidak ada jadwal dokter
      availableTimeSlots = [
        '08:00 - 09:00',
        '09:00 - 10:00', 
        '10:00 - 11:00',
        '11:00 - 12:00',
        '13:00 - 14:00',
        '14:00 - 15:00',
        '15:00 - 16:00',
        '16:00 - 17:00'
      ];
    }

    // Filter waktu yang sudah dipesan
    const bookedTimeSlots = existingReservations.map(r => r.waktuReservasi);
    const finalAvailableTimeSlots = availableTimeSlots.filter(
      time => !bookedTimeSlots.includes(time)
    );

    res.json({
      success: true,
      data: finalAvailableTimeSlots
    });

  } catch (err) {
    console.error('Error getting available time slots:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mendapatkan waktu tersedia',
      error: err.message 
    });
  }
});

// ALL RESERVASI
app.get('/api/reservasi', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const reservations = await Reservasi.find({ userId })
      .sort({ tanggalReservasi: 1 }); // Urutkan berdasarkan tanggal ascending

    res.json({
      success: true,
      data: reservations
    });

  } catch (err) {
    console.error('Error getting reservations:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get reservations',
      error: err.message 
    });
  }
});

// GET RESERVASI BY DOCTOR - Perbaiki endpoint ini
app.get('/api/reservasi/dokter/:doctorId', authenticateUser, async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // Cari dokter berdasarkan ID untuk mendapatkan nama
    const dokter = await Dokter.findById(doctorId);
    if (!dokter) {
      return res.status(404).json({ message: 'Dokter tidak ditemukan' });
    }

    // Cari reservasi berdasarkan nama dokter (karena di schema pic adalah string nama)
    const reservations = await Reservasi.find({
      pic: dokter.nama, // Cari berdasarkan nama dokter
      tipe: { $in: ['MEDIS', 'KONSULTASI'] } // Hanya reservasi medis/konsultasi
    }).sort({ tanggalReservasi: 1 });

    res.json({
      success: true,
      data: reservations
    });

  } catch (err) {
    console.error('Error getting doctor reservations:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get doctor reservations',
      error: err.message 
    });
  }
});

// GET booked times for specific date and type
app.get('/api/reservasi/booked-times', authenticateUser, async (req, res) => {
  try {
    const { tanggalReservasi, type } = req.query;

    if (!tanggalReservasi || !type) {
      return res.status(400).json({ message: 'Parameter tanggalReservasi dan type diperlukan' });
    }

    // Cari reservasi yang sudah ada pada tanggal dan type tertentu
    const existingReservations = await Reservasi.find({
      tanggalReservasi: tanggalReservasi,
      tipe: type
    });

    // Ambil semua waktu yang sudah dipesan
    const bookedTimes = existingReservations.map(r => r.waktuReservasi);

    res.json({
      success: true,
      data: bookedTimes
    });

  } catch (err) {
    console.error('Error getting booked times:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mendapatkan waktu yang sudah dipesan',
      error: err.message 
    });
  }
});

// GET TODAY'S APPOINTMENTS WITH FILTERED PAYMENT STATUS
// For KONSULTASI: only paid
// For other types: all appointments
app.get('/api/reservasi/today-filtered', authenticateUser, adminAuth, async (req, res) => {
  try {
    // Get today's date in dd/mm/yyyy format
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;

    // Find today's reservations
    const todayAppointments = await Reservasi.find({
      tanggalReservasi: todayFormatted,
      $or: [
        // For KONSULTASI: only show paid
        { 
          tipe: 'KONSULTASI', 
          paymentStatus: 'paid' 
        },
        // For other types: show all regardless of payment status
        { 
          tipe: { $in: ['MEDIS', 'NON_MEDIS'] } 
        }
      ]
    })
    .populate('userId', 'nama email noHandphone') // Populate user data
    .sort({ jamReservasi: 1 }); // Sort by time

    res.json({
      success: true,
      data: todayAppointments
    });

  } catch (err) {
    console.error('Error getting today filtered appointments:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil appointment hari ini',
      error: err.message 
    });
  }
});

// GET DETAIL RESERVASI BY ID - DIPERBAIKI
app.get('/api/reservasi/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validasi apakah id adalah ObjectId yang valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Format ID reservasi tidak valid'
      });
    }

    // Cari reservasi berdasarkan ID
    const reservation = await Reservasi.findById(id)
      .populate('userId', 'nama email noHandphone');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservasi tidak ditemukan'
      });
    }

    // Pastikan user hanya bisa mengakses reservasinya sendiri (kecuali admin)
    if (req.user.role !== 'admin' && reservation.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Ini bukan reservasi Anda.'
      });
    }

    res.json({
      success: true,
      data: reservation
    });

  } catch (err) {
    console.error('Error getting reservation detail:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil detail reservasi',
      error: err.message 
    });
  }
});

// UPDATE STATUS RESERVASI DAN HASIL TREATMENT
app.put('/api/reservasi/:id/status', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hasilTreatment } = req.body;

    const updateData = { status };
    
    // Jika ada hasil treatment, tambahkan ke update data
    if (hasilTreatment) {
      updateData.hasilTreatment = hasilTreatment;
    }

    const updatedReservasi = await Reservasi.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedReservasi
    });
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui status reservasi',
      error: err.message 
    });
  }
});

// GET COMPLETED RESERVATIONS FOR PATIENT HISTORY
app.get('/api/reservasi/history-completed', authenticateUser, async (req, res) => {
  try {
    // Find completed reservations (status: selesai) with pic = terapis
    const completedReservations = await Reservasi.find({
      status: 'selesai',
      pic: 'terapis'
    })
    .populate('userId', 'nama tanggalLahir') // Populate user data untuk nama dan umur
    .sort({ tanggalReservasi: -1, jamReservasi: -1 }); // Urutkan dari yang terbaru

    // Format data untuk response
    const formattedData = completedReservations.map(reservation => ({
      id: reservation.id,
      patientName: reservation.namaPasien,
      patientAge: reservation.userId ? calculateAge(reservation.userId.tanggalLahir) : 'Unknown',
      treatment: reservation.treatment,
      date: reservation.tanggalReservasi,
      time: reservation.jamReservasi,
      status: reservation.status,
      hasilTreatment: reservation.hasilTreatment
    }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (err) {
    console.error('Error getting completed reservations:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil histori pasien',
      error: err.message 
    });
  }
});

// Helper function untuk menghitung umur dari tanggal lahir
function calculateAge(tanggalLahir) {
  if (!tanggalLahir) return 'Unknown';
  
  const [day, month, year] = tanggalLahir.split('/').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return `${age} tahun`;
}

// GET COMPLETED RESERVATIONS FOR PATIENT HISTORY - DIPERBAIKI
app.get('/api/reservasi/history-completedd', authenticateUser, async (req, res) => {
  try {
    const userId = req.body.id; // Dapatkan ID user yang sedang login
    
    // Cari SEMUA reservasi yang diselesaikan oleh user ini
    const completedReservations = await Reservasi.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $regex: /^selesai$/i }
    })
    .populate('userId', 'nama tanggalLahir')
    .sort({ tanggalReservasi: -1, jamReservasi: -1 }); // Urutkan dari yang terbaru

    // Format data untuk response
    const formattedData = completedReservations.map(reservation => ({
      // _id: reservation._id,
      id: reservation._id.toString(),
      tanggalReservasi: reservation.tanggalReservasi,
      jamReservasi: reservation.jamReservasi,
      tipe: reservation.tipe,
      treatment: reservation.treatment,
      pic: reservation.pic,
      status: reservation.status,
      hasilTreatment: reservation.hasilTreatment,
      namaPasien: reservation.namaPasien,
      patientAge: reservation.userId ? calculateAge(reservation.userId.tanggalLahir) : 'Unknown',
      // Tambahkan field lain yang diperlukan
    }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (err) {
    console.error('Error getting completed reservations:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil histori pasien',
      error: err.message 
    });
  }
});

// GET TOTAL NON-MEDIS RESERVATIONS (UNTUK TERAPIS)
app.get('/api/reservasi/total-nonmedis', authenticateUser, async (req, res) => {
  try {
    const totalNonMedis = await Reservasi.countDocuments({ 
      tipe: 'NON_MEDIS',
      pic: 'terapis'
    });
    
    res.json({
      success: true,
      total: totalNonMedis
    });
  } catch (err) {
    console.error('Error getting total non-medis reservations:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil total pasien non-medis',
      error: err.message
    });
  }
});

// GET TODAY'S NON-MEDIS APPOINTMENTS (UNTUK TERAPIS)
app.get('/api/reservasi/today-nonmedis', authenticateUser, async (req, res) => {
  try {
    // Get today's date in dd/mm/yyyy format
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;

    // Find today's non-medis reservations with pic = 'terapis'
    const todayAppointments = await Reservasi.find({
      tanggalReservasi: todayFormatted,
      tipe: 'NON_MEDIS',
      pic: 'terapis'
    })
    .populate('userId', 'nama email noHandphone') // Populate user data
    .sort({ jamReservasi: 1 }); // Sort by time

    res.json({
      success: true,
      data: todayAppointments
    });

  } catch (err) {
    console.error('Error getting today non-medis appointments:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil appointment non-medis hari ini',
      error: err.message 
    });
  }
});

// Get chat messages
app.get('/api/chat/:reservationId', authenticateUser, async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    // Implementasi untuk mengambil pesan chat dari database
    const messages = await Chat.find({ reservationId }).sort({ createdAt: 1 });
    
    res.json({
      success: true,
      messages
    });
  } catch (err) {
    console.error('Error getting chat messages:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil pesan',
      error: err.message 
    });
  }
});

// Send message
app.post('/api/chat/:reservationId', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { text, isUser } = req.body;
    
    const newMessage = await Chat.create({
      reservationId,
      text,
      image: req.file ? `/uploads/chat/${req.file.filename}` : null,
      isUser: isUser === 'true',
      createdAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengirim pesan',
      error: err.message 
    });
  }
});

// ADD ARTIKEL
app.post('/api/artikel', authenticateUser, adminAuth, upload.single('gambar'), async (req, res) => {
  try {
    const { judul, sumber, isi } = req.body;
    
    if (!judul || !sumber || !isi) {
      return res.status(400).json({ 
        success: false,
        message: 'Semua field harus diisi' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'File gambar harus diupload' 
      });
    }

    const newArtikel = await Artikel.create({
      judul,
      gambar: `/uploads/${req.file.filename}`,
      sumber,
      isi
    });

    res.status(201).json({
      success: true,
      message: 'Artikel berhasil ditambahkan',
      data: newArtikel
    });
  } catch (err) {
    console.error('Error creating article:', err);
    
    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false,
          message: 'Ukuran file terlalu besar. Maksimal 5MB' 
        });
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat artikel',
      error: err.message 
    });
  }
}, (error, req, res, next) => {
  // Error handling middleware untuk multer
  if (error) {
    console.error('Multer error:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
});

// ALL ARTIKEL (FROM TERBARU)
app.get('/api/artikel', authenticateUser, async (req, res) => {
  try {
    const articles = await Artikel.find()
      .sort({ createdAt: -1 }); // Urutkan dari terbaru

    res.json({
      success: true,
      data: articles
    });
  } catch (err) {
    console.error('Error getting articles:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil artikel',
      error: err.message 
    });
  }
});

// ARTIKEL BY ID
app.get('/api/artikel/:id', authenticateUser, async (req, res) => {
  try {
    const article = await Artikel.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ 
        success: false,
        message: 'Artikel tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (err) {
    console.error('Error getting article:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil artikel',
      error: err.message 
    });
  }
});

// UPDATE ARTICLE
app.put('/api/artikel/:id', authenticateUser, adminAuth, upload.single('gambar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, sumber, isi } = req.body;
    
    console.log('Update request - File:', req.file);
    console.log('Update request - Body:', req.body);

    const updateData = {
      judul,
      sumber,
      isi,
      updatedAt: new Date()
    };

    // Jika ada file gambar baru, update path gambar
    if (req.file) {
      console.log('New file uploaded:', req.file.filename);
      updateData.gambar = `/uploads/${req.file.filename}`;
      
      // Hapus gambar lama jika ada
      try {
        const oldArticle = await Artikel.findById(id);
        if (oldArticle && oldArticle.gambar && oldArticle.gambar !== updateData.gambar) {
          const oldImagePath = path.join(__dirname, oldArticle.gambar);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Deleted old image:', oldArticle.gambar);
          }
        }
      } catch (deleteError) {
        console.log('Error deleting old image (non-fatal):', deleteError);
      }
    } else {
      console.log('No new file uploaded, keeping existing image');
    }

    const updatedArtikel = await Artikel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedArtikel) {
      return res.status(404).json({
        success: false,
        message: 'Artikel tidak ditemukan'
      });
    }

    console.log('Article updated successfully:', updatedArtikel._id);
    
    res.json({
      success: true,
      message: 'Artikel berhasil diperbarui',
      data: updatedArtikel
    });
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui artikel',
      error: err.message
    });
  }
});

// DELETE ARTICLE
app.delete('/api/artikel/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting article:', id);

    // Cari artikel dulu untuk mendapatkan info gambar
    const article = await Artikel.findById(id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Artikel tidak ditemukan'
      });
    }

    // Hapus file gambar jika ada
    if (article.gambar) {
      const imagePath = path.join(__dirname, article.gambar);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Deleted image file:', article.gambar);
      }
    }

    // Hapus artikel dari database
    const deletedArtikel = await Artikel.findByIdAndDelete(id);

    if (!deletedArtikel) {
      return res.status(404).json({
        success: false,
        message: 'Artikel tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Artikel berhasil dihapus',
      data: deletedArtikel
    });

  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus artikel',
      error: err.message
    });
  }
});

// ADD TREATMENT
app.post('/api/treatment', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { judul, pic, isi } = req.body;
    
    if (!judul || !pic || !isi) {
      return res.status(400).json({ 
        success: false,
        message: 'Semua field harus diisi' 
      });
    }

    const newTreatment = await Treatment.create({
      judul,
      pic,
      isi
    });

    res.status(201).json({
      success: true,
      message: 'Treatment berhasil ditambahkan',
      data: newTreatment
    });
  } catch (err) {
    console.error('Error creating treatment:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat treatment',
      error: err.message 
    });
  }
});

// ALL TREATMENT (FROM TERBARU)
app.get('/api/treatment', authenticateUser, async (req, res) => {
  try {
    const treatments = await Treatment.find()
      .sort({ createdAt: -1 }); // Urutkan dari terbaru

    res.json({
      success: true,
      data: treatments
    });
  } catch (err) {
    console.error('Error getting treatments:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil treatment',
      error: err.message 
    });
  }
});

// TREATMENT BY ID
app.get('/api/treatment/:id', authenticateUser, async (req, res) => {
  try {
    const treatment = await Treatment.findById(req.params.id);
    
    if (!treatment) {
      return res.status(404).json({ 
        success: false,
        message: 'Treatment tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: treatment
    });
  } catch (err) {
    console.error('Error getting treatment:', err);
    res.status(500).json({ 
      message: 'Gagal mengambil treatment',
      error: err.message 
    });
  }
});

// UPDATE TREATMENT
app.put('/api/treatment/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, pic, isi } = req.body;

    const updateData = {
      judul,
      pic,
      isi,
      updatedAt: new Date()
    };

    const updatedTreatment = await Treatment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTreatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment tidak ditemukan'
      });
    }

    console.log('Treatment updated successfully:', updatedTreatment._id);
    
    res.json({
      success: true,
      message: 'Treatment berhasil diperbarui',
      data: updatedTreatment
    });
  } catch (err) {
    console.error('Error updating treatment:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui treatment',
      error: err.message
    });
  }
});

// DELETE TREATMENT
app.delete('/api/treatment/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting article:', id);

    // Cari treatment dulu untuk mendapatkan info gambar
    const treatment = await Treatment.findById(id);
    
    if (!treatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment tidak ditemukan'
      });
    }

    // Hapus treatment dari database
    const deletedTreatment = await Treatment.findByIdAndDelete(id);

    if (!deletedTreatment) {
      return res.status(404).json({
        success: false,
        message: 'Treatment tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Treatment berhasil dihapus',
      data: deletedTreatment
    });

  } catch (err) {
    console.error('Error deleting treatment:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus treatment',
      error: err.message
    });
  }
});

// Konfigurasi multer khusus untuk banner
const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const bannerDir = path.join(__dirname, 'uploads/banners');
    if (!fs.existsSync(bannerDir)) {
      fs.mkdirSync(bannerDir, { recursive: true });
      console.log('Created banners directory:', bannerDir);
    }
    cb(null, bannerDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
  }
});

// Konfigurasi multer untuk multiple files
const bannerUpload = multer({ 
  storage: bannerStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Maksimal 5 file sekaligus
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/octet-stream' // Untuk file dari web
    ];
    
    // Dapatkan extension file
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (allowedMimes.includes(file.mimetype) || 
        (file.mimetype === 'application/octet-stream' && allowedExtensions.includes(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan. Type: ' + file.mimetype + ', Extension: ' + ext), false);
    }
  }
});

// POST upload multiple banners baru
app.post('/api/banner/upload-multiple', authenticateUser, adminAuth, bannerUpload.array('banners', 5), async (req, res) =>  {
  try {
    console.log('Upload multiple banners request:', req.files);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'File banner harus diupload' 
      });
    }

    const uploadedBanners = [];
    const activeBannersCount = await Banner.countDocuments({ isActive: true });

    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // Validasi extension file
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (!allowedExtensions.includes(ext)) {
        // Hapus file yang tidak valid
        const filePath = path.join(__dirname, file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        continue; // Skip file yang tidak valid
      }

      // Simpan informasi banner ke database
      const newBanner = await Banner.create({
        filename: file.filename,
        path: `/uploads/banners/${file.filename}`,
        originalName: file.originalname,
        uploadedBy: req.user.id,
        order: activeBannersCount + i
      });

      // Convert to plain object
      const bannerData = newBanner.toObject();
      bannerData._id = bannerData._id.toString();
      uploadedBanners.push(bannerData);
    }

    if (uploadedBanners.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Tidak ada file yang valid untuk diupload' 
      });
    }

    res.status(201).json({
      success: true,
      message: `Berhasil mengupload ${uploadedBanners.length} banner`,
      data: uploadedBanners
    });
  } catch (err) {
    console.error('Error uploading multiple banners:', err);
    
    // Hapus semua file yang sudah terupload jika ada error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengupload banner',
      error: err.message 
    });
  }
});

// GET semua banner
app.get('/api/banners', authenticateUser, async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ order: 1, uploadedAt: -1 })
      .populate('uploadedBy', 'nama email')
      .lean(); // Gunakan lean() untuk plain objects
    
    res.json({
      success: true,
      data: banners
    });
  } catch (err) {
    console.error('Error getting banners:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data banner',
      error: err.message 
    });
  }
});

// POST upload banner baru
app.post('/api/banner/upload', authenticateUser, adminAuth, bannerUpload.single('banner'), async (req, res) => {
  try {
    console.log('Upload banner request:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'File banner harus diupload' 
      });
    }

    // Validasi extension file
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      // Hapus file yang tidak valid
      const filePath = path.join(__dirname, req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.' 
      });
    }

    // Cek jumlah banner aktif
    const activeBannersCount = await Banner.countDocuments({ isActive: true });
    
    // Simpan informasi banner ke database
    const newBanner = await Banner.create({
      filename: req.file.filename,
      path: `/uploads/banners/${req.file.filename}`,
      originalName: req.file.originalname,
      uploadedBy: req.user.id,
      order: activeBannersCount // Set order ke jumlah banner aktif
    });

    // Convert to plain object
    const bannerData = newBanner.toObject();
    bannerData._id = bannerData._id.toString();

    res.status(201).json({
      success: true,
      message: 'Banner berhasil diupload',
      data: bannerData
    });

  } catch (err) {
    console.error('Error uploading banner:', err);
    
    // Hapus file yang sudah terupload jika ada error
    if (req.file) {
      const filePath = path.join(__dirname, req.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengupload banner',
      error: err.message 
    });
  }
});

// PUT update status banner
app.put('/api/banner/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, order } = req.body;
    
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;
    
    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('uploadedBy', 'nama email').lean(); // Gunakan lean() di sini juga

    if (!updatedBanner) {
      return res.status(404).json({
        success: false,
        message: 'Banner tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      message: 'Banner berhasil diperbarui',
      data: updatedBanner
    });
  } catch (err) {
    console.error('Error updating banner:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memperbarui banner',
      error: err.message 
    });
  }
});

// DELETE banner
app.delete('/api/banner/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner tidak ditemukan'
      });
    }
    
    // Hapus file dari sistem
    const imagePath = path.join(__dirname, banner.path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log('Deleted banner file:', imagePath);
    }
    
    // Hapus dari database
    await Banner.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Banner berhasil dihapus'
    });
  } catch (err) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus banner',
      error: err.message 
    });
  }
});

// GET semua dokter
app.get('/api/dokter', authenticateUser, async (req, res) => {
  try {
    const dokter = await Dokter.find().sort({ nama: 1 });
    
    res.json({
      success: true,
      data: dokter
    });
  } catch (err) {
    console.error('Error getting doctors:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data dokter',
      error: err.message 
    });
  }
});

// POST tambah dokter baru
app.post('/api/dokter', authenticateUser, adminAuth, upload.single('foto'), async (req, res) => {
  try {
    const { nama, spesialis, jadwal } = req.body;
    
    if (!nama || !spesialis) {
      return res.status(400).json({ 
        success: false,
        message: 'Nama dan spesialis harus diisi' 
      });
    }

    let fotoPath = null;
    if (req.file) {
      fotoPath = `/uploads/${req.file.filename}`;
    }

    // Parse jadwal jika ada
    let jadwalPraktik = [];
    if (jadwal) {
      try {
        jadwalPraktik = JSON.parse(jadwal);
      } catch (e) {
        console.error('Error parsing jadwal:', e);
      }
    }

    const newDokter = await Dokter.create({
      foto: fotoPath,
      nama,
      spesialis,
      jadwalPraktik
    });

    res.status(201).json({
      success: true,
      message: 'Dokter berhasil ditambahkan',
      data: newDokter
    });
  } catch (err) {
    console.error('Error creating doctor:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menambahkan dokter',
      error: err.message 
    });
  }
});

// PUT update dokter
app.put('/api/dokter/:id', authenticateUser, adminAuth, upload.single('foto'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, spesialis, jadwal } = req.body;

    const updateData = {
      nama,
      spesialis,
      updatedAt: new Date()
    };

    // Jika ada file gambar baru, update path gambar
    if (req.file) {
      updateData.foto = `/uploads/${req.file.filename}`;
      
      // Hapus gambar lama jika ada
      try {
        const oldDokter = await Dokter.findById(id);
        if (oldDokter && oldDokter.foto && oldDokter.foto !== updateData.foto) {
          const oldImagePath = path.join(__dirname, oldDokter.foto);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      } catch (deleteError) {
        console.log('Error deleting old image:', deleteError);
      }
    }

    // Parse jadwal jika ada
    if (jadwal) {
      try {
        updateData.jadwalPraktik = JSON.parse(jadwal);
      } catch (e) {
        console.error('Error parsing jadwal:', e);
      }
    }

    const updatedDokter = await Dokter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedDokter) {
      return res.status(404).json({
        success: false,
        message: 'Dokter tidak ditemukan'
      });
    }

    res.json({
      success: true,
      message: 'Dokter berhasil diperbarui',
      data: updatedDokter
    });
  } catch (err) {
    console.error('Error updating doctor:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui dokter',
      error: err.message
    });
  }
});

// DELETE dokter
app.delete('/api/dokter/:id', authenticateUser, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const dokter = await Dokter.findById(id);
    if (!dokter) {
      return res.status(404).json({
        success: false,
        message: 'Dokter tidak ditemukan'
      });
    }

    // Hapus file gambar jika ada
    if (dokter.foto) {
      const imagePath = path.join(__dirname, dokter.foto);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Dokter.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Dokter berhasil dihapus'
    });
  } catch (err) {
    console.error('Error deleting doctor:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal menghapus dokter',
      error: err.message 
    });
  }
});

// ENDPOINT UNTUK XENDIT CALLBACK (WEBHOOK) - DIPERBAIKI
app.post('/api/xendit-callback', express.json({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('Xendit callback received:', req.body);

    const { id, status, external_id } = req.body;

    // Extract reservation ID dari external_id
    const reservationId = external_id.split('-')[1];

    if (status === 'PAID') {
      await Reservasi.findByIdAndUpdate(reservationId, {
        paymentStatus: 'paid',
        paidAt: new Date()
      });
      console.log(`Payment for reservation ${reservationId} marked as PAID`);
    } 
    else if (status === 'EXPIRED') {
      await Reservasi.findByIdAndUpdate(reservationId, {
        paymentStatus: 'expired'
      });
      console.log(`Payment for reservation ${reservationId} EXPIRED`);
    }
    else if (status === 'FAILED') {
      await Reservasi.findByIdAndUpdate(reservationId, {
        paymentStatus: 'failed'
      });
      console.log(`Payment for reservation ${reservationId} FAILED`);
    }

    res.status(200).json({ received: true });

  } catch (err) {
    console.error('Error handling Xendit callback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const axios = require('axios');
// Endpoint untuk membuat pembayaran (sandbox mode)
app.post('/api/create-payment', authenticateUser, async (req, res) => {
  try {
    const { reservationId, amount, paymentMethod, customerName, customerEmail, phoneNumber } = req.body;

    console.log('Creating SANDBOX payment for:', { reservationId, amount, paymentMethod });

    // Validasi payment method
    const validMethods = ['SHOPEEPAY', 'GRABPAY', 'QR_CODE'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak valid'
      });
    }

    // Generate data dummy untuk sandbox
    const sandboxData = generateSandboxPaymentData(reservationId, amount, paymentMethod);
    
    // Simpan ke database
    await Reservasi.findByIdAndUpdate(reservationId, {
      paymentStatus: 'pending',
      paymentMethod: paymentMethod,
      amount: amount,
      xenditPaymentId: sandboxData.paymentId,
      paymentUrl: sandboxData.paymentUrl,
      virtualAccount: sandboxData.virtualAccount,
      qrCodeUrl: sandboxData.qrCodeUrl,
      expiryDate: sandboxData.expiryDate,
      isSandbox: true
    });

    res.json({
      success: true,
      message: 'Pembayaran sandbox berhasil dibuat',
      data: sandboxData
    });

  } catch (err) {
    console.error('Sandbox payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pembayaran sandbox',
      error: err.message
    });
  }
});

// Fungsi untuk generate data sandbox
function generateSandboxPaymentData(reservationId, amount, paymentMethod) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 8).toUpperCase();
  
  let paymentData = {
    paymentId: `sandbox_${timestamp}_${randomSuffix}`,
    paymentUrl: `https://sandbox.xendit.co/invoices/sandbox_${timestamp}`,
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    amount: amount,
    paymentMethod: paymentMethod,
    isSandbox: true,
    status: 'PENDING'
  };

  // Tambahkan data spesifik berdasarkan metode pembayaran
  switch (paymentMethod) {
    case 'SHOPEEPAY':
      paymentData.virtualAccount = `1234567890${timestamp.toString().slice(-6)}`;
      paymentData.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SHOPEEPAY${timestamp}`;
      break;
    case 'GRABPAY':
      paymentData.virtualAccount = `9876543210${timestamp.toString().slice(-6)}`;
      paymentData.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GRABPAY${timestamp}`;
      break;
    case 'QR_CODE':
      paymentData.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=QRCODE${timestamp}`;
      paymentData.virtualAccount = null;
      break;
  }

  return paymentData;
}

// Di endpoint simulate-payment, update juga status reservasi
app.post('/api/simulate-payment', authenticateUser, async (req, res) => {
  try {
    const { reservationId, status = 'paid' } = req.body;

    const updateData = {
      paymentStatus: status,
      isSandbox: true
    };

    if (status === 'paid') {
      updateData.paidAt = new Date();
      updateData.status = 'terkonfirmasi'; // Update status reservasi juga
    }

    await Reservasi.findByIdAndUpdate(reservationId, updateData);

    res.json({
      success: true,
      message: `Pembayaran sandbox diubah menjadi: ${status.toUpperCase()}`,
      status: status
    });

  } catch (err) {
    console.error('Simulate payment error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mensimulasi pembayaran'
    });
  }
});


// Endpoint untuk mendapatkan status pembayaran
app.get('/api/payment-status/:reservationId', authenticateUser, async (req, res) => {
  try {
    const { reservationId } = req.params;

    const reservation = await Reservasi.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservasi tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        status: reservation.paymentStatus,
        amount: reservation.amount,
        paidAt: reservation.paidAt,
        paymentMethod: reservation.paymentMethod,
        virtualAccount: reservation.virtualAccount,
        qrCodeUrl: reservation.qrCodeUrl,
        expiryDate: reservation.expiryDate,
        isSandbox: reservation.isSandbox
      }
    });

  } catch (err) {
    console.error('Payment status error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan status pembayaran'
    });
  }
});

// const admin = require('firebase-admin');

// // Inisialisasi Firebase Admin
// const serviceAccount = require('./path-to-service-account-key.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// // Model untuk menyimpan notifikasi
// const Notification = require('./models/Notification');

// // UPDATE FCM TOKEN USER
// app.post('/api/user/fcm-token', authenticateUser, async (req, res) => {
//   try {
//     const { fcmToken } = req.body;
//     const userId = req.user.id;

//     await User.findByIdAndUpdate(userId, {
//       fcmToken: fcmToken
//     });

//     res.json({
//       success: true,
//       message: 'FCM token updated successfully'
//     });
//   } catch (err) {
//     console.error('Error updating FCM token:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Gagal update FCM token',
//       error: err.message
//     });
//   }
// });

// // SEND NOTIFICATION (ADMIN)
// app.post('/api/admin/send-notification', authenticateUser, adminAuth, async (req, res) => {
//   try {
//     const { title, body, type } = req.body;
//     const adminId = req.user.id;

//     // Dapatkan semua FCM token user
//     const users = await User.find({ 
//       role: 'user',
//       fcmToken: { $exists: true, $ne: null }
//     });

//     const fcmTokens = users.map(user => user.fcmToken).filter(token => token);

//     if (fcmTokens.length === 0) {
//       return res.json({
//         success: true,
//         message: 'No users with FCM tokens found'
//       });
//     }

//     // Buat payload notifikasi
//     const message = {
//       notification: {
//         title: title,
//         body: body
//       },
//       data: {
//         type: type || 'general',
//         title: title,
//         body: body,
//         click_action: 'FLUTTER_NOTIFICATION_CLICK'
//       },
//       tokens: fcmTokens
//     };

//     // Kirim notifikasi ke multiple devices
//     const response = await admin.messaging().sendEachForMulticast(message);

//     // Simpan notifikasi ke database untuk setiap user
//     const notificationPromises = users.map(user => 
//       Notification.create({
//         userId: user._id,
//         title: title,
//         body: body,
//         type: type || 'general',
//         sentBy: adminId,
//         sentAt: new Date()
//       })
//     );

//     await Promise.all(notificationPromises);

//     res.json({
//       success: true,
//       message: `Notification sent to ${response.successCount} users`,
//       data: {
//         successCount: response.successCount,
//         failureCount: response.failureCount
//       }
//     });

//   } catch (err) {
//     console.error('Error sending notification:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Gagal mengirim notifikasi',
//       error: err.message
//     });
//   }
// });

// // GET USER NOTIFICATIONS
// app.get('/api/notifications', authenticateUser, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;

//     const notifications = await Notification.find({ userId })
//       .sort({ sentAt: -1 })
//       .limit(limit)
//       .skip((page - 1) * limit)
//       .populate('sentBy', 'nama');

//     const total = await Notification.countDocuments({ userId });

//     res.json({
//       success: true,
//       data: notifications,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Error getting notifications:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Gagal mengambil notifikasi',
//       error: err.message
//     });
//   }
// });

// // MARK NOTIFICATION AS READ
// app.put('/api/notifications/:id/read', authenticateUser, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const notification = await Notification.findOneAndUpdate(
//       { _id: id, userId },
//       { isRead: true, readAt: new Date() },
//       { new: true }
//     );

//     if (!notification) {
//       return res.status(404).json({
//         success: false,
//         message: 'Notifikasi tidak ditemukan'
//       });
//     }

//     res.json({
//       success: true,
//       data: notification
//     });
//   } catch (err) {
//     console.error('Error marking notification as read:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Gagal menandai notifikasi sebagai dibaca',
//       error: err.message
//     });
//   }
// });


app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on ${port}`);
    console.log('Xendit configured with key:', process.env.XENDIT_SECRET_KEY ? 'Yes' : 'No');
})