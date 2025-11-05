import { Injectable, Logger } from "@nestjs/common";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { PtypeEnum } from "@/common/constants/roles";
import {
  AddPolicyDto,
  RemovePolicyDto,
  AddPolicy2Dto,
  RemovePolicy2Dto,
  AddRoleDto,
  RemoveRoleDto,
  AddRoleInDomainDto,
  RemoveRoleInDomainDto,
  CheckPermissionDto,
  CheckPermissionWithDomainDto,
  GetPoliciesCasbinFilter,
} from "@/interfaces/dtos/casbin/casbin.dto";
import { ApiResponse } from "@/interfaces/dtos";
import { PaginatedResult } from "@/common/types/api";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";

@Injectable()
export class CasbinUseCases {
  private readonly logger = new Logger(CasbinUseCases.name);

  constructor(private readonly casbinService: CasbinService) {}

  // Basic Policy Management
  async addPolicy(addPolicyDto: AddPolicyDto): Promise<ApiResponse<void>> {
    const { subject, object, action, effect = "allow" } = addPolicyDto;
    const result = await this.casbinService.addPolicy(
      PtypeEnum.BASIC,
      subject,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to add policy",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Policy added successfully",
    };
  }

  async removePolicy(
    removePolicyDto: RemovePolicyDto,
  ): Promise<ApiResponse<void>> {
    const { subject, object, action, effect = "allow" } = removePolicyDto;
    const result = await this.casbinService.removePolicy(
      PtypeEnum.BASIC,
      subject,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();

    if (result === false) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to remove policy",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Policy removed successfully",
    };
  }

  // Domain-based Policy Management
  async addPolicy2(addPolicy2Dto: AddPolicy2Dto): Promise<ApiResponse<void>> {
    const {
      subject,
      domainType,
      object,
      action,
      effect = "allow",
    } = addPolicy2Dto;
    const result = await this.casbinService.addPolicy2(
      PtypeEnum.DOMAIN,
      subject,
      domainType,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to add domain-based policy",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Domain-based policy added successfully",
    };
  }

  async removePolicy2(
    removePolicy2Dto: RemovePolicy2Dto,
  ): Promise<ApiResponse<void>> {
    const {
      subject,
      domainType,
      object,
      action,
      effect = "allow",
    } = removePolicy2Dto;
    const result = await this.casbinService.removePolicy2(
      PtypeEnum.DOMAIN,
      subject,
      domainType,
      object,
      action,
      effect,
    );
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to remove domain-based policy",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Domain-based policy removed successfully",
    };
  }

  // Basic Role Management
  async addRoleForUser(addRoleDto: AddRoleDto): Promise<ApiResponse<void>> {
    const { user, role } = addRoleDto;
    const result = await this.casbinService.addRoleForUser(user, role);
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to assign role",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Role assigned successfully",
    };
  }

  async removeRoleForUser(
    removeRoleDto: RemoveRoleDto,
  ): Promise<ApiResponse<void>> {
    const { user, role } = removeRoleDto;
    const result = await this.casbinService.deleteRoleForUser(user, role);
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to remove role",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Role removed successfully",
    };
  }

  // Domain-based Role Management
  async addRoleForUserInDomain(
    addRoleInDomainDto: AddRoleInDomainDto,
  ): Promise<ApiResponse<void>> {
    const { user, role, domainId } = addRoleInDomainDto;
    const result = await this.casbinService.addRoleForUserInDomain(
      user,
      role,
      domainId,
    );
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to assign domain-based role",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Domain-based role assigned successfully",
    };
  }

  async removeRoleForUserInDomain(
    removeRoleInDomainDto: RemoveRoleInDomainDto,
  ): Promise<ApiResponse<void>> {
    const { user, role, domainId } = removeRoleInDomainDto;
    const result = await this.casbinService.deleteRoleForUserInDomain(
      user,
      role,
      domainId,
    );
    await this.casbinService.savePolicy();

    if (!result) {
      return {
        code: RESPONSE_CODE.SERVER_ERROR,
        message: "Failed to remove domain-based role",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Domain-based role removed successfully",
    };
  }

  // Query Methods
  async getAllPolicies(
    query: GetPoliciesCasbinFilter,
  ): Promise<ApiResponse<string[][]>> {
    const policies = await this.casbinService.getAllPolicies(query);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: policies,
    };
  }

  async getPoliciesPaginated(
    query: GetPoliciesCasbinFilter,
  ): Promise<ApiResponse<PaginatedResult<string[]>>> {
    const result = await this.casbinService.getPoliciesPaginated(query);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getAllRoles(): Promise<ApiResponse<string[][]>> {
    const roles = await this.casbinService.getAllRoles();
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: roles,
    };
  }

  async getRolesForUser(
    userId: string,
  ): Promise<ApiResponse<{ roles: string[]; userId: string }>> {
    const roles = await this.casbinService.getRolesForUser(userId);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        roles,
        userId,
      },
    };
  }

  async getRolesForUserInDomain(
    userId: string,
    domain: string,
  ): Promise<ApiResponse<{ roles: string[]; userId: string; domain: string }>> {
    const roles = await this.casbinService.getRolesForUserInDomain(
      userId,
      domain,
    );
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        roles,
        userId,
        domain,
      },
    };
  }

  // Permission Check Methods
  async checkPermission(
    checkPermissionDto: CheckPermissionDto,
  ): Promise<ApiResponse<{ allowed: boolean }>> {
    const { subject, object, action } = checkPermissionDto;
    const allowed = await this.casbinService
      .getEnforcer()
      .enforce(subject, object, action);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { allowed },
    };
  }

  async checkPermissionWithDomain(
    checkPermissionWithDomainDto: CheckPermissionWithDomainDto,
  ): Promise<ApiResponse<{ allowed: boolean }>> {
    const { subject, domainType, domainId, object, action } =
      checkPermissionWithDomainDto;
    const allowed = await this.casbinService.canWithDomain(
      subject,
      domainType,
      domainId,
      object,
      action,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { allowed },
    };
  }

  // Utility Methods
  async reloadPolicies(): Promise<ApiResponse<void>> {
    await this.casbinService.loadPolicy();
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Policies reloaded successfully",
    };
  }
}
