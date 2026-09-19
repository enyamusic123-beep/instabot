const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

class QueueStore {
  constructor(file) { this.file = file; this.items = []; this.write = Promise.resolve(); }
  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    try { this.items = JSON.parse(await fs.readFile(this.file, "utf8")); } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.persist();
    }
  }
  async persist() {
    const content = JSON.stringify(this.items, null, 2);
    const temporary = `${this.file}.${process.pid}.tmp`;
    this.write = this.write.then(async () => { await fs.writeFile(temporary, content, "utf8"); await fs.rename(temporary, this.file); });
    return this.write;
  }
  all() { return this.items.slice().sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor)); }
  findByIdempotency(key) { return this.items.find((item) => item.idempotencyKey === key); }
  async add(item) { const stored = { id: crypto.randomUUID(), attempts: 0, status: "queued", ...item }; this.items.push(stored); await this.persist(); return stored; }
  async update(id, changes) { const item = this.items.find((entry) => entry.id === id); if (!item) return null; Object.assign(item, changes); await this.persist(); return item; }
}

module.exports = { QueueStore };
