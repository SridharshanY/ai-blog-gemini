// backend/src/server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js'
dotenv.config();

const app = express();
app.use(cors({
  origin: true,                // or restrict to your frontend origin
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.use(bodyParser.json({ limit: '3mb' }));
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes)

const PORT = process.env.PORT;
const MONGO = process.env.MONGO_URI

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('Mongo connected');
    app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
  });
