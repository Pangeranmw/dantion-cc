import { createRequire } from "module";
const require = createRequire(import.meta.url);
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");
const YAML = require("yamljs");
import bigQueryPackage from '@google-cloud/bigquery';
const { BigQuery } = bigQueryPackage;

export const bigqueryClient = new BigQuery({
	keyFilename: "dangerdetection-key.json",
	projectId: "danger-detection",
});

import express from 'express';
import upload from 'express-fileupload';
require('dotenv').config();

import usersRoutes from './routes/users.js';
import detectionRoutes from './routes/detections.js';
import placeRoutes from './routes/places.js';
import adminsRoutes from "./routes/admins.js";
import betaRoutes from './routes/beta.js';

const swaggerDocument = YAML.load("./openapi-appengine.yaml");

const app = express();
const PORT = process.env.BASE_URL_PORT;
const URL = `${process.env.BASE_URL}:${PORT}`;

app.use(cors());
app.use(express.urlencoded({extended: false}));
app.use(upload({ createParentPath: true }));

app.use('/users', usersRoutes);
app.use('/detections', detectionRoutes);
app.use('/places', placeRoutes);
app.use("/admins", adminsRoutes);
app.use("/beta", betaRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send("Ini halaman index");
});

app.listen(PORT, () => console.log(`Server running on port: ${URL}`));
