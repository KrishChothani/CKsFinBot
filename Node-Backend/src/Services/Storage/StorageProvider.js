/** @format */

/**
 * StorageProvider (Interface / Abstract Base Class)
 * Defines the contract that every concrete storage strategy must implement.
 */
export class StorageProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if this provider has valid configuration / credentials.
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error("Method 'isAvailable()' must be implemented.");
  }

  /**
   * Uploads a file to the storage provider.
   * @param {Object} file - Multer file object ({ path, originalname, mimetype, size })
   * @returns {Promise<{ url: string, key: string, provider: string }>}
   */
  async upload(file) {
    throw new Error("Method 'upload(file)' must be implemented.");
  }

  /**
   * Deletes a file from the storage provider.
   * @param {string} keyOrUrl
   * @returns {Promise<boolean>}
   */
  async delete(keyOrUrl) {
    throw new Error("Method 'delete(keyOrUrl)' must be implemented.");
  }
}

