import 'dotenv/config';
import express from'express';
import mongoose from'mongoose';
import jwt from'jsonwebtoken';
import bcrypt from'bcrypt';
import cors from'cors';
import validator from'validator';
import multer from'multer';
import path from'path';
import fs from'fs';
import {Xendit} from'xendit-node';
import http from"http";
import { Server } from"socket.io";
const app = express();
const  server = http.createServer(app);
import admin from'firebase-admin';

const serviceAccount = JSON.parse(
  fs.readFileSync('./serviceAccountKey.json', 'utf-8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
})

import User from'./models/User.js';
import Qna from'./models/Qna.js';
import Skincare from'./models/Skincare.js';
import questions from'./data/questions.js';
import Reservasi from'./models/Reservasi.js';
import Treatment from'./models/Treatment.js';
import Artikel from'./models/Artikel.js';
import Banner from'./models/Banner.js';
import Dokter from'./models/Dokter.js';
import NotifAdmin from'./models/NotifAdmin.js';
import NotifTerapis from'./models/NotifTerapis.js';
import Chat from'./models/ChatMessage.js';
// import req from'express/lib/request';
import nodemailer from'nodemailer';
import emailjs from "@emailjs/browser";
import {Resend} from'resend';
import crypto from'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// SET UP SOCKET ADMIN ROOM
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // NOTIFICATION

  // UNTUK ADMIN
  socket.on("join_admin_room", () => {
    socket.join("admin_room");
    console.log("Admin joined room")
  })

  // UNTUK DOKTER
  socket.on("join_doctor_room", (doctorName) => {

    const roomName = doctorName.trim().toLowerCase();
    socket.join(roomName);

    console.log("Doctor joined room", roomName)
  })

  // UNTUK TERAPIS
  socket.on("join_terapis_room", () => {
    socket.join("terapis_room");
    console.log("Terapis joined room")
  })

  // CHATTING

  // JOIN ROOM BERDASARKAN RESERVATION
  socket.on("join_room", (reservationId) => {
    socket.join(reservationId);
    console.log("Join chat room:", reservationId);
  });

  // KIRIM TEXT MESSAGE
  socket.on("send_message", (data) => {
    console.log("MESSAGE:", data)
    io.to(data.reservationId).emit("receive_message", data);
  });

  // KIRIM IMAGE
  socket.on("send_image", (data) => {
    io.to(data.reservationId).emit("receive_image", data);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.io)
  })
})

function sendSocketNotification(data) {
  io.emit("new_notification", data);
}

async function sendFirebaseNotification(judul, isi) {
  await admin.messaging().send({
    topic: "all_users",
    notification: {
      title: judul,
      body: isi
    }
  })
}

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
app.set("io", io)

mongoose.connect(process.env.MONGODB_URI, {
  // dbName: "skinA",
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log(process.env.BASE_URL, 'MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err))

// KONFIGURASI XENDIT
const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});
const {Invoice} = xendit;

// SEND VERIFIKASI EMAIL
// const sendVerificationEmail = async (email, token) => {
//   const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     secure: true,
//     port: 465,
//     // service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS
//     }
//   });

//   const link = `${process.env.BASE_URL}/api/verify-email/${token}`;

//   await transporter.sendMail({
//     from: `"APS KINA" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: 'Verifikasi Email',
//     html: `
//       <h2>Verifikasi Email Anda</h2>
//       <p>Klik link dibawah untuk verifikasi:</p>
//       <a href="${link}">${link}</a>
//     `
//   });
// };

// const resend = new Resend(process.env.RESEND_API_KEY);

// const sendVerificationEmail = async (email, token) => {
//   const link = `${process.env.BASE_URL}/api/verify-email/${token}`;

//   const data = await resend.emails.send({
//     from: "onboarding@resend.dev",
//     to: email,
//     subject: 'Verifikasi Email',
//     html: `
//       <h2>Verifikasi Email Anda</h2>
//       <p>Klik link dibawah untuk verifikasi:</p>
//       <a href="${link}">${link}</a>
//     `
//   });
//   console.log("RESEND RESPONSE:", data)
// };

import SibApiV3Sdk from 'sib-api-v3-sdk';

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendVerificationEmail = async (email, token) => {
  const link = `${process.env.BASE_URL}/api/verify-email/${token}`;

  try {
    await apiInstance.sendTransacEmail({
      sender: { 
        email: "gabypaulina90@gmail.com", // 🔥 email kamu
        name: "APSKINA"
      },
      to: [{ email: email }],
      subject: "Verifikasi Email",
      htmlContent: `
        <h2>Verifikasi Email Anda</h2>
        <p>Klik link dibawah ini:</p>
        <a href="${link}">${link}</a>
      `
    });

    console.log("EMAIL BERHASIL DIKIRIM");
  } catch (err) {
    console.error("ERROR BREVO:", err);
  }
};

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

const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const chatDir = path.join(__dirname, 'uploads/chat');

    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }

    cb(null, chatDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'chat-' + uniqueSuffix + ext);
  }
});

const uploadChat = multer({ storage: chatStorage });

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

        if (user.role === 'user' && !user.isVerified) {
          return res.status(403).json({
            message: 'Email belum diverifikasi. Silakan cek email Anda'
          });
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
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // const user = await User.create({
        //     nama,
        //     email,
        //     tanggalLahir,
        //     noHandphone,
        //     alamat,
        //     password: hashedPassword,
        //     role: 'user', // Default role,
        //     verificationToken,
        // });

        try{
          await sendVerificationEmail(email, verificationToken)          
        }catch (err) {
          console.log('Email gagal dikirim:', err.message)
        }

        const user = await User.create({
            nama,
            email,
            tanggalLahir,
            noHandphone,
            alamat,
            password: hashedPassword,
            role: 'user', // Default role,
            verificationToken,
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

app.post('/api/routine-completion', authenticateUser, async (req, res) => {
  try{
    const {percentage, date} = req.body;

    const userId = req.user.id;
    const parsedDate = new Date(date);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan"});
    }

    const existing = user.laporanRutinitas.find((item) => {
      if  (!item.tanggal) return false;
      return (
        item.tanggal.getFullYear() === parsedDate.getFullYear() &&
        item.tanggal.getMonth() === parsedDate.getMonth() &&
        item.tanggal.getDate() === parsedDate.getDate()
      );
    });

    if(existing) {
      existing.persentase = percentage;
      console.log("UPDATE DATA");
    }else{
      console.log("INSERT DATA")
      user.laporanRutinitas.push({
        tanggal: parsedDate,
        persentase: percentage
      });
    }

    await user.save();
    res.json({ success: true })
  }catch(err){
    console.error(err);
    res.status(500).json({ error: err.message })
  }
})

// VERIFIKASI EMAIL
app.get('/api/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token
    });

    if (!user) {
      return res.status(400).send('Token tidak valid');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send('Email berhasil diverifikasi. Silakan login.');
  } catch (err) {
    res.status(500).send('Terjadi kesalahan');
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

app.get('/api/qna/by-date', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const {date} = req.query

    if(!date) {
      return res.status(400).json({
        success: true,
        message: 'Tanggal wajib diisi'
      })
    }

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23,59,59,999);

    const qna = await Qna.findOne({
      userId,
      completedAt: {
        $gte: start,
        $lte: end
      }
    });

    if (!qna) {
      return res.json({
        success: true,
        data: null
      })
    }

    res.json({
      success: true,
      data : {
        completedAt: qna.completedAt,
        responses: qna.responses
      }
    });
  }catch (err){
    res.status(500).json({
      success: false,
      message: 'Erorr ambil QNA',
      error: err.message
    })
  }
})

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

app.get('/api/user', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).lean();

    const today = new Date();
    today.setHours(0,0,0,0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // cari laporan hari ini saja
    const todayReport = user.laporanRutinitas.find(l => {
      const tgl = new Date(l.tanggal);
      return tgl >= today && tgl < tomorrow;
    });

    const persentaseHariIni = todayReport ? todayReport.persentase : 0;

    console.log(persentaseHariIni)
    res.json({
      ...user,
      rutinitasHarian: persentaseHariIni
    });

  } catch (err) {
    res.status(500).json({
      message: "Gagal ambil user",
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
      amount,
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
          productType: product.type,
          productIngredients: product.ingredients
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

    // CEK DOUBLE BOOKING
    const existing = await Reservasi.findOne({
      tanggalReservasi,
      jamReservasi: waktuReservasi,
      pic: picValue,
      tipe
    });

    if (existing) {
      return res.status(400).json({
        message: 'Jam sudah dibooking oleh pasien lain'
      });
    }

    const paymentStatusValue = tipe === 'KONSULTASI' ? 'paid' : 'pending'

    const lastReservasi = await Reservasi.findOne({
      userId: userId,
      pic: picValue.toLowerCase().trim()
    }).sort({ createdAt: 1 })

    let pertemuanValue = 1;
    if(lastReservasi) {
      pertemuanValue = (lastReservasi.pertemuan || 0) + 1;
    }

    // Create new reservation
    const newReservasi = await Reservasi.create({
      userId,
      id: customId,
      tipe,
      treatment: tipe === 'NON_MEDIS' ? treatment : null,
      pic: picValue.toLowerCase().trim(), // Gunakan nilai yang sudah ditentukan
      jamReservasi: waktuReservasi,
      tanggalReservasi: tanggalReservasi,
      namaPasien: user.nama,
      status: 'menunggu',
      pertemuan: pertemuanValue,
      laporanRutinitas: user.rutinitasHarian ? `Rutinitas harian: ${user.rutinitasHarian}%` : null,
      produkSkincare: produkSkincare,
      tipeKulit: null,
      hasilTreatment: null,
      diagnosis: null,
      note: "",
      resep: [],
      amount: amount,
      paymentStatus: paymentStatusValue,
      paidAt: tipe === 'KONSULTASI' ? new Date() : null
    });

    // Add reservation to user's reservations array
    user.reservasi.push(newReservasi._id);
    await user.save();

    // PUSH NOTIF KE ADMIN
    const notif = await NotifAdmin.create({
      title: "Reservasi Baru",
      message: `Reservasi baru untuk tanggal ${newReservasi.tanggalReservasi} jam ${newReservasi.jamReservasi}`,
      type: "RESERVATION",
      createdAt: new Date(),
    });
    await notif.save();

    const io = req.app.get("io");
      io.to("admin_room").emit("new_notification", {
      message: "Reservasi baru masuk",
      data: notif,
    });
    
    console.log("Emit notif ke admin ...")

    // PUSH NOTIF KE DOKTER
    const doctorRoom = picValue.trim().toLowerCase();

    if(tipe === 'MEDIS' || tipe === 'KONSULTASI') {
      const notifDokter = await NotifDokter.create({
        doctorRoom: picValue.trim().toLowerCase(),
        title: "Reservasi Baru",
        message: `Reservasi baru atas nama ${user.nama} pada ${newReservasi.tanggalReservasi} jam ${newReservasi.jamReservasi}`,
        type: "RESERVATION",
        createdAt: new Date(),
      })
      await notifDokter.save();

      const io = req.app.get("io");
      io.to(doctorRoom).emit("new_notification_dokter", {
        message: "Reservasi baru untuk Anda",
        data: notifDokter,
      });
      
      console.log("Emit notif ke dokter ...")
    }   
    
    // PUSH NOTIF KE TERAPIS
    if(tipe === 'NON_MEDIS') {
      const notifTer = await NotifTerapis.create({
        title: "Reservasi Baru",
        message: `Reservasi baru atas nama ${user.nama} pada ${newReservasi.tanggalReservasi} jam ${newReservasi.jamReservasi}`,
        type: "RESERVATION",
        createdAt: new Date(),
      })
      await notifTer.save();

      const io = req.app.get("io");
      io.to("terapis_room").emit("new_notification", {
        message: "Reservasi baru untuk Anda",
        data: notifTer,
      });
      
      console.log("Emit notif ke terapis ...")
    } 

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

// TAMBAH RESEP
app.post('/api/reservasi/:id/resep', async (req, res) => {
  try {
    const { namaObat, dosis } = req.body;

    if (!namaObat || !dosis) {
      return res.status(400).json({
        message: 'Nama obat dan dosis wajib diisi'
      });
    }

    const reservasi = await Reservasi.findById(req.params.id);

    if (!reservasi) {
      return res.status(404).json({
        message: 'Reservasi tidak ditemukan'
      });
    }

    // 🔥 push ke array resep
    reservasi.resep.push({
      namaObat,
      dosis
    });

    reservasi.updatedAt = new Date();

    await reservasi.save();

    req.io.to(reservasi._id.toString()).emit("receive_message", {
      reservationId: reservasi._id,
      type: "resep",
      senderType: "doctor",
      timestamp: new Date().toString(),
      resepId: reservasi._id.toString(),
      resep: [
        {
          namaObat,
          dosis
        }
      ]
    })

    res.status(200).json({
      message: 'Resep berhasil ditambahkan',
      data: reservasi.resep
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Gagal menambahkan resep'
    });
  }
});

// TAMBAH CATATAN DOKTER
app.post('/api/reservasi/:id/catatan', async (req, res) => {
  try {
    const { diagnosis, catatanDokter } = req.body;

    const reservasi = await Reservasi.findById(req.params.id);

    if (!reservasi) {
      return res.status(404).json({
        message: 'Reservasi tidak ditemukan'
      });
    }

    // 🔥 update field
    if (diagnosis) reservasi.diagnosis = diagnosis;
    if (catatanDokter) reservasi.note = catatanDokter;

    reservasi.updatedAt = new Date();

    await reservasi.save();

    req.io.to(reservasi._id.toString()).emit("receive_message", {
      reservationId: reservasi._id,
      type: "catatan",
      senderType: "doctor",
      timestamp: new Date().toString(),
      catatanId: reservasi._id.toString(),
      data: {
        diagnosis: diagnosis,
        note: catatanDokter
      }
    })

    res.status(200).json({
      message: 'Catatan dokter berhasil disimpan',
      data: {
        diagnosis: reservasi.diagnosis,
        note: reservasi.catatanDokter
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Gagal menyimpan catatan dokter'
    });
  }
});

// GET waktu tersedia berdasarkan dokter dan tanggal
app.get('/api/reservasi/waktuTersedia', authenticateUser, async (req, res) => {
  try {
    const { tanggalReservasi, doctorId } = req.query;

    if (!tanggalReservasi || !doctorId) {
      return res.status(400).json({ message: 'Tanggal dan doctorId diperlukan' });
    }

    // Validasi format tanggal
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(tanggalReservasi)) {
      return res.status(400).json({ message: 'Format tanggal harus dd/mm/yyyy' });
    }

    const dokter = await Dokter.findById(doctorId);
    if (!dokter) {
      return res.status(404).json({ message: 'Dokter tidak ditemukan' });
    }

    // Tentukan hari dari tanggal
    const [day, month, year] = tanggalReservasi.split('/');
    const dateObj = new Date(`${year}-${month}-${day}`);
    const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const dayName = dayNames[dateObj.getDay()];

    // Cari jadwal dokter sesuai hari
    const jadwalHari = dokter.jadwalPraktik.find(j => j.hari === dayName);

    if (!jadwalHari) {
      return res.json({ success: true, data: [] });
    }

    let availableTimeSlots = jadwalHari.jamPraktik.map(jam =>
      `${jam.jamMulai} - ${jam.jamAkhir}`
    );

    // Ambil jam yang sudah dibooking
    const existingReservations = await Reservasi.find({
      tanggalReservasi,
      pic: doctorId
    });

    const bookedTimeSlots = existingReservations.map(r => r.jamReservasi);

    // Hapus jam yang sudah dibooking
    availableTimeSlots = availableTimeSlots.filter(
      time => !bookedTimeSlots.includes(time)
    );

    // Jika tanggal hari ini → filter jam yang sudah lewat
    const today = new Date();
    const isToday =
      today.getDate() == parseInt(day) &&
      today.getMonth() + 1 == parseInt(month) &&
      today.getFullYear() == parseInt(year);

    if (isToday) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      availableTimeSlots = availableTimeSlots.filter(time => {
        const startTime = time.split(' - ')[0];
        const [h, m] = startTime.split(':').map(Number);

        if (h > currentHour) return true;
        if (h === currentHour && m > currentMinute) return true;
        return false;
      });
    }

    res.json({
      success: true,
      data: availableTimeSlots
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil waktu tersedia' });
  }
});

// GET RESERVASI TERDEKAT USER
app.get('/api/reservasi/nearest', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const reservations = await Reservasi.find({ userId });

    if (!reservations.length) {
      return res.json({ success: true, data: null });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // ⭐ PENTING BANGET

    // Convert tanggalReservasi ke Date object
    const mapped = reservations.map(r => {
      const [day, month, year] = r.tanggalReservasi.split('/');
      const dateObj = new Date(`${year}-${month}-${day}`);

      return {
        ...r.toObject(),
        dateObj
      };
    });

    // Filter tanggal >= hari ini
    const futureReservations = mapped.filter(r => r.dateObj >= today);

    if (!futureReservations.length) {
      return res.json({ success: true, data: null });
    }

    // Sort paling dekat
    futureReservations.sort((a, b) => a.dateObj - b.dateObj);

    const nearest = futureReservations[0];

    // Cari info dokter kalau ada
    let doctorInfo = null;

    if (nearest.pic) {
      const dokter = await Dokter.findOne({ 
        nama: { $regex: `^${nearest.pic}$`, $options: 'i'}
      });

      if (dokter) {
        doctorInfo = {
          nama: dokter.nama,
          foto: dokter.foto || 'null',
          spesialis: dokter.spesialis
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...nearest,
        doctorInfo
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal ambil reservasi terdekat'
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

const calculateAverageRoutine = (user, reservationCreatedAt) => {
  if (!user?.laporanRutinitas || user.laporanRutinitas.length === 0) return 0;

  const startDate = new Date(user.qnaCompletedAt); // tanggal register
  const endDate = new Date(reservationCreatedAt); // tanggal booking dibuat

  const filtered = user.laporanRutinitas.filter(item => {
    const tgl = new Date(item.tanggal);
    return tgl >= startDate && tgl <= endDate;
  });

  if (filtered.length === 0) return 0;

  const total = filtered.reduce((sum, item) => sum + item.persentase, 0);

  return Math.round(total / filtered.length);
};

// GET RESERVASI UNTUK DOKTER LOGIN
app.get("/api/dokter/reservasi", authenticateUser, async (req, res) => {
  console.log("API Dokter reservasi terpanggil")
  try {
    const user = await User.findById(req.user.id);
    if(!user){
      return res.status(404).json({message: 'Usser tidak ditemukan'});
    }
   
    const doctorName = user.nama.trim().toLowerCase();
    console.log("Dokter login: ", doctorName)

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayString = `${day}/${month}/${year}`;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // semua reservasi hari ini untuk dokter tersebut
    const todayReservations = await Reservasi.find({
      pic: doctorName,
      tanggalReservasi: todayString,
      tipe: { $in: ['MEDIS', 'KONSULTASI']}
    }).sort({ jamReservasi: 1 });
    console.log(todayReservations)

    // ambil 2 reservasi terbaru
    const latestTodayReservations = await Reservasi.find({
      pic: doctorName,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .sort({ createdAt: -1 })
    .limit(2);

    const allReservations = await Reservasi.find({
      pic: doctorName,
    }).sort({createdAt: -1})

    const latestTodayReservationsRaw = await Promise.all(
      latestTodayReservations.map(async (r) => {
        const qna = await Qna.findOne({userId: r.userId});
        const userData = await User.findById(r.userId);

        let age = null;
        if(userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m<0 || (m===0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        const avgRoutine = calculateAverageRoutine(userData, r.createdAt);

        return{
          ...r._doc,
          qna,
          age,
          laporanRutinitasAvg: avgRoutine
        };
      })
    )

    const todayReservationsRaw = await Promise.all(
      todayReservations.map(async (r) => {
        const qna = await Qna.findOne({userId: r.userId});
        const userData = await User.findOne(r.userId);

        let age = null;
        if(userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m<0 || (m===0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        const avgRoutine = calculateAverageRoutine(userData, r.createdAt);


        return{
          ...r._doc,
          qna,
          age,
          laporanRutinitasAvg: avgRoutine
        };
      })
    )
    
    console.log("All Reservations : ", allReservations)

    res.json({
      doctorName: doctorName,
      latestTodayReservations: latestTodayReservationsRaw,
      todayReservations: todayReservationsRaw,
      allReservations: allReservations
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error mengambil reservasi dokter" });
  }
});

// GET LAPORAN UNTUK DOKTER LOGIN
app.get("/api/dokter/laporan", authenticateUser, async (req, res) => {
  try{
    const user = await User.findById(req.user.id);
    if(!user){
      return res.status(404).json({message: 'Usser tidak ditemukan'});
    }
    const doctorName = user.nama.trim().toLowerCase();
    console.log("Dokter login: ", doctorName)

    const laporan = await Reservasi.find({
      pic: doctorName,
      status: 'selesai',
    }).sort({ createdAt: -1 });

    const laporanWithAge = await Promise.all(
      laporan.map(async (r) => {
        const userData = await User.findById(r.userId);

        let age = null;
        if (userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          ...r._doc,
          age
        };
      })
    );

    res.json({laporanWithAge})
  }catch (err){
    console.error(err);
    res.status(500).json({ message: "Error mengambil laporan" });
  }
})

// GET RESERVASI UNTUK TERAPIS
app.get("/api/terapis/reservasi", authenticateUser, async (req, res) => {
  try {
    const pic = "terapis";
    console.log("PIC ", pic)

    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayString = `${day}/${month}/${year}`;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // semua reservasi hari ini untuk dokter tersebut
    const todayReservations = await Reservasi.find({
      pic: pic,
      tanggalReservasi: todayString,
    }).sort({ jamReservasi: 1 });
    console.log(todayReservations)

    // ambil 2 reservasi terbaru
    const latestTodayReservations = await Reservasi.find({
      pic: pic,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
    .sort({ createdAt: -1 })
    .limit(2);

    const latestTodayReservationsRaw = await Promise.all(
      latestTodayReservations.map(async (r) => {
        const qna = await Qna.findOne({userId: r.userId});
        const userData = await User.findOne(r.userId);

        let age = null;
        if(userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m<0 || (m===0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return{
          ...r._doc,
          qna,
          age
        };
      })
    )

    const allReservations = await Reservasi.find({
      pic: 'terapis',
    }).sort({createdAt: -1})

    const todayReservationsRaw = await Promise.all(
      todayReservations.map(async (r) => {
        const qna = await Qna.findOne({userId: r.userId});
        const userData = await User.findOne(r.userId);

        let age = null;
        if(userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m<0 || (m===0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return{
          ...r._doc,
          qna,
          age
        };
      })
    )
    
    console.log(latestTodayReservations)

    res.json({
      pic: pic,
      latestTodayReservations: latestTodayReservationsRaw,
      todayReservations: todayReservationsRaw,
      allReservations: allReservations
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error mengambil reservasi terapis" });
  }
});

// GET LAPORAN UNTUK TERAPIS
app.get("/api/terapis/laporan", authenticateUser, async (req, res) => {
  try{
    const pic = "terapis";
    console.log("PIC ", pic)

    const laporan = await Reservasi.find({
      pic: pic,
      status: 'selesai',
    }).sort({ createdAt: -1 });

    const laporanWithAge = await Promise.all(
      laporan.map(async (r) => {
        const userData = await User.findById(r.userId);

        let age = null;
        if (userData?.tanggalLahir) {
          const today = new Date();
          const birthDate = new Date(userData.tanggalLahir);

          age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();

          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          ...r._doc,
          age
        };
      })
    );

    res.json({laporanWithAge})
  }catch (err){
    console.error(err);
    res.status(500).json({ message: "Error mengambil laporan" });
  }
})

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

// UPDATE STATUS RESERVASI DAN HASIL TREATMENT TERAPIS DAN MEDIS DOKTER
app.put('/api/reservasi/:id/status', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hasilTreatment, diagnosis, note, resep } = req.body;

    console.log("HASIL: ", req.body)

    const updateData = {
      status,
      ...(hasilTreatment && { hasilTreatment }),
      ...(diagnosis && { diagnosis }),
      ...(note && { note }),
      ...(resep && { resep }),
    };

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

// UPDATE STATUS RESERVASI KONSULTASI 
app.put('/api/reservasi/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log("=== UPDATE STATUS ===");
    console.log("ID:", id);
    console.log("STATUS DARI FLUTTER:", status);

    const updatedReservasi = await Reservasi.findByIdAndUpdate(
      id,
      {status: status},
      { new: true }
    );

    if (!updatedReservasi) {
      return res.status(404).json({
        message: 'Reservasi tidak ditemukan',
      });
    }

    io.to(id).emit("session_finished", {
      reservationId: id,
      status: status,
      by: 'user' | 'doctor'
    }),

    res.status(200).json({
      message: 'Status berhasil diupdate',
      data: updatedReservasi,
    });

  } catch (error) {
    console.error("ERROR UPDATE STATUS:", error);
    res.status(500).json({
      message: 'Terjadi kesalahan server',
    });
  }
});

// Helper function untuk menghitung umur dari tanggal lahir
function calculateAge(tanggalLahir) {
  const birthDate = new Date(tanggalLahir);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();

  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return `${age} tahun`;
}

// GET COMPLETED RESERVATIONS FOR PATIENT HISTORY - DIPERBAIKI
app.get('/api/reservasi/history', authenticateUser, async (req, res) => {
  try {
    console.log("🔥 MASUK ENDPOINT");

    const userId = req.user.id;
    console.log("USER ID:", userId);

    const completedReservations = await Reservasi.find({
      userId: userId, // ✅ FIX DI SINI
      status: 'selesai',
      paymentStatus: 'paid'
    })
    .sort({ tanggalReservasi: -1, jamReservasi: -1 })
    .populate('userId', 'tanggalLahir');

    const formattedData = await Promise.all(
      completedReservations.map(async (reservation) => {
        const dokter = await Dokter.findOne({ 
          nama: { $regex: new RegExp(`^${reservation.pic}$`, 'i')}
        });

        return{
          id: reservation._id.toString(),
          tanggalReservasi: reservation.tanggalReservasi,
          jamReservasi: reservation.jamReservasi,
          tipe: reservation.tipe,
          pic: reservation.pic,
          namaPasien: reservation.namaPasien,
          treatment: reservation.treatment,
          paymentStatus: reservation.paymentStatus,
          amount: reservation.amount,
          paidAt: reservation.paidAt,
          note: reservation.note,
          diagnosis: reservation.diagnosis,
          resep: reservation.resep,
          status: reservation.status,
          umur: calculateAge(reservation.userId?.tanggalLahir) || 'Tidak Ada Tanggal Lahir',
          fotoDokter: dokter?.foto || null,
          spesialis: dokter?.spesialis || null,
          pertemuan: reservation.pertemuan
        }
      })
    )
    // const formattedData = completedReservations.map(reservation => ({      
      // id: reservation._id.toString(),
      // tanggalReservasi: reservation.tanggalReservasi,
      // jamReservasi: reservation.jamReservasi,
      // tipe: reservation.tipe,
      // pic: reservation.pic,
      // namaPasien: reservation.namaPasien,
      // treatment: reservation.treatment,
      // paymentStatus: reservation.paymentStatus,
      // amount: reservation.amount,
      // paidAt: reservation.paidAt,
      // note: reservation.note,
      // diagnosis: reservation.diagnosis,
      // resep: reservation.resep,
      // status: reservation.status,
      // umur: calculateAge(reservation.userId?.tanggalLahir) || 'Tidak Ada Tanggal Lahir'
    // }));

    res.json({
      success: true,
      data: formattedData
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message
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
    
    res.json(messages);
  
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
app.post('/api/chat/text', authenticateUser, async (req, res) => {
  try {
    // const { reservationId } = req.params;
    const { reservationId, text, senderType, type } = req.body;
    console.log("BODY:", req.body)
    
    const newMessage = await Chat.create({
      reservationId,
      text,
      type: type || 'text',
      senderType,
      timestamp: new Date()
    });
    
    res.status(201).json(newMessage);

  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengirim pesan',
      error: err.message 
    });
  }
});

// system send message
app.post('/api/chat/system', async (req, res) => {
  try {
    const { reservationId, text, type, timestamp } = req.body;

    const message = await Chat.create({
      reservationId,
      text,
      senderType: 'doctor',
      type,
      timestamp: timestamp || new Date()
    });

    io.to(reservationId).emit('receive_message', message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// send image
app.post('/api/chat/upload/:reservationId', authenticateUser, uploadChat.single('image'), (req, res) => {
  try {
    console.log("FILE:", req.file);

    res.json({
      imageUrl: `/uploads/chat/${req.file.filename}`
    });
  } catch (err) {
    res.status(500).json({
      message: 'Gagal upload gambar',
      error: err.message
    });
  }
});

// SAVE GAMBAR CHAT
app.post('/api/chat/image', authenticateUser, async (req, res) => {
  try {
    const { reservationId, imageUrl, senderType } = req.body;

    const newMessage = await Chat.create({
      reservationId,
      image: imageUrl,
      senderType,
      timestamp: new Date()
    });

    res.status(201).json(newMessage);

  } catch (err) {
    console.error('Error saving image message:', err);
    res.status(500).json({
      message: 'Gagal menyimpan gambar',
      error: err.message
    });
  }
});

// UPDATE RESEP
app.put('/api/reservasi/:id/resep', async (req, res) => {
  try {
    const { resep } = req.body;

    const updated = await Reservasi.findByIdAndUpdate(
      req.params.id,
      {
        resep: resep,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Resep berhasil diupdate',
      data: updated
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/reservasi/:id', async (req, res) => {
  const reservasi = await Reservasi.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  io.to(req.params.id).emit("session_finished", {
    reservationId: req.params.id,
    by: req.body.updatedBy || 'user'
  });

  res.json(reservasi);
});

// UPDATE CATATAN
app.put('/api/reservasi/:id/catatan', async (req, res) => {
  try {
    const { diagnosis, note } = req.body;

    const updated = await Reservasi.findByIdAndUpdate(
      req.params.id,
      {
        diagnosis,
        note,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Catatan berhasil diupdate',
      data: updated
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
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

import axios from 'axios';
import NotifDokter from './models/NotifDokter.js';
import { title } from 'process';

// Endpoint untuk membuat pembayaran (sandbox mode)
app.post('/api/create-payment', authenticateUser, async (req, res) => {
  console.log('reached create-payment')
  try {
    const { amount, customerName, customerEmail, paymentMethod, reservationId } = req.body;

    console.log({amount, customerName, customerEmail });

    const response = await axios.post(
      'https://api.xendit.co/v2/invoices',
      {
        external_id: `invoice-${Date.now()}`,
        payer_email: customerEmail,
        description: 'Pembayaran Klinik A',
        amount: amount,
        currency: 'PHP',
        merchant_name: 'Klinik Skin A',
        available_banks: ['BCA', 'BRI', 'BNI', 'MANDIRI'],
        available_ewallets: ['SHOPEEPAY'],
        should_exclude_credit_card: true,
        should_exclude_qr_code: true,
        should_exclude_paylater: true,
      },
      {
        auth: {
          username: process.env.XENDIT_SECRET_KEY,
          password: '',
        }
      }
    )

    console.log('Xendit response:', response.data);

    if(!response.data.id){
      return res.status(500).json({message: 'Invice Xendit tidak valid'})
    }

    res.json({
      invoice_id: response.data.id,
      invoice_url: response.data.invoice_url,
      amount: response.data.amount,
      status: response.data.status,
      paymentMethod: paymentMethod,
      reservationId: reservationId
    });

  } catch (err) {
    console.error('Error Xendit: ',err.response?.data || err.message);
    res.status(500).json({
      message: 'Gagal membuat pembayaran sandbox',
    });
  }
});

// Endpoint untuk mendapatkan status pembayaran
app.get('/api/check-payment/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.xendit.co/v2/invoices/${req.params.id}`,
      {
        auth: {
          username: process.env.XENDIT_SECRET_KEY,
          password: '',
        }
      }
    )

    res.json({
        status: response.data.status,
        paidAt: response.data.paidAt,
        amount: response.data.amount,
        invoice_id: response.data.id
    });

  } catch (err) {
    console.error('Payment status error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan status pembayaran'
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

// ALL NOTIFICATION (ONLY ADMIN)
app.get("/notifications", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const notif = await NotifAdmin.find({
      createdAt: {
        $gte: today,
        $lte: tomorrow
      }
    }).sort({ createdAt: -1 });

    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// ALL NOTIFICATION (ONLY DOKTER)
app.get("/notifications/dokter", authenticateUser , async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if(!user){
      return res.status(404).json({ message: 'User tidak ditemukan'});
    }
    const doctorName = user.nama.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const notif = await NotifDokter.find({
      doctorRoom: doctorName,
      createdAt: {
        $gte: today,
        $lte: tomorrow
      }
    }).sort({ createdAt: -1 });

    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// ALL NOTIFICATION (ONLY TERAPIS)
app.get("/notifications/terapis", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const notif = await NotifTerapis.find({
      createdAt: {
        $gte: today,
        $lte: tomorrow
      }
    }).sort({ createdAt: -1 });

    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

// NOTIFIKASI IKLAN
app.post("/notification/send", async (req, res) => {
  try {
    const { tokens, judul, isi } = req.body;

    if(!tokens || tokens.length === 0) {
      return res.status(400).json({message: 'Token kosong'})
    }

    // 1. kirim socket (real-time)
    io.emit("new_notification", {
      title: judul,
      body: isi,
      time: new Date(),
    });

    // 2. kirim firebase (push notif)
    await admin.messaging().send({
      topic: "all_users",
      notification: {
        title: judul,
        body: isi,
      },
      tokens: tokens
    });

    // 3. response
    res.json({
      success: true,
      message: "Notifikasi berhasil dikirim",
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
});

let userTokens = [];

// SAVE TOKEN DARI FLUTTER
app.post("/save-fcm-token", (req, res) => {
  const { token } = req.body;

  console.log("TOKEN MASUK:", token);

  if (!token) {
    return res.status(400).json({ message: "Token kosong" });
  }

  if (!userTokens.includes(token)) {
    userTokens.push(token);
  }

  console.log("TOTAL TOKEN:", userTokens.length);

  res.json({
    message: "Token berhasil disimpan",
    total: userTokens.length,
  });
});

// SEND NOTIF KE ALL USER
app.post("/send-to-all", async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: "Title/body kosong" });
  }

  if (userTokens.length === 0) {
    return res.status(400).json({ message: "Tidak ada token user" });
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    tokens: userTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    res.json({
      message: "Notifikasi terkirim",
      success: response.successCount,
      failure: response.failureCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Gagal kirim notifikasi",
      error: error.message,
    });
  }
});

// TANDAI BACA (ONLY ADMIN) FOR RESERVASION NOTIF
app.put("/notifications/read-all", async (req,res) => {
  await NotifAdmin.updateMany({}, {isRead: true});
  res.json({message: "Semua notifikasi sudah dibaca"})
})

// TANDAI BACA (ONLY DOKTER) FOR RESERVASION NOTIF
app.put("/notifications/dokter/read-all", authenticateUser, async (req,res) => {
  try{
    const user = await User.findById(req.user.id);

    if(!user) {
      return res.status(404).json({message: "User tidak ditemukan"});
    }

    const doctorName = user.nama.trim().toLocaleLowerCase();
    await NotifDokter.updateMany(
      {doctorRoom: doctorName, isRead: false}, 
      {$set: {isRead: true}}
    );
    res.json({message: "Semua notifikasi sudah dibaca"})
  }catch (err) {
    console.log(err);
    res.status(500).json({ message: "Gagal update notifikasi" });
  }
})

// LAPORAN RESERVASI ADMIN
// GET laporan reservasi (hanya selesai & sudah bayar)
app.get('/laporan/reservasi', async (req, res) => {
  try {
    const reservasi = await Reservasi.find({
      status: 'selesai',
      paymentStatus: 'paid'
    }).sort({ createdAt: -1 }); // optional: terbaru dulu

    const formattedData = reservasi.map(item => ({
      id: item.id,
      nama: item.namaPasien,
      pic: item.pic,
      tanggal: item.tanggalReservasi,
      status: item.status,
      jamReservasi: item.jamReservasi,
      tipe: item.tipe,
      amount: item.amount,
      paymentStatus: item.paymentStatus,
      paidAt: item.paidAt
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan reservasi'
    });
  }
});

// GET laporan reservasi (status selesai dan pending)
app.get('/laporan/reservasi/pending', async (req, res) => {
  try {
    const reservasi = await Reservasi.find({
      status: 'selesai',
      paymentStatus: 'pending'
    }).sort({ createdAt: -1 }); // optional: terbaru dulu

    const formattedData = reservasi.map(item => ({
      id: item.id,
      nama: item.namaPasien,
      pic: item.pic,
      tanggal: item.tanggalReservasi,
      status: item.status,
      jamReservasi: item.jamReservasi,
      tipe: item.tipe,
      amount: item.amount,
      paymentStatus: item.paymentStatus,
      paidAt: item.paidAt
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan reservasi'
    });
  }
});

// ubah status paymentstatus oleh admin
app.put('/reservasi/payment/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Reservasi.findOneAndUpdate(
      { id: id }, // 🔥 PENTING: pakai field id kamu
      {
        paymentStatus: req.body.paymentStatus,
        paidAt: req.body.paymentStatus === 'paid' ? new Date() : null
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({ message: 'OK', data: updated });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on ${port}`);
    console.log('Xendit configured with key:', process.env.XENDIT_SECRET_KEY ? 'Yes' : 'No');
})