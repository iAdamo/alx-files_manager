import express from 'express';

import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

router.use(express.json());

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// File routes
router.post('/files', FilesController.postUpload);

// User routes
router.post('/users', UsersController.postNew);
router.get('/users/me', UsersController.getMe);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

export default router;
