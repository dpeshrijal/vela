export class VelaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VelaError";
  }
}
