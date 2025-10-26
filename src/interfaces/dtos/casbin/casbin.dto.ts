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
  domainId: string;
}

export class RemoveRoleDto {
  user: string;
  role: string;
}

export class RemoveRoleInDomainDto {
  user: string;
  role: string;
  domainId: string;
}

export class CheckPermissionDto {
  subject: string;
  object: string;
  action: string;
}

export class CheckPermissionWithDomainDto {
  subject: string;
  domainType: string;
  domainId: string;
  object: string;
  action: string;
}
