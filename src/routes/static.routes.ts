import express from 'express';

import { getImageHandler } from '../controller/static.controller';

const router = express.Router();

router.use('/images', getImageHandler);

export default router;
