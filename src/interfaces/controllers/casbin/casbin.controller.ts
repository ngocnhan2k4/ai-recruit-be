import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { CasbinGuard } from "@/frameworks/auth-services/guards/casbin.guard";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";

// DTOs for API requests
export class AddPolicyDto {
  subject: string;
  object: string;
  action: string;
  effect?: string = "allow";
}

export class AddPolicy2Dto {
  subject: string;
  domainType: string;
  object: string;
  action: string;
  effect?: string = "allow";
}

export class RemovePolicyDto {
  subject: string;
  object: string;
  action: string;
  effect?: string = "allow";
}

export class RemovePolicy2Dto {
  subject: string;
  domainType: string;
  object: string;
  action: string;
  effect?: string = "allow";
}

export class AddRoleDto {
  user: string;
  role: string;
}

export class AddRoleInDomainDto {
  user: string;
  role: string;
  domain: string;
}

export class RemoveRoleDto {
  user: string;
  role: string;
}

export class RemoveRoleInDomainDto {
  user: string;
  role: string;
  domain: string;
}

export class CheckPermissionDto {
  subject: string;
  object: string;
  action: string;
}

export class CheckPermissionWithDomainDto {
  subject: string;
  domain: string;
  object: string;
  action: string;
}

@ApiTags("Casbin Authorization")
@ApiBearerAuth()
@Controller("admin/casbin")
@UseGuards(JwtAuthGuard, CasbinGuard)
export class CasbinController {
  constructor(private readonly casbinService: CasbinService) {}

  // Basic Policy Management (ptype "p")
  @Post("policy")
  @ApiOperation({
    summary: "Add a basic policy (ptype p)",
    description:
      "Create a basic authorization policy: subject can perform action on object",
  })
  @ApiBody({
    description: "Basic policy definition",
    examples: {
      "admin-all-access": {
        summary: "Admin has all access",
        description: "ADMIN can perform all actions on all objects",
        value: {
          subject: "ADMIN",
          object: "*",
          action: "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
          effect: "allow",
        },
      },
      "user-profile-update": {
        summary: "User can update profile",
        description: "USER can update profile resources",
        value: {
          subject: "USER",
          object: "profile",
          action: "PUT",
          effect: "allow",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Policy added successfully",
    examples: {
      success: {
        summary: "Policy added successfully",
        value: {
          success: true,
          message: "Policy added successfully",
        },
      },
    },
  })
  // @CasbinPermission("casbin", "POST")
  async addPolicy(@Body() addPolicyDto: AddPolicyDto) {
    const { subject, object, action, effect } = addPolicyDto;
    const result = await this.casbinService.addPolicy(
      subject,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result ? "Policy added successfully" : "Failed to add policy",
    };
  }

  @Delete("policy")
  @ApiOperation({
    summary: "Remove a basic policy (ptype p)",
    description: "Delete a basic authorization policy",
  })
  @ApiBody({
    description: "Basic policy to remove",
    examples: {
      "remove-admin-policy": {
        summary: "Remove admin policy",
        value: {
          subject: "ADMIN",
          object: "*",
          action: "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
          effect: "allow",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Policy removed successfully",
  })
  @CasbinPermission("casbin", "DELETE")
  async removePolicy(@Body() removePolicyDto: RemovePolicyDto) {
    const { subject, object, action, effect } = removePolicyDto;
    const result = await this.casbinService.removePolicy(
      subject,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result
        ? "Policy removed successfully"
        : "Failed to remove policy",
    };
  }

  // Domain-based Policy Management (ptype "p2")
  @Post("policy2")
  @ApiOperation({
    summary: "Add a domain-based policy (ptype p2)",
    description:
      "Create a domain-based authorization policy: subject can perform action on object in domain",
  })
  @ApiBody({
    description: "Domain-based policy definition",
    examples: {
      "admin-org-access": {
        summary: "Admin has organization access",
        description:
          "ADMIN can perform all actions on all objects in any organization",
        value: {
          subject: "ADMIN",
          domainType: "*",
          object: "*",
          action: "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)",
          effect: "allow",
        },
      },
      "org-owner-access": {
        summary: "Organization owner access",
        description: "ORGANIZATION_OWNER can manage their organization",
        value: {
          subject: "ORGANIZATION_OWNER",
          domainType: "org",
          object: "organization",
          action: "(GET)|(PUT)|(PATCH)",
          effect: "allow",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Domain-based policy added successfully",
  })
  @CasbinPermission("casbin", "POST")
  async addPolicy2(@Body() addPolicy2Dto: AddPolicy2Dto) {
    const { subject, domainType, object, action, effect } = addPolicy2Dto;
    const result = await this.casbinService.addPolicy2(
      subject,
      domainType,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result
        ? "Domain-based policy added successfully"
        : "Failed to add domain-based policy",
    };
  }

  @Delete("policy2")
  @ApiOperation({
    summary: "Remove a domain-based policy (ptype p2)",
    description: "Delete a domain-based authorization policy",
  })
  @ApiBody({
    description: "Domain-based policy to remove",
    examples: {
      "remove-org-policy": {
        summary: "Remove organization policy",
        value: {
          subject: "ORGANIZATION_OWNER",
          domainType: "org",
          object: "organization",
          action: "(GET)|(PUT)|(PATCH)",
          effect: "allow",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Domain-based policy removed successfully",
  })
  @CasbinPermission("casbin", "DELETE")
  async removePolicy2(@Body() removePolicy2Dto: RemovePolicy2Dto) {
    const { subject, domainType, object, action, effect } = removePolicy2Dto;
    const result = await this.casbinService.removePolicy2(
      subject,
      domainType,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result
        ? "Domain-based policy removed successfully"
        : "Failed to remove domain-based policy",
    };
  }

  // Basic Role Management (ptype "g")
  @Post("role")
  @ApiOperation({
    summary: "Assign role to user (ptype g)",
    description: "Assign a basic role to a user",
  })
  @ApiBody({
    description: "Basic role assignment",
    examples: {
      "assign-user-role": {
        summary: "Assign USER role",
        description: "Give USER role to a specific user",
        value: {
          user: "0028QiZXRGRl0dcQHUM35et60aq2",
          role: "USER",
        },
      },
      "assign-admin-role": {
        summary: "Assign ADMIN role",
        description: "Give ADMIN role to a specific user",
        value: {
          user: "0028QiZXRGRl0dcQHUM35et60aq2",
          role: "ADMIN",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Role assigned successfully",
  })
  @CasbinPermission("casbin", "POST")
  async addRoleForUser(@Body() addRoleDto: AddRoleDto) {
    const { user, role } = addRoleDto;
    const result = await this.casbinService.addRoleForUser(user, role);
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result ? "Role assigned successfully" : "Failed to assign role",
    };
  }

  @Delete("role")
  @ApiOperation({
    summary: "Remove role from user (ptype g)",
    description: "Remove a basic role from a user",
  })
  @ApiBody({
    description: "Basic role removal",
    examples: {
      "remove-user-role": {
        summary: "Remove USER role",
        value: {
          user: "0028QiZXRGRl0dcQHUM35et60aq2",
          role: "USER",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Role removed successfully",
  })
  @CasbinPermission("casbin", "DELETE")
  async removeRoleForUser(@Body() removeRoleDto: RemoveRoleDto) {
    const { user, role } = removeRoleDto;
    const result = await this.casbinService.deleteRoleForUser(user, role);
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result ? "Role removed successfully" : "Failed to remove role",
    };
  }

  // Domain-based Role Management (ptype "g2")
  @Post("role-domain")
  @ApiOperation({
    summary: "Assign role to user in domain (ptype g2)",
    description:
      "Assign a role to a user within a specific domain/organization",
  })
  @ApiBody({
    description: "Domain-based role assignment",
    examples: {
      "assign-org-owner": {
        summary: "Assign organization owner role",
        description:
          "Give ORGANIZATION_OWNER role to user in specific organization",
        value: {
          user: "04iT59Ryz0v8eD54Omir5JNjCcdq",
          role: "ORGANIZATION_OWNER",
          domain: "68512664fb59bbeddef04047",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Domain-based role assigned successfully",
  })
  @CasbinPermission("casbin", "POST")
  async addRoleForUserInDomain(@Body() addRoleInDomainDto: AddRoleInDomainDto) {
    const { user, role, domain } = addRoleInDomainDto;
    const result = await this.casbinService.addRoleForUserInDomain(
      user,
      role,
      domain,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result
        ? "Domain-based role assigned successfully"
        : "Failed to assign domain-based role",
    };
  }

  @Delete("role-domain")
  @ApiOperation({
    summary: "Remove role from user in domain (ptype g2)",
    description:
      "Remove a role from a user within a specific domain/organization",
  })
  @ApiBody({
    description: "Domain-based role removal",
    examples: {
      "remove-org-owner": {
        summary: "Remove organization owner role",
        value: {
          user: "04iT59Ryz0v8eD54Omir5JNjCcdq",
          role: "ORGANIZATION_OWNER",
          domain: "68512664fb59bbeddef04047",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Domain-based role removed successfully",
  })
  @CasbinPermission("casbin", "DELETE")
  async removeRoleForUserInDomain(
    @Body() removeRoleInDomainDto: RemoveRoleInDomainDto,
  ) {
    const { user, role, domain } = removeRoleInDomainDto;
    const result = await this.casbinService.deleteRoleForUserInDomain(
      user,
      role,
      domain,
    );
    await this.casbinService.savePolicy();
    return {
      success: result,
      message: result
        ? "Domain-based role removed successfully"
        : "Failed to remove domain-based role",
    };
  }

  // Query endpoints
  @Get("policies")
  @ApiOperation({
    summary: "Get all policies",
    description: "Retrieve all authorization policies from the system",
  })
  @ApiResponse({
    status: 200,
    description: "Policies retrieved successfully",
    examples: {
      "policies-list": {
        summary: "List of all policies",
        value: {
          success: true,
          data: [
            ["ADMIN", "*", "(GET)|(POST)|(PUT)|(PATCH)|(DELETE)", "allow"],
            ["USER", "profile", "PUT", "allow"],
          ],
          count: 2,
        },
      },
    },
  })
  @CasbinPermission("casbin", "GET")
  async getAllPolicies() {
    const policies = await this.casbinService.getAllPolicies();
    return {
      success: true,
      data: policies,
      count: policies.length,
    };
  }

  @Get("roles")
  @ApiOperation({
    summary: "Get all role assignments",
    description: "Retrieve all role assignments from the system",
  })
  @ApiResponse({
    status: 200,
    description: "Role assignments retrieved successfully",
    examples: {
      "role-assignments": {
        summary: "All role assignments",
        value: {
          success: true,
          data: [
            ["0028QiZXRGRl0dcQHUM35et60aq2", "USER"],
            [
              "04iT59Ryz0v8eD54Omir5JNjCcdq",
              "ORGANIZATION_OWNER",
              "68512664fb59bbeddef04047",
            ],
          ],
          count: 2,
        },
      },
    },
  })
  @CasbinPermission("casbin", "GET")
  async getAllRoles() {
    const roles = await this.casbinService.getAllRoles();
    return {
      success: true,
      data: roles,
      count: roles.length,
    };
  }

  @Get("user/:userId/roles")
  @ApiOperation({
    summary: "Get roles for a specific user",
    description: "Retrieve all roles assigned to a specific user",
  })
  @ApiParam({
    name: "userId",
    description: "User ID to get roles for",
    example: "0028QiZXRGRl0dcQHUM35et60aq2",
  })
  @ApiResponse({
    status: 200,
    description: "User roles retrieved successfully",
    examples: {
      "user-roles": {
        summary: "User roles",
        value: {
          success: true,
          data: ["USER"],
          userId: "0028QiZXRGRl0dcQHUM35et60aq2",
        },
      },
    },
  })
  @CasbinPermission("casbin", "GET")
  async getRolesForUser(@Param("userId") userId: string) {
    const roles = await this.casbinService.getRolesForUser(userId);
    return {
      success: true,
      data: roles,
      userId,
    };
  }

  @Get("user/:userId/domain/:domain/roles")
  @ApiOperation({
    summary: "Get roles for a specific user in domain",
    description:
      "Retrieve all roles assigned to a specific user within a domain",
  })
  @ApiParam({
    name: "userId",
    description: "User ID to get roles for",
    example: "04iT59Ryz0v8eD54Omir5JNjCcdq",
  })
  @ApiParam({
    name: "domain",
    description: "Domain ID to get roles for",
    example: "68512664fb59bbeddef04047",
  })
  @ApiResponse({
    status: 200,
    description: "User domain roles retrieved successfully",
    examples: {
      "user-domain-roles": {
        summary: "User domain roles",
        value: {
          success: true,
          data: ["ORGANIZATION_OWNER"],
          userId: "04iT59Ryz0v8eD54Omir5JNjCcdq",
          domain: "68512664fb59bbeddef04047",
        },
      },
    },
  })
  @CasbinPermission("casbin", "GET")
  async getRolesForUserInDomain(
    @Param("userId") userId: string,
    @Param("domain") domain: string,
  ) {
    const roles = await this.casbinService.getRolesForUserInDomain(
      userId,
      domain,
    );
    return {
      success: true,
      data: roles,
      userId,
      domain,
    };
  }

  @Post("check")
  @ApiOperation({
    summary: "Check if a subject has permission",
    description:
      "Verify if a specific subject has permission to perform an action on an object",
  })
  @ApiBody({
    description: "Permission check request",
    examples: {
      "check-admin-access": {
        summary: "Check admin access",
        description: "Check if ADMIN can access all resources",
        value: {
          subject: "ADMIN",
          object: "*",
          action: "GET",
        },
      },
      "check-user-profile": {
        summary: "Check user profile access",
        description: "Check if USER can update profile",
        value: {
          subject: "USER",
          object: "profile",
          action: "PUT",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Permission check completed",
    examples: {
      "permission-granted": {
        summary: "Permission granted",
        value: {
          success: true,
          allowed: true,
          subject: "ADMIN",
          object: "*",
          action: "GET",
        },
      },
      "permission-denied": {
        summary: "Permission denied",
        value: {
          success: true,
          allowed: false,
          subject: "USER",
          object: "admin-panel",
          action: "DELETE",
        },
      },
    },
  })
  @CasbinPermission("casbin", "POST")
  async checkPermission(@Body() checkPermissionDto: CheckPermissionDto) {
    const { subject, object, action } = checkPermissionDto;
    const allowed = await this.casbinService
      .getEnforcer()
      .enforce(subject, object, action);
    return {
      success: true,
      allowed,
      subject,
      object,
      action,
    };
  }

  @Post("check-domain")
  @ApiOperation({
    summary: "Check if a subject has permission in domain",
    description:
      "Verify if a specific subject has permission to perform an action on an object within a domain",
  })
  @ApiBody({
    description: "Domain-based permission check request",
    examples: {
      "check-org-owner": {
        summary: "Check organization owner access",
        description: "Check if ORGANIZATION_OWNER can manage organization",
        value: {
          subject: "ORGANIZATION_OWNER",
          domain: "68512664fb59bbeddef04047",
          object: "organization",
          action: "PUT",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Domain-based permission check completed",
    examples: {
      "domain-permission-granted": {
        summary: "Domain permission granted",
        value: {
          success: true,
          allowed: true,
          subject: "ORGANIZATION_OWNER",
          domain: "68512664fb59bbeddef04047",
          object: "organization",
          action: "PUT",
        },
      },
    },
  })
  @CasbinPermission("casbin", "POST")
  async checkPermissionWithDomain(
    @Body() checkPermissionWithDomainDto: CheckPermissionWithDomainDto,
  ) {
    const { subject, domain, object, action } = checkPermissionWithDomainDto;
    const allowed = await this.casbinService.canWithDomain(
      subject,
      domain,
      object,
      action,
    );
    return {
      success: true,
      allowed,
      subject,
      domain,
      object,
      action,
    };
  }

  @Post("reload")
  @ApiOperation({
    summary: "Reload policies from database",
    description:
      "Refresh the authorization policies by reloading them from the database",
  })
  @ApiResponse({
    status: 200,
    description: "Policies reloaded successfully",
    examples: {
      "reload-success": {
        summary: "Policies reloaded successfully",
        value: {
          success: true,
          message: "Policies reloaded successfully",
        },
      },
    },
  })
  @CasbinPermission("casbin", "POST")
  async reloadPolicies() {
    await this.casbinService.loadPolicy();
    return {
      success: true,
      message: "Policies reloaded successfully",
    };
  }
}
