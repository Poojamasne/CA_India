require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path'); 
const fs = require('fs'); // Import the fs module

const userAuthRoutes = require('./routes/user-auth-routes');
const bookRoutes = require('./routes/bookRoutes');
const businessRoutes = require('./routes/businessRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bankRoutes = require('./routes/bankRoutes');
const headAccountRoutes = require('./routes/headAccountRoutes');
const partyRoutes = require('./routes/partyRoutes');
const categoryRoutes = require("./routes/categoryRoutes");
const categoryBookRoutes = require("./routes/categoryBookRoutes");
const PartyBookRoutes = require("./routes/PartyBookRoutes");
const customerRoutes = require("./routes/customerRoutes");
const ItemRoutes = require("./routes/ItemRoutes");
const InvoiceRoutes = require("./routes/InvoiceRoutes");
const ProfileRoutes = require("./routes/ProfileRoutes");
const FilterRoutes = require('./routes/FilterRoutes');
const transferRoutes = require("./routes/TransferRoutes");
const referencerRoutes = require('./routes/referencerRoutes');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the 'pdfs' directory exists
const pdfsDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir);
}

app.use('/download', express.static(pdfsDir));

const connectedClients = new Set();

app.get("/", (req, res) => {
    res.send("Receipt Management API is Running...");
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    connectedClients.add(socket);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectedClients.delete(socket);
    });
});

// Function to send real-time notifications
const sendNotification = (notification) => {
    connectedClients.forEach((socket) => {
        socket.emit('newNotification', notification);
    });
};

app.set('sendNotification', sendNotification);

// API Routes
app.use('/api', userAuthRoutes);
app.use('/api', bookRoutes);
app.use('/api', businessRoutes);
app.use('/api', notificationRoutes);
app.use('/api', receiptRoutes);
app.use('/api', paymentRoutes);
app.use('/api', bankRoutes);
app.use('/api', headAccountRoutes);
app.use('/api', partyRoutes);
app.use("/api", categoryRoutes);

app.use("/api", categoryBookRoutes);
app.use("/api", PartyBookRoutes);
app.use('/api', customerRoutes);
app.use('/api', ItemRoutes);
app.use('/api', InvoiceRoutes); 
app.use('/api', ProfileRoutes);
app.use('/api', FilterRoutes);
app.use("/api", transferRoutes);
app.use('/api', referencerRoutes); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});