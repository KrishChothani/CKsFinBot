/** @format */

/**
 * Abstract Base Class for Storage Providers.
 */
export class StorageProvider {
  constructor(name) {
    if (new.target === StorageProvider) {
      throw new TypeError("Cannot construct StorageProvider instances directly.");
    }
    this.name = name;
  }

  isAvailable() {
    throw new Error("Method 'isAvailable()' must be implemented.");
  }

  async upload(file) {
    throw new Error("Method 'upload(file)' must be implemented.");
  }

  async delete(key) {
    throw new Error("Method 'delete(key)' must be implemented.");
  }
}

