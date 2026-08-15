export class WorkerError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "WorkerError";
    this.code = code;
    this.status = status;
  }
}
