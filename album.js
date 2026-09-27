/**
 * KLARO Photobooth - Album Page Script
 */

class AlbumApp {
    constructor() {
        this.sessions = [];
        this.filteredSessions = [];
        this.sortDescending = true;
        this.previewingSession = null;

        this.initializeElements();
        this.setupEventListeners();
        this.loadSessions();
        this.renderGallery();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.gallery = document.getElementById('albumGallery');
        this.emptyState = document.getElementById('emptyState');
        this.searchInput = document.getElementById('searchInput');
        this.sortBtn = document.getElementById('sortBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.previewModal = document.getElementById('previewModal');
        this.previewImage = document.getElementById('previewImage');
        this.previewDate = document.getElementById('previewDate');
        this.previewDownloadBtn = document.getElementById('previewDownloadBtn');
        this.previewDeleteBtn = document.getElementById('previewDeleteBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        this.sortBtn.addEventListener('click', () => this.toggleSort());
        this.clearBtn.addEventListener('click', () => this.clearAllSessions());
        this.closeModalBtn.addEventListener('click', () => this.closePreview());
        this.previewDownloadBtn.addEventListener('click', () => this.downloadPreview());
        this.previewDeleteBtn.addEventListener('click', () => this.deletePreview());

        // Close modal on background click
        this.previewModal.addEventListener('click', (e) => {
            if (e.target === this.previewModal) {
                this.closePreview();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePreview();
            }
        });
    }

    /**
     * Load sessions from storage
     */
    loadSessions() {
        this.sessions = StorageManager.getAllSessions();
        this.filteredSessions = [...this.sessions];
        this.sortSessions();
    }

    /**
     * Sort sessions by timestamp
     */
    sortSessions() {
        this.filteredSessions.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return this.sortDescending ? dateB - dateA : dateA - dateB;
        });
    }

    /**
     * Toggle sort order
     */
    toggleSort() {
        this.sortDescending = !this.sortDescending;
        this.sortBtn.textContent = `SORT: ${this.sortDescending ? 'NEWEST' : 'OLDEST'} FIRST`;
        this.sortSessions();
        this.renderGallery();
    }

    /**
     * Handle search filter
     */
    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredSessions = [...this.sessions];
        } else {
            this.filteredSessions = this.sessions.filter(session => {
                const date = new Date(session.timestamp);
                const dateStr = date.toLocaleDateString('en-US');
                return dateStr.includes(searchTerm);
            });
        }

        this.sortSessions();
        this.renderGallery();
    }

    /**
     * Render gallery
     */
    renderGallery() {
        this.gallery.innerHTML = '';

        if (this.filteredSessions.length === 0) {
            this.emptyState.classList.remove('hidden');
            return;
        }

        this.emptyState.classList.add('hidden');

        this.filteredSessions.forEach(session => {
            const item = this.createGalleryItem(session);
            this.gallery.appendChild(item);
        });
    }

    /**
     * Create gallery item element
     */
    createGalleryItem(session) {
        const div = document.createElement('div');
        div.className = 'gallery-item';

        const date = new Date(session.timestamp);
        const dateStr = date.toLocaleDateString('en-US');
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <img src="${session.filmImage}" alt="Film strip" class="gallery-item-image">
            <div class="gallery-item-info">
                <div class="gallery-item-date">${dateStr}</div>
                <div class="gallery-item-time">${timeStr}</div>
                <div class="gallery-item-actions">
                    <button class="gallery-action-btn download" data-id="${session.id}">Download</button>
                    <button class="gallery-action-btn delete" data-id="${session.id}">Delete</button>
                </div>
            </div>
        `;

        // Click on image to preview
        const img = div.querySelector('.gallery-item-image');
        img.addEventListener('click', () => this.openPreview(session));

        // Download button
        const downloadBtn = div.querySelector('.gallery-action-btn.download');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.downloadSession(session);
        });

        // Delete button
        const deleteBtn = div.querySelector('.gallery-action-btn.delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSession(session.id);
        });

        return div;
    }

    /**
     * Open preview modal
     */
    openPreview(session) {
        this.previewingSession = session;
        const date = new Date(session.timestamp);
        const dateStr = Utils.formatDateTime(date);

        this.previewImage.src = session.filmImage;
        this.previewDate.textContent = dateStr;
        this.previewModal.classList.remove('hidden');
    }

    /**
     * Close preview modal
     */
    closePreview() {
        this.previewModal.classList.add('hidden');
        this.previewingSession = null;
    }

    /**
     * Download preview
     */
    downloadPreview() {
        if (this.previewingSession) {
            this.downloadSession(this.previewingSession);
        }
    }

    /**
     * Download session film
     */
    downloadSession(session) {
        const date = new Date(session.timestamp);
        const filename = `klaro-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.png`;
        Utils.downloadFromUrl(session.filmImage, filename);
    }

    /**
     * Delete preview
     */
    deletePreview() {
        if (this.previewingSession) {
            this.deleteSession(this.previewingSession.id);
            this.closePreview();
        }
    }

    /**
     * Delete session
     */
    deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this session?')) {
            StorageManager.deleteSession(sessionId);
            this.loadSessions();
            this.renderGallery();
        }
    }

    /**
     * Clear all sessions
     */
    clearAllSessions() {
        if (confirm('Are you sure you want to delete ALL sessions? This cannot be undone.')) {
            StorageManager.clearAll();
            this.loadSessions();
            this.renderGallery();
        }
    }
}

/**
 * Initialize album app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 KLARO Album Initializing...');
    window.album = new AlbumApp();
    console.log('✓ KLARO Album Ready');
});
