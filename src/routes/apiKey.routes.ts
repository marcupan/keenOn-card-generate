import { Router } from 'express';

import { apiKeyController } from '@controllers/apiKey.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import csrfProtection from '@middleware/csrf.middleware';

const router = Router();

router.use(deserializeUser, requireUser);

router.post('/', csrfProtection, apiKeyController.createApiKey);

router.get('/', apiKeyController.listApiKeys);

router.delete('/:id', csrfProtection, apiKeyController.revokeApiKey);

export default router;
