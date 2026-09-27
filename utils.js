/**
 * KLARO Photobooth - Utility Functions
 * Handles storage, QR code generation, and image processing
 */

const STORAGE_KEY = 'klaro_photobooth_data';
const PHOTOS_STORAGE_KEY = 'klaro_photos';

/**
 * Storage Management
 */
const StorageManager = {
    /**
     * Get all photobooth sessions
     */
    getAllSessions() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading sessions:', e);
            return [];
        }
    },

    /**
     * Save a new photobooth session
     */
    saveSession(sessionData) {
        try {
            const sessions = this.getAllSessions();
            sessions.push(sessionData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
            return sessionData;
        } catch (e) {
            console.error('Error saving session:', e);
            return null;
        }
    },

    /**
     * Get a specific session by ID
     */
    getSession(sessionId) {
        const sessions = this.getAllSessions();
        return sessions.find(s => s.id === sessionId);
    },

    /**
     * Delete a session by ID
     */
    deleteSession(sessionId) {
        try {
            const sessions = this.getAllSessions();
            const filtered = sessions.filter(s => s.id !== sessionId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('Error deleting session:', e);
            return false;
        }
    },

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Error clearing storage:', e);
            return false;
        }
    }
};

/**
 * QR Code Generation
 */
const QRCodeGenerator = {
    /**
     * Generate a QR code using QR Server API
     * @param {string} text - Text to encode
     * @returns {string} - QR code image URL
     */
    generateQRCode(text) {
        const size = 300;
        const encodedText = encodeURIComponent(text);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
    }
};

/**
 * Image Processing
 */
const ImageProcessor = {
    /**
     * Generate a photobooth film strip from 4 photos
     * @param {HTMLCanvasElement[]} photoCanvases - Array of 4 photo canvases
     * @returns {Promise<string>} - Base64 image data
     */
    async generateFilmStrip(photoCanvases) {
        return new Promise((resolve, reject) => {
            try {
                if (photoCanvases.length !== 4) {
                    throw new Error('Expected 4 photos');
                }

                // Film dimensions
                const stripWidth = 400;
                const photoHeight = 360;
                const borderWidth = 20;
                const spacing = 15;
                const totalHeight = (borderWidth * 2) + (photoHeight * 4) + (spacing * 3) + 100; // 100 for header and footer

                const canvas = document.createElement('canvas');
                canvas.width = stripWidth;
                canvas.height = totalHeight;

                const ctx = canvas.getContext('2d');

                // Background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, stripWidth, totalHeight);

                // Add subtle shadow effect around edges
                const gradient = ctx.createLinearGradient(0, 0, stripWidth, stripWidth);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
                gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, stripWidth, totalHeight);

                // Draw header
                ctx.fillStyle = '#1a1a1a';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('KLARO', stripWidth / 2, 45);

                // Draw photos
                let yPosition = 70;
                const photoWidth = stripWidth - (borderWidth * 2);

                for (let i = 0; i < 4; i++) {
                    const photoCanvas = photoCanvases[i];
                    
                    // Draw black border for each photo
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(borderWidth - 2, yPosition - 2, photoWidth + 4, photoHeight + 4);
                    
                    // Draw white border
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(borderWidth - 1, yPosition - 1, photoWidth + 2, photoHeight + 2);
                    
                    // Draw photo
                    ctx.drawImage(photoCanvas, borderWidth, yPosition, photoWidth, photoHeight);
                    
                    yPosition += photoHeight + spacing;
                }

                // Draw footer with date and time
                const now = new Date();
                const dateString = now.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                const timeString = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                ctx.fillStyle = '#666666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(dateString + ' • ' + timeString, stripWidth / 2, totalHeight - 15);

                // Return as base64
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Resize canvas image to a specific size
     */
    resizeCanvas(canvas, width, height) {
        const resized = document.createElement('canvas');
        resized.width = width;
        resized.height = height;
        const ctx = resized.getContext('2d');
        ctx.drawImage(canvas, 0, 0, width, height);
        return resized;
    },

    /**
     * Draw image from canvas to another canvas at specified dimensions
     */
    drawImageToCanvas(sourceCanvas, targetCanvas, x, y, width, height) {
        const ctx = targetCanvas.getContext('2d');
        ctx.drawImage(sourceCanvas, x, y, width, height);
    }
};

/**
 * Utility Functions
 */
const Utils = {
    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Format date/time for display
     */
    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    /**
     * Download canvas as image
     */
    downloadCanvasAsImage(canvas, filename) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename || 'klaro-photobooth.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Download URL as file
     */
    downloadFromUrl(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'klaro-photobooth.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Convert data URL to blob
     */
    dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }
        return new Blob([u8arr], { type: mime });
    },

    /**
     * Check browser support for required APIs
     */
    checkBrowserSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            canvas: !!document.createElement('canvas').getContext,
            localStorage: !!window.localStorage
        };
        return support;
    },

    /**
     * Request permissions for camera access
     */
    async requestCameraAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            return stream;
        } catch (err) {
            console.error('Camera access error:', err);
            
            // Provide specific error messages
            if (err.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                throw new Error('No camera device found. Please check your camera hardware.');
            } else if (err.name === 'NotReadableError') {
                throw new Error('Camera is in use by another application. Please close other camera apps.');
            } else if (err.name === 'SecurityError') {
                throw new Error('Camera access requires HTTPS connection. Try opening in a different browser.');
            } else {
                throw new Error('Camera access error: ' + err.message);
            }
        }
    }
};

/**
 * Export for use in other scripts
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StorageManager,
        QRCodeGenerator,
        ImageProcessor,
        Utils
    };
}
