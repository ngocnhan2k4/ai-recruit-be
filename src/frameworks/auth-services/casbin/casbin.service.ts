import { Injectable, Inject } from "@nestjs/common";
import { Enforcer } from "casbin";
import { RoleEnum } from "@/common/constants/roles";

@Injectable()
export class CasbinService {
  constructor(@Inject("CASBIN_ENFORCER") private readonly enforcer: Enforcer) {}

  getEnforcer(): Enforcer {
    return this.enforcer;
  }

  async can(roles: RoleEnum[], obj: string, act: string): Promise<boolean> {
    for (const role of roles) {
      const allowed = await this.enforcer.enforce(role, obj, act);
      if (allowed) {
        return true;
      }
    }
    return false;
  }

  // Policy management methods for ptype "p" (basic policies)
  async addPolicy(
    subject: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.addPolicy(subject, object, action, effect);
      return true;
    } catch (error) {
      console.error("Failed to add policy:", error);
      return false;
    }
  }

  async removePolicy(
    subject: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.removePolicy(subject, object, action, effect);
      return true;
    } catch (error) {
      console.error("Failed to remove policy:", error);
      return false;
    }
  }

  // Policy management methods for ptype "p2" (domain-based policies)
  async addPolicy2(
    subject: string,
    domainType: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.addPolicy(
        subject,
        domainType,
        object,
        action,
        effect,
      );
      return true;
    } catch (error) {
      console.error("Failed to add policy2:", error);
      return false;
    }
  }

  async removePolicy2(
    subject: string,
    domainType: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.removePolicy(
        subject,
        domainType,
        object,
        action,
        effect,
      );
      return true;
    } catch (error) {
      console.error("Failed to remove policy2:", error);
      return false;
    }
  }

  // Role management methods for ptype "g" (basic role assignments)
  async addRoleForUser(user: string, role: string): Promise<boolean> {
    try {
      await this.enforcer.addRoleForUser(user, role);
      return true;
    } catch (error) {
      console.error("Failed to add role for user:", error);
      return false;
    }
  }

  async deleteRoleForUser(user: string, role: string): Promise<boolean> {
    try {
      await this.enforcer.deleteRoleForUser(user, role);
      return true;
    } catch (error) {
      console.error("Failed to delete role for user:", error);
      return false;
    }
  }

  // Role management methods for ptype "g2" (domain-based role assignments)
  async addRoleForUserInDomain(
    user: string,
    role: string,
    domain: string,
  ): Promise<boolean> {
    try {
      await this.enforcer.addGroupingPolicy(user, role, domain);
      return true;
    } catch (error) {
      console.error("Failed to add role for user in domain:", error);
      return false;
    }
  }

  async deleteRoleForUserInDomain(
    user: string,
    role: string,
    domain: string,
  ): Promise<boolean> {
    try {
      await this.enforcer.removeGroupingPolicy(user, role, domain);
      return true;
    } catch (error) {
      console.error("Failed to delete role for user in domain:", error);
      return false;
    }
  }

  async getRolesForUser(user: string): Promise<string[]> {
    return await this.enforcer.getRolesForUser(user);
  }

  async getUsersForRole(role: string): Promise<string[]> {
    return await this.enforcer.getUsersForRole(role);
  }

  async getRolesForUserInDomain(
    user: string,
    domain: string,
  ): Promise<string[]> {
    return await this.enforcer.getRolesForUserInDomain(user, domain);
  }

  async getUsersForRoleInDomain(
    role: string,
    domain: string,
  ): Promise<string[]> {
    return await this.enforcer.getUsersForRoleInDomain(role, domain);
  }

  async getAllPolicies(): Promise<string[][]> {
    return await this.enforcer.getPolicy();
  }

  async getAllRoles(): Promise<string[][]> {
    return await this.enforcer.getGroupingPolicy();
  }

  async savePolicy(): Promise<void> {
    await this.enforcer.savePolicy();
  }

  async loadPolicy(): Promise<void> {
    await this.enforcer.loadPolicy();
  }

  // Helper method to check permissions with domain support
  async canWithDomain(
    user: string,
    domain: string,
    object: string,
    action: string,
  ): Promise<boolean> {
    return await this.enforcer.enforce(user, domain, object, action);
  }

  // Additional utility methods
  clearAllPolicies(): void {
    this.enforcer.clearPolicy();
  }

  async hasPolicy(ptype: string, rule: string[]): Promise<boolean> {
    return await this.enforcer.hasPolicy(...rule);
  }
}
