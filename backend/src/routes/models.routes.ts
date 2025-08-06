import { Router } from 'express';
import { modelsController } from '../controllers/models.controller';
import { authenticateOptional } from '../middleware/auth';

const router = Router();

// Get available models - allow both authenticated and trial mode
router.get('/', authenticateOptional, (req, res) => modelsController.getModels(req, res));

export default router;
