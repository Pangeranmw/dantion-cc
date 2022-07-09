import express from 'express';

import {
	betaForm,
} from "../controllers/beta.js";

const router = express.Router();

router.post('/form', betaForm);

export default router;
