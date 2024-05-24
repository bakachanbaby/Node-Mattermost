const express = require('express');
const cors = require('cors');
const User = require('./models/User')
const Post = require('./models/Post')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

const uploadMiddleware = multer({ dest: 'uploads/' });
const app = express();

const corsOptions = {
    origin: '*',
    credentials: true,
    origin: 'http://localhost:3000',
    optionSuccessStatus: 200,
}

const salt = bcrypt.genSaltSync(10);
const secretKey = 'lkanfjlasndfjkeafbjkadebfjasdjfn'

app.use(cors(corsOptions)) // Use this after the variable declarationapp.use(express.json());
app.use(express.json());
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'));


mongoose.connect('mongodb+srv://blog:UxpqZAW3qphWOFzu@cluster0.gu531bf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// Hàm sử dụng để đăng ký
app.post('/register', async (req, res) => {
    console.log(req.body);
    const { username, password } = req.body;
    try {
        const UserDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt) // Mã hóa password trước khi lưu vào database
        });
        res.json(UserDoc);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User
            .findOne({ username })
            .exec(); // Chuyển về Promise
        // Kiểm tra xem user có tồn tại không
        if (!user) {
            res.status(404).json({ error: 'User not found', status: 404 });
        }
        // Kiểm tra xem password có đúng không
        else if (!bcrypt.compareSync(password, user.password)) {
            res.status(400).json({ error: 'Password is incorrect', status: 400 });
        }
        // Nếu cả username và password đều đúng
        else {
            jwt.sign({ username, id: user._id }, secretKey, {}, (err, token) => {
                if (err) {
                    throw err;
                }
                res.cookie('token', token).json({
                    id: user._id,
                    username,
                });
            }
            )
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Hàm thực hiện lấy ra profile của user
app.get('/profile', async (req, res) => {
    const { token } = req.cookies;

    // Kiểm tra xem token có tồn tại không
    jwt.verify(token, secretKey, async (err, decoded) => {
        // Nếu token không hợp lệ
        if (err) {
            res.status(401).json({ error: 'Unauthorized', status: 401 });
        }
        // Nếu token hợp lệ thì lấy ra thông tin của user đó
        else {
            const user = await User.findById(decoded.id).exec();
            res.json(user);
        }
    })
    // res.json(req.cookies);
});

// Hàm thực hiện đăng xuất ra khỏi hệ thống
app.post('/logout', (req, res) => {
    res.clearCookie('token').json('ok');

});

// Hàm thực hiện tạo bài post mới
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {

    // Lấy ra thông tin file
    const { originalname, path } = req.file;
    const parts = originalname.split('.'); // Tách tên file thành mảng
    const ext = parts.pop(); // Lấy ra phần mở rộng của file
    const newPath = path + '.' + ext; // Tạo ra đường dẫn mới cho file
    fs.renameSync(path, newPath); // Đổi tên file

    // Lấy ra token từ cookie
    const { token } = req.cookies;

    // Kiểm tra xem token có hợp lệ không
    jwt.verify(token, secretKey, async (err, decoded) => {
        // Nếu token không hợp lệ
        if (err) {
            res.status(401).json({ error: 'Unauthorized', status: 401 });
            return;
        }
        // Nếu token hợp lệ
        else {
            const user = await User.findById(decoded.id).exec();
            // res.json(user);
            const { title, summary, content } = req.body;

            // Tạo ra một bài post mới
            const postDoc = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: user._id
            });
            res.json(postDoc);
        }
    })
});

// Hàm thực hiện cập nhật bài post
app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
    // Lấy ra id của bài post
    const { id } = req.params;
    // Lấy ra đường dẫn mới của file
    let newPath = ''
    // Nếu có file được gửi lên
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts.pop();
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath)
    }

    // Lấy ra token từ cookie
    const { token } = req.cookies;

    // Kiểm tra xem token có hợp lệ không
    jwt.verify(token, secretKey, async (err, decoded) => {
        // Nếu token không hợp lệ
        if (err) {
            res.status(401).json({ error: 'Unauthorized', status: 401 });
            return;
        }

        const { title, summary, content } = req.body;

        // Lấy ra thông tin của bài post
        const postDoc = await Post.findById(id);
        console.log(postDoc);

        // Kiểm tra xem người dùng có phải là tác giả của bài post không
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(decoded.id);

        // Nếu không phải là tác giả
        if (!isAuthor) {
            res.status(403).json({ error: 'Forbidden', status: 403 });
            return;
        }
        // Nếu là tác giả
        else {
            postDoc.title = title;
            postDoc.summary = summary;
            postDoc.content = content;
            if (newPath) {
                postDoc.cover = newPath;
            }
            await postDoc.save(); // Lưu lại thông tin của bài post
            res.json(postDoc);
        }
    })
});

// Hàm thực hiện xóa bài post
app.get('/post', async (req, res) => {
    const posts = (await Post.find().populate('author', ['username']).sort({ createdAt: -1 }).limit(20));
    res.json(posts);
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    const post = await Post.findById(id).populate('author', ['username']).exec();
    res.json(post);
})



app.listen(4000, () => {
    console.log('Server is running on port 4000');
});