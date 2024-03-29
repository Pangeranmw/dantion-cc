import { generateAccessToken } from '../routes/auth.js';
import { hashPassword, checkPassword } from '../utils/helpers.js';
import { v4 as uuidv4 } from 'uuid';
import storagePackage from '@google-cloud/storage';
const { Storage } = storagePackage;
import { bigqueryClient } from '../index.js';
import { firebaseApp } from "../initFirebase.js";

const db = firebaseApp.database();
const ref = db.ref("users");

export const userAll = async (req, res) => {
    const {id} = req.query
    if (id === undefined) {
        return res.status(400).json({
            error: true,
            message: "Gagal mengambil user. Mohon isi data dengan benar"
        });
    }
    const queryAdminExist = `SELECT * FROM \`danger-detection.dantion.admins\` WHERE id=@id`;
    let options = {
        query: queryAdminExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [adminsExist] = await bigqueryClient.query(options);
    if (adminsExist.length === 0){
        return res.status(400).json({
            error: true,
            message: "Gagal melihat user, Anda tidak berhak",
        });
    }

    const queryUserAll = `SELECT * FROM \`danger-detection.dantion.users\``;
    options = {
        query: queryUserAll,
        location: 'asia-southeast2'
    };
    const [users] = await bigqueryClient.query(options);

    return res.json({
        error: false,
        message: "Berhasil Mendapatkan Semua User",
        users
    });
}

export const userRegister = async (req, res) => {
    const {
        name, address, number, parentNumber, email, password
    } = req.body;
    const role = "umum"
    
    if (name === undefined || address === undefined || number === undefined || parentNumber === undefined || email === undefined || password === undefined) {
        return res.status(400).json({
            error: true,
            message: "Gagal menambahkan user. Mohon isi data dengan benar"
        });
    }

    const queryUserExist = `SELECT COUNT(email) AS emailCount FROM \`danger-detection.dantion.users\` WHERE email=@email`;
    let options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { email: email }
    };
    const [userExist] = await bigqueryClient.query(options);

    if(userExist[0].emailCount !== 0) {
        return res.status(400).json({
            error: true,
            message: "Gagal menambahkan user. Email sudah terdaftar"
        });
    }

    const id = `U-${uuidv4()}`;
    const photo = "https://storage.googleapis.com/danger-detection.appspot.com/users/default_profile.png";
    const hashPass = hashPassword(password);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const queryNewUser = `INSERT \`danger-detection.dantion.users\`
    (id, name, address, number, parentNumber, email, password, role, photo, createdAt, updatedAt) 
    VALUES (@id, @name, @address, @number, @parentNumber, @email, @password, @role, @photo, @createdAt, @updatedAt)`;

    options = {
        query: queryNewUser,
        location: 'asia-southeast2',
        params: {
            id: id, 
            name: name,
            address: address, 
            number: number,
            parentNumber: parentNumber, 
            email: email,
            password: hashPass, 
            role: role,
            photo: photo, 
            createdAt: createdAt,
            updatedAt: updatedAt
        }
    };

    const usersRef = ref.child(id);
    usersRef.set({
        name: name,
        address: address,
        number: number,
        parentNumber: parentNumber,
        email: email,
        password: hashPass,
        role: role,
        photo: photo,
        createdAt: createdAt,
        updatedAt: updatedAt,
    });

    await bigqueryClient.query(options);

    return res.json({
        error: false,
        message: "User berhasil ditambahkan"
    });
}

export const userLogin = async (req, res) => {
    const { email, password } = req.body

    if(email === undefined || password === undefined) {
        return res.status(400).json({
            error: true,
            message: "Isi data dengan benar"
        });
    }

    const queryUserExist = `SELECT * EXCEPT (createdAt,updatedAt) FROM \`danger-detection.dantion.users\` WHERE email=@email`;
    let options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { email: email }
    };
    const [rUserExist] = await bigqueryClient.query(options);

    if(rUserExist.length === 0) {
        return res.status(400).json({
            error: true,
            message: "User tidak terdaftar"
        });
    }

    const userExist = rUserExist[0];
    if(!checkPassword(password, userExist.password)) {
        return res.status(400).json({
            error: true,
            message: "Login gagal"
        });
    }

    else {
        const user = { id: userExist.id };
        const accessToken = generateAccessToken(user);

        return res.json({
            error: false,
            message: "Berhasil Login",
            loginResult: {
                id: userExist.id,
                name: userExist.name,
                address: userExist.address,
                number: userExist.number,
                parentNumber: userExist.parentNumber,
                email: userExist.email,
                role: userExist.role,
                photo: userExist.photo,
                token: accessToken,
            },
        });
    }
}

export const userDetail = async (req, res) => {
    const { id } = req.params

    const queryUserExist = `SELECT * FROM \`danger-detection.dantion.users\` WHERE id=@id`;
    let options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [rUserExist] = await bigqueryClient.query(options);

    if(rUserExist.length !== 0) {
        const userExist = rUserExist[0];
        console.log(userExist);
        return res.json({
            error: false,
            message: "Berhasil mendapatakan detail user",
            user: userExist,
        });
    } else {
        return res.status(400).json({
            error: true,
            message: "User tidak ditemukan"
        });
    }
}
export const userUpdatePassword = async (req, res) => {
	const { id, password, newPassword } = req.body;
	if (
		id === undefined ||
		password === undefined ||
        newPassword === undefined
	) {
		return res.status(400).json({
			error: true,
			message: "Gagal memperbarui user. Mohon isi data dengan benar",
		});
	}
	const queryUserExist = `SELECT id, password FROM \`danger-detection.dantion.users\` WHERE id=@id`;
	let options = {
		query: queryUserExist,
		location: "asia-southeast2",
		params: { id: id },
	};
	const [rUserExist] = await bigqueryClient.query(options);
	if (rUserExist.length === 0) {
		return res.status(400).json({
			error: true,
			message: "User tidak ditemukan",
		});
	}
	const userExist = rUserExist[0];
    if (!checkPassword(password, userExist.password)) {
        return res.status(400).json({
            error: true,
            message: "Ubah Kata Sandi Gagal",
        });
    }

	const queryUpdate = `UPDATE \`danger-detection.dantion.users\`
    SET password=@password, updatedAt=@updatedAt
    WHERE id=@id`;
	options = {
		query: queryUpdate,
		location: "asia-southeast2",
		params: {
			id: id,
			password: hashPassword(newPassword),
			updatedAt: new Date().toISOString(),
		},
	};
	await bigqueryClient.query(options);

    const usersRef = ref.child(id);
    usersRef.update({
        id: id,
        password: hashPassword(newPassword),
        updatedAt: new Date().toISOString(),
    });

	return res.json({
		error: false,
		message: "Kata Sandi Berhasil diperbarui",
	});
};
export const userUpdate = async (req, res) => {
    const {
        id, name, address, number, parentNumber, email
    } = req.body;
    if (id === undefined || name === undefined || address === undefined || number === undefined || parentNumber === undefined || email === undefined) {
        return res.status(400).json({
            error: true,
            message: "Gagal memperbarui user. Mohon isi data dengan benar"
        });
    }
    const queryUserExist = `SELECT * FROM \`danger-detection.dantion.users\` WHERE id=@id`;
    let options = {
        query: queryUserExist,
        location: 'asia-southeast2',
        params: { id: id }
    };
    const [rUserExist] = await bigqueryClient.query(options);
    if(rUserExist.length === 0) {
        return res.status(400).json({
            error: true,
            message: "User tidak ditemukan"
        });
    }
    const queryUpdate = `UPDATE \`danger-detection.dantion.users\`
    SET name=@name, address=@address, number=@number, parentNumber=@parentNumber, email=@email, updatedAt=@updatedAt
    WHERE id=@id`;
    options = {
        query: queryUpdate,
        location: 'asia-southeast2',
        params: { 
            id: id, 
            name: name,
            address: address, 
            number: number,
            parentNumber: parentNumber, 
            email: email,
            updatedAt: new Date().toISOString()
        }
    };
    await bigqueryClient.query(options);

    return res.json({
        error: false,
        message: "User berhasil diupdate"
    });
}

export const userUpdatePhoto = async (req, res) => {
	const {id} = req.query;
    const file = req.files.photo

	if (id === undefined) {
		return res.status(400).json({
			error: true,
			message: "Gagal memperbarui user. Mohon isi data dengan benar",
		});
	}
	const queryUserExist = `SELECT * FROM \`danger-detection.dantion.users\` WHERE id=@id`;
	let options = {
		query: queryUserExist,
		location: "asia-southeast2",
		params: { id: id },
	};
	const [rUserExist] = await bigqueryClient.query(options);
	if (rUserExist.length === 0) {
		return res.status(400).json({
			error: true,
			message: "User tidak ditemukan",
		});
	}
	const userExist = rUserExist[0];
	let photoUrl = userExist.photoUrl;
	if (file !== undefined && file !== null ) {
		const storage = new Storage({ keyFilename: "dangerdetection-key.json" });
		const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
		const ext = file.name.split(".").filter(Boolean).slice(1).join(".");
		const photoName = `PP-${userExist.id}.${ext}`;
		photoUrl = `https://storage.googleapis.com/${bucket.name}/users/${photoName}`;

		const blob = bucket.file(`users/${photoName}`);
		const blobStream = blob.createWriteStream();

		blobStream.on("error", (err) => {
			return res.status(400).json({
				error: true,
				message: err,
			});
		});

		blobStream.on("finish", () => {});
		blobStream.end(file.data);
	}

	const queryUpdate = `UPDATE \`danger-detection.dantion.users\`
    SET photo=@photo, updatedAt=@updatedAt
    WHERE id=@id`;
	options = {
		query: queryUpdate,
		location: "asia-southeast2",
		params: {
			id: id,
			photo: photoUrl,
			updatedAt: new Date().toISOString(),
		},
	};
	await bigqueryClient.query(options);
    const usersRef = ref.child(id);
    usersRef.update({
        id: id,
        photo: photoUrl,
        updatedAt: new Date().toISOString(),
    });
	return res.json({
		error: false,
		message: "Foto User berhasil diupdate",
		photo: photoUrl,
	});
};
