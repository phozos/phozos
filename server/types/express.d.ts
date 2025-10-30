declare global {
  namespace Express {
    interface Request {
      user?: import("@shared/schema").User;
      clientIp?: string;
    }
  }
}

export {}; // Make it a module