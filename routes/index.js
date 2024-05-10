import express from 'express';

import AppController from '../controller/AppController';
import UsersController from '../controller/UsersController';

const router = express.Router();
router.use(express.json());

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);

export default router;
