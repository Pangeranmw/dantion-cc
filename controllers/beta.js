import { v4 as uuidv4 } from 'uuid';
import { bigqueryClient } from '../index.js';

export const betaForm = async (req, res) => {
    const {
        name, email, city,
    } = req.body;
    
    if (name === undefined || email === undefined || city === undefined) {
        return res.status(400).json({
            error: true,
            message: "Gagal menambahkan beta user. Mohon isi data dengan benar"
        });
    }
    const id = `BR-${uuidv4()}`;
    const isSent = false;

    const queryNewBeta = `INSERT \`danger-detection.dantion.betaRequest\`
    (id, name, email, city, isSent) 
    VALUES (@id, @name, @email, @city, @isSent)`;

    let options = {
        query: queryNewBeta,
        location: 'asia-southeast2',
        params: {
            id: id, 
            name: name, 
            email: email,
            city: city,
            isSent: isSent
        }
    };

    await bigqueryClient.query(options);

    return res.json({
        error: false,
        message: "Beta user berhasil ditambahkan"
    });
}
