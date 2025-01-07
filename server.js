require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB con mejor manejo de errores
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

// Agregar modelo de Usuario
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Esquema mejorado para Contacto
const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        match: [/.+\@.+\..+/, 'Email inválido']
    },
    phone: {
        type: String,
        required: [true, 'El teléfono es requerido']
    },
    company: String,
    qrCode: String, // Podemos guardar el QR generado
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const qrCodeSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['url', 'wifi', 'vcard', 'text'],
        required: true
    },
    data: {
        type: Object,
        required: true
    },
    imageUrl: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Contact = mongoose.model('Contact', contactSchema);

// Rutas API mejoradas
app.post('/api/contacts', async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();
        res.status(201).json({
            success: true,
            data: contact
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find()
            .sort('-createdAt')
            .select('-__v'); // Excluir campo de versión
        
        res.json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener contactos'
        });
    }
});

// Buscar contacto por ID
app.get('/api/contacts/:id', async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener el contacto'
        });
    }
});

// Eliminar contacto
app.delete('/api/contacts/:id', async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contacto no encontrado'
            });
        }
        res.json({
            success: true,
            message: 'Contacto eliminado correctamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el contacto'
        });
    }
});

// Endpoints para estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            QRCode.countDocuments(),
            Contact.countDocuments(),
            QRCode.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ])
        ]);
        
        res.json({
            success: true,
            data: {
                totalQRs: stats[0],
                totalContacts: stats[1],
                qrsByType: stats[2]
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: {
            message: err.message || 'Error interno del servidor',
            code: err.code || 'INTERNAL_ERROR'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 