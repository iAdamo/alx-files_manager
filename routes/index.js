import { Router } from 'express';

import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import UserController from '../controllers/UsersController';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Authentication routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

// User routes
router.get('/users/me', UserController.getMe);

export default router;
