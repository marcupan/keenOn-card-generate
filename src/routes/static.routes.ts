import { getImageHandler } from '@controllers/static.controller';
import express from 'express';

const router = express.Router();

router.use('/images', getImageHandler);

export default router;
