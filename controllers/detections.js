import { v4 as uuidv4 } from 'uuid';
import storagePackage from '@google-cloud/storage';
const { Storage } = storagePackage;
import { bigqueryClient } from "../index.js";
import { firebaseApp } from "../initFirebase.js";
const db = firebaseApp.database();
const ref = db.ref('detections');

export const detectionAll = async (req, res) => {

    const queryDetectExist = `
    SELECT detections.id, detections.lat, detections.lon, detections.recordUrl, detections.type, detections.status, detections.city,detections.updatedAt, users.id AS userId,
    users.name, users.address, users.number, users.parentNumber, users.photo, validator.name AS validatorName, validator.photo AS validatorPhoto
    FROM \`danger-detection.dantion.detections\` AS detections
    JOIN \`danger-detection.dantion.users\` AS users ON detections.userId = users.id
    LEFT OUTER JOIN \`danger-detection.dantion.users\` AS validator ON detections.validatorId = validator.id
    ORDER BY detections.updatedAt DESC
    `;
    let options = {
        query: queryDetectExist,
        location: 'asia-southeast2'
    };
    const [detections] = await bigqueryClient.query(options);

    return res.json({
        error: false,
        message: "Berhasil mendapatkan data detection",
        detections
    });
}
export const getDetectionStatistic = async (req, res) => {
	const queryStats = `
    SELECT COUNT(type) AS kecelakaan, (SELECT COUNT(type) FROM \`danger-detection.dantion.detections\` WHERE type = 'kejahatan') AS kejahatan,
    (SELECT COUNT(type) FROM \`danger-detection.dantion.detections\` WHERE type = 'kebakaran') AS kebakaran
    FROM \`danger-detection.dantion.detections\` WHERE type = 'kecelakaan'
    `;
	let options = {
		query: queryStats,
		location: "asia-southeast2",
	};
	const [detections] = await bigqueryClient.query(options);

	return res.json({
		error: false,
		message: "Berhasil mendapatkan data statistik",
		stat: detections[0],
	});
};
export const detectionAdd = async (req, res) => {
	const { lat, lon, type, userId, city } = req.body;
	const file = req.files.recordUrl;
    let latFloat = parseFloat(lat);
    let lonFloat = parseFloat(lon);
	const status = "invalid";
    const storage = new Storage({ keyFilename: "dangerdetection-key.json" });
	const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
	if (
		userId === undefined ||
		lat === undefined ||
		lon === undefined ||
		file === undefined ||
		file === null ||
		type === undefined ||
		city === undefined
	) {
		return res.status(400).json({
			error: true,
			message: "Masukkan data dengan benar",
		});
	}
	
    const queryUserExist = `SELECT COUNT(email) AS emailCount FROM \`danger-detection.dantion.users\` WHERE id=@id`;
    let options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { id: userId }
    };
    const [userExist] = await bigqueryClient.query(options);
	if (userExist.emailCount === 0) {
		return res.status(400).json({
			error: true,
			message: "User tidak ditemukan",
		});
	}
    const ext = file.name.split(".").filter(Boolean).slice(1).join(".");
    const recordName = `R-${type}-${uuidv4()}.${ext}`;
    const blob = bucket.file(`records/${recordName}`);
    const blobStream = blob.createWriteStream();

    blobStream.on("error", (err) => {
        res.status(500).send({ message: err.message });
    });

    blobStream.on("finish", async () => {
        const id = "D-" + uuidv4();
        const createdAt = new Date().toISOString();
        const updatedAt = createdAt;
        const recordUrl = `https://storage.googleapis.com/${bucket.name}/records/${recordName}`;

        const queryNewDetection = `INSERT \`danger-detection.dantion.detections\`
        (id, lat, lon, recordUrl, type, status, userId, createdAt, updatedAt, city)
        VALUES (@id, @lat, @lon, @recordUrl, @type, @status, @userId, @createdAt, @updatedAt, @city)`;

        options = {
            query: queryNewDetection,
            location: "asia-southeast2",
            params: {
                id: id,
                lat: latFloat,
                lon: lonFloat,
                recordUrl: recordUrl,
                type: type,
                status: status,
                userId: userId,
                city: city,
                createdAt: createdAt,
                updatedAt: updatedAt,
            },
        };

        const detectionsRef = ref.child(id);
        detectionsRef.set({
            lat: latFloat,
            lon: lonFloat,
            recordUrl: recordUrl,
            type: type,
            status: status,
            userId: userId,
            city: city,
            createdAt: createdAt,
            updatedAt: updatedAt,
            validatorId: "",
        });

        await bigqueryClient.query(options);
        return res.json({
            error: false,
            message: "Data berhasil ditambahkan",
        });
    });
    blobStream.end(file.data);
}

export const detectionDetail = async (req, res) => {
    const { id } = req.params

    const queryDetectExist = `
    SELECT detections.id, detections.lat, detections.lon, detections.recordUrl, detections.type, detections.status, detections.city,detections.updatedAt, users.id AS userId,
    users.name, users.address, users.number, users.parentNumber, users.photo, validator.name AS validatorName, validator.photo AS validatorPhoto
    FROM \`danger-detection.dantion.detections\` AS detections
    JOIN \`danger-detection.dantion.users\` AS users ON detections.userId = users.id
    LEFT OUTER JOIN \`danger-detection.dantion.users\` AS validator ON detections.validatorId = validator.id
    WHERE detections.id=@id
    ORDER BY detections.updatedAt DESC
    `;
    let options = {
        query: queryDetectExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [detection] = await bigqueryClient.query(options);
    if(detection.length !== 0) {
        return res.json({
            error: false,
            message: "Data berhasil ditemukan",
            detection: detection[0]
        });
    } else {
        return res.status(400).json({
            error: true,
            message: "Data tidak ditemukan"
        });
    }
}

export const detectionUpdate = async (req, res) => {
    const {
        id, status, idUserLogin
    } = req.body;

    if (id === undefined || status === undefined || idUserLogin === undefined) {
        return res.status(400).json({
            error: true,
            message: "Masukkan data dengan benar",
        });
    }

    const queryDetectExist = `SELECT * FROM \`danger-detection.dantion.detections\` WHERE id=@id`;
    let options = {
        query: queryDetectExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [detectExist] = await bigqueryClient.query(options);
    if(detectExist.length === 0) {
        return res.status(400).json({
            error: true,
            message: "Data tidak ditemukan",
        });
    }
    
    const queryUserExist = `SELECT role, id FROM \`danger-detection.dantion.users\` WHERE id=@id`;
    options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { id: idUserLogin }
    };
    const [userExist] = await bigqueryClient.query(options);

    const userRole = userExist[0].role;
    const validatorId = userExist[0].id;
    if (userRole==='umum') {
        return res.status(400).json({
            error: true,
            message: "Anda tidak berhak memvalidasi data",
        });
    }

    const updatedAt = new Date().toISOString();

    const queryUpdate = `UPDATE \`danger-detection.dantion.detections\`
    SET status=@status, updatedAt=@updatedAt, validatorId=@validatorId WHERE id=@id`;
    options = {
        query: queryUpdate,
        location: "asia-southeast2",
        params: {
            id: id,
            status: status,
            validatorId: validatorId,
            updatedAt: updatedAt,
        },
    };
    await bigqueryClient.query(options);

    const detectionsRef = ref.child(id);
    detectionsRef.update({
        status: status,
        validatorId: validatorId,
        updatedAt: updatedAt,
    });
    return res.json({
        error: false,
        message: "Data berhasil diupdate"
    });
}

export const detectionDelete = async (req, res) => {
    const { id } = req.params;
    if(id === undefined) {
        return res.status(400).json({
            error: true,
            message: "Masukkan data dengan benar"
        });
    }
    
    const queryDetectExist = `SELECT * FROM \`danger-detection.dantion.detections\` WHERE id=@id`;
    let options = {
        query: queryDetectExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [rDetectExist] = await bigqueryClient.query(options);
    if(rDetectExist.length === 0) {
        return res.status(400).json({
            error: true,
            message: "Data tidak ditemukan"
        });
    }

    // const detectExist = rDetectExist[0];
    // const recordName = detectExist.recordUrl.split('/').slice(3).join('/');
    // fs.unlink(`./${recordName}`, (err) => {
    //     if(err) {
    //         res.status(400).json({
    //             error: true,
    //             message: "Tidak dapat menghapus file"
    //         });
    //     }
    // });

    const queryDeleteDetection = `DELETE \`danger-detection.dantion.detections\` WHERE id=@id`;
    options = {
        query: queryDeleteDetection,
        location: 'asia-southeast2',
        params: { id: id }
    };
    await bigqueryClient.query(options);

    const detectionsRef = ref.child(id);
    detectionsRef.set({});
    return res.json({
        error: false,
        message: "Data berhasil dihapus"
    });
}
