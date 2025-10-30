import { userRepository } from "./repositories";
import * as bcrypt from "bcrypt";

export async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const adminEmail = "admin@phozos.com";
    const existingAdmin = await userRepository.findByEmail(adminEmail);
    
    if (existingAdmin) {
      console.log("Admin user already exists");
      return existingAdmin;
    }

    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || "Phozos2025!";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await userRepository.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      firstName: "Phozos",
      lastName: "Administrator",
      userType: "team_member",
      teamRole: "admin",
      accountStatus: 'active'
    });

    console.log("Default admin user created:");
    console.log("Email:", adminEmail);
    console.log("Please check the temporary password and change it after first login!");

    return admin;
  } catch (error) {
    console.error("Error creating default admin:", error);
    throw error;
  }
}