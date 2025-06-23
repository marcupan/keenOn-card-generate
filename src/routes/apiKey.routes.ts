import { Router } from 'express';

import { apiKeyController } from '@controllers/apiKey.controller';
import { deserializeUser } from '@middleware/deserializeUser';
import { requireUser } from '@middleware/requireUser';
import csrfProtection from '@middleware/csrf.middleware';

const router = Router();

// All API key routes require authentication
router.use(deserializeUser, requireUser);

// Create a new API key
router.post('/', csrfProtection, apiKeyController.createApiKey);

// List API keys
router.get('/', apiKeyController.listApiKeys);

// Revoke an API key
router.delete('/:id', csrfProtection, apiKeyController.revokeApiKey);

export default router;
