import QrScanner from 'qr-scanner';

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const forms = document.querySelectorAll('.form-container');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const qrCodeDiv = document.getElementById('qrCode');

    // Manejador para cambiar entre formularios
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Actualizar navegación activa
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Mostrar el formulario correspondiente
            const formType = link.getAttribute('data-type');
            forms.forEach(form => {
                form.classList.add('d-none');
                if (form.id === `${formType}Form`) {
                    form.classList.remove('d-none');
                }
            });

            // Mostrar/ocultar opciones de personalización según el tipo
            const qrOptions = document.querySelector('.qr-options');
            if (formType === 'url' || formType === 'text') {
                qrOptions.classList.remove('d-none');
            } else {
                qrOptions.classList.add('d-none');
            }
        });
    });

    generateBtn.addEventListener('click', generateQRCode);
    downloadBtn.addEventListener('click', downloadQRCode);

    // Configuración del escáner y modal
    const scannerBtn = document.getElementById('scannerBtn');
    const scannerModal = new bootstrap.Modal(document.getElementById('scannerModal'));
    let scanner = null;

    scannerBtn.addEventListener('click', () => {
        scannerModal.show();
        initializeScanner();
    });

    // Inicializar el escáner cuando se abre el modal
    function initializeScanner() {
        if (scanner) {
            scanner.start();
            return;
        }

        const videoElement = document.createElement('video');
        document.getElementById('reader').appendChild(videoElement);

        scanner = new QrScanner(
            videoElement,
            result => handleScanResult(result),
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
            }
        );

        scanner.start()
            .catch(err => {
                console.error('Error al iniciar la cámara:', err);
                document.getElementById('result').innerHTML = `
                    <div class="alert alert-danger">
                        Error al acceder a la cámara. Por favor, asegúrate de dar permisos de cámara.
                    </div>
                `;
            });
    }

    // Detener el escáner cuando se cierra el modal
    document.getElementById('scannerModal').addEventListener('hidden.bs.modal', () => {
        if (scanner) {
            scanner.stop();
        }
    });

    // Manejar el resultado del escaneo
    function handleScanResult(result) {
        const resultDiv = document.getElementById('result');
        
        try {
            // Intentar parsear como URL
            const url = new URL(result);
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <p class="mb-2"><strong>URL detectada:</strong></p>
                    <p class="mb-2">${url.href}</p>
                    <button class="btn btn-sm btn-success" onclick="window.open('${url.href}', '_blank')">
                        <i class="fas fa-external-link-alt me-1"></i>Abrir enlace
                    </button>
                </div>
            `;
        } catch {
            // No es una URL, verificar otros formatos
            if (result.startsWith('BEGIN:VCARD')) {
                handleVCardResult(result, resultDiv);
            } else if (result.startsWith('WIFI:')) {
                handleWiFiResult(result, resultDiv);
            } else {
                // Texto plano
                resultDiv.innerHTML = `
                    <div class="alert alert-info">
                        <p class="mb-2"><strong>Texto detectado:</strong></p>
                        <p class="mb-0">${result}</p>
                    </div>
                `;
            }
        }

        // Opcional: detener el escáner después de una lectura exitosa
        // scanner.stop();
    }

    // Manejar resultado de vCard
    function handleVCardResult(result, resultDiv) {
        const name = result.match(/N:(.+)/)?.[1] || '';
        const email = result.match(/EMAIL:(.+)/)?.[1] || '';
        const phone = result.match(/TEL:(.+)/)?.[1] || '';
        
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p class="mb-2"><strong>Contacto detectado:</strong></p>
                <p class="mb-1">Nombre: ${name}</p>
                <p class="mb-1">Email: ${email}</p>
                <p class="mb-1">Teléfono: ${phone}</p>
                <button class="btn btn-sm btn-success mt-2" onclick="saveScannedContact({
                    name: '${name}',
                    email: '${email}',
                    phone: '${phone}'
                })">
                    <i class="fas fa-save me-1"></i>Guardar contacto
                </button>
            </div>
        `;
    }

    // Manejar resultado de WiFi
    function handleWiFiResult(result, resultDiv) {
        const ssid = result.match(/S:(.+?);/)?.[1] || '';
        const password = result.match(/P:(.+?);/)?.[1] || '';
        const encryption = result.match(/T:(.+?);/)?.[1] || '';
        
        resultDiv.innerHTML = `
            <div class="alert alert-success">
                <p class="mb-2"><strong>Red WiFi detectada:</strong></p>
                <p class="mb-1">Red: ${ssid}</p>
                <p class="mb-1">Tipo: ${encryption}</p>
                <button class="btn btn-sm btn-success mt-2" onclick="connectToWiFi('${ssid}', '${password}', '${encryption}')">
                    <i class="fas fa-wifi me-1"></i>Conectar
                </button>
            </div>
        `;
    }

    // Función global para guardar contacto escaneado
    window.saveScannedContact = function(contact) {
        saveContact(contact);
        alert('Contacto guardado correctamente');
        scannerModal.hide();
    };

    // Función global para intentar conexión WiFi
    window.connectToWiFi = function(ssid, password, encryption) {
        // La API de conexión WiFi no está disponible en todos los navegadores
        alert(`Intento de conexión a ${ssid}\nPor razones de seguridad, la conexión automática no está disponible en todos los dispositivos.`);
    };

    // Generar QR con opciones avanzadas
    function generateQRCode() {
        const activeForm = document.querySelector('.form-container:not(.d-none)');
        const qrData = getQRData(activeForm);
        
        if (!qrData) return;

        const options = {
            width: parseInt(document.getElementById('qrSize').value),
            color: {
                dark: document.getElementById('qrColor').value,
                light: '#ffffff'
            },
            errorCorrectionLevel: document.getElementById('qrErrorLevel').value,
            dotScale: document.getElementById('qrDotStyle').value === 'dots' ? 1 : 0.8,
            logoImage: document.getElementById('qrLogo').files[0] || null,
            logoWidth: 50,
            logoHeight: 50,
            quietZone: 10
        };

        QRCode.toCanvas(qrCodeDiv, qrData, options, handleQRCallback);
    }

    function downloadQRCode() {
        const canvas = qrCodeDiv.querySelector('canvas');
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = 'codigo-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    function saveContact(contactData) {
        const contacts = getContacts();
        contacts.push({
            ...contactData,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('qr_contacts', JSON.stringify(contacts));
    }

    function getContacts() {
        return JSON.parse(localStorage.getItem('qr_contacts') || '[]');
    }

    async function saveContactToServer(contactData) {
        try {
            const response = await fetch('http://localhost:3000/api/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contactData)
            });
            const data = await response.json();
            loadContacts(); // Recargar la tabla
            return data;
        } catch (error) {
            console.error('Error al guardar contacto:', error);
            alert('Error al guardar el contacto');
        }
    }

    async function loadContacts() {
        try {
            const response = await fetch('http://localhost:3000/api/contacts');
            const result = await response.json();
            const contacts = result.data;
            
            const tbody = document.getElementById('contactsTable');
            tbody.innerHTML = contacts.map(contact => `
                <tr>
                    <td>${contact.name}</td>
                    <td>${contact.email}</td>
                    <td>${contact.phone}</td>
                    <td>${contact.company || '-'}</td>
                    <td>${new Date(contact.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="regenerateQR('${contact._id}')">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteContact('${contact._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error al cargar contactos:', error);
        }
    }

    async function deleteContact(id) {
        if (!confirm('¿Estás seguro de eliminar este contacto?')) return;
        
        try {
            const response = await fetch(`http://localhost:3000/api/contacts/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                loadContacts(); // Recargar la tabla
            } else {
                alert('Error al eliminar el contacto');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar el contacto');
        }
    }

    function validateForm(formType, data) {
        const errors = [];
        
        switch(formType) {
            case 'url':
                if (!isValidUrl(data.url)) {
                    errors.push('URL inválida');
                }
                break;
            case 'wifi':
                if (!data.ssid) errors.push('SSID es requerido');
                if (data.encryption !== 'nopass' && !data.password) {
                    errors.push('Contraseña requerida para este tipo de encriptación');
                }
                break;
            case 'vcard':
                if (!isValidEmail(data.email)) errors.push('Email inválido');
                if (!isValidPhone(data.phone)) errors.push('Teléfono inválido');
                break;
        }
        
        return errors;
    }

    async function shareQR() {
        const canvas = qrCodeDiv.querySelector('canvas');
        if (!canvas) return;
        
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            const file = new File([blob], 'qr-code.png', { type: 'image/png' });
            
            if (navigator.share) {
                await navigator.share({
                    files: [file],
                    title: 'Mi código QR',
                    text: 'Generado con QR Generator'
                });
            } else {
                // Fallback para navegadores que no soportan Web Share API
                const shareUrl = canvas.toDataURL();
                // Mostrar modal con opciones alternativas de compartir
            }
        } catch (error) {
            console.error('Error al compartir:', error);
        }
    }

    loadContacts();
}); 